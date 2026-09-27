import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sourceEmails, hasEmail } from "./email-evidence";
import {
  departments,
  matchesDirection,
  repairDirections,
  academicTitle,
} from "@/lib/research-metadata";
import { researchers } from "@/data/researchers";
import { loadCatalog, mirrorResearchers, localCatalog } from "./catalog-store";
import { db } from "./db";
import { searchCatalog } from "./catalog-search";
import { digest } from "./security";
const fixture = researchers[0];
beforeAll(() => {
  process.env.DATABASE_PATH = join(
    mkdtempSync(join(tmpdir(), "catalog-tests-")),
    "db.sqlite",
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("public email evidence", () => {
  it("decodes explicit obfuscation, entities already decoded by HTML parser, and mailto evidence", () => {
    expect(sourceEmails("yiqiao.zhong[@]wisc[DOT]edu")).toContain(
      "yiqiao.zhong@wisc.edu",
    );
    expect(sourceEmails("alex (at) wisc (dot) edu")).toContain("alex@wisc.edu");
    expect(sourceEmails("alex at wisc dot edu")).toContain("alex@wisc.edu");
    expect(
      hasEmail(
        { text: "Contact me", emails: ["alex@wisc.edu"] },
        "alex@wisc.edu",
      ),
    ).toBe(true);
  });
  it("does not join sentence punctuation or accept guessed/substring addresses", () => {
    expect(
      sourceEmails("Email alex@wisc.edu. Undergraduate inquiries welcome."),
    ).toEqual(["alex@wisc.edu"]);
    expect(hasEmail({ text: "notalex@wisc.edu" }, "alex@wisc.edu")).toBe(false);
    expect(hasEmail({ text: "Alex is at Wisconsin." }, "alex@wisc.edu")).toBe(
      false,
    );
  });
});
describe("metadata and direction normalization", () => {
  it("splits departments without splitting real compound department names", () => {
    expect(
      departments(
        "Statistics; Computer Sciences；Electrical and Computer Engineering; statistics",
      ),
    ).toEqual([
      "Statistics",
      "Computer Sciences",
      "Electrical and Computer Engineering",
    ]);
    expect(
      departments(
        "Biostatistics & Medical Informatics; Biostatistics and Medical Informatics; PhD 1987 University of Illinois",
      ),
    ).toEqual(["Biostatistics and Medical Informatics"]);
  });
  it("reconciles label/ID variation and keyword-backed topics without substring false positives", () => {
    const d = {
      id: "machine-learning",
      title: "Machine learning",
      description: "",
      question: "",
      keywords: ["machine learning"],
    };
    expect(
      matchesDirection({ ...fixture, topics: ["Machine_Learning"] }, d),
    ).toBe(true);
    expect(
      matchesDirection(
        {
          ...fixture,
          topics: [],
          summary: "Statistical machine learning",
          keywords: [],
        },
        d,
      ),
    ).toBe(true);
    expect(
      repairDirections([{ ...fixture, topics: ["Machine Learning"] }], [d])[0]
        .topics,
    ).toContain(d.id);
    expect(
      matchesDirection(
        {
          ...fixture,
          topics: [],
          title: "Paid internships",
          summary: "Paid",
          summaryZh: "",
          keywords: [],
        },
        { ...d, id: "AI", title: "AI", keywords: ["AI"] },
      ),
    ).toBe(false);
  });
  it("does not invent an academic title from research prose", () => {
    expect(
      academicTitle({
        ...fixture,
        title: "Algorithms for understanding language",
      }),
    ).toBe("");
    expect(academicTitle({ ...fixture, title: "Associate Professor" })).toBe(
      "Associate Professor",
    );
  });
});
describe("shared catalog persistence", () => {
  it("hides reconciled duplicates while preserving their reversible payloads", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json([
            { payload: { ...fixture, id: "canonical" } },
            { payload: { ...fixture, id: "alias", supersededBy: "canonical" } },
          ]),
        ),
    );
    const result = await loadCatalog();
    expect(result.records.map((r) => r.id)).toEqual(["canonical"]);
    expect(localCatalog().some((r) => r.id === "alias")).toBe(false);
    expect(
      db().prepare("SELECT id FROM researchers WHERE id='alias'").get(),
    ).toBeTruthy();
  });
  it("shares one production catalog read across simultaneous requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json([{ payload: fixture }]));
    vi.stubGlobal("fetch", fetcher);
    const [first, second] = await Promise.all([loadCatalog(), loadCatalog()]);
    expect(first.records).toEqual(second.records);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reads every page beyond the service page limit", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    const page = Array.from({ length: 500 }, (_, i) => ({
      payload: { ...fixture, id: "page-" + i },
    }));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(
        Response.json([{ payload: { ...fixture, id: "last-page" } }]),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await loadCatalog();
    expect(result.records).toHaveLength(501);
    expect(result.shared).toBe(true);
    expect(fetcher.mock.calls[1][0]).toContain("offset=500");
  });
  it("does not turn a cached database read into a fresh source check", () => {
    const date = "2020-01-01T00:00:00.000Z";
    mirrorResearchers([
      {
        ...fixture,
        id: "stale",
        sources: fixture.sources.map((s) => ({ ...s, checkedAt: date })),
      },
    ]);
    expect(
      (
        db()
          .prepare("SELECT checked_at FROM researchers WHERE id='stale'")
          .get() as { checked_at: number }
      ).checked_at,
    ).toBe(Date.parse(date));
  });
  it("retains local evidence and reports remote failures", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await loadCatalog();
    expect(result.shared).toBe(false);
    expect(result.warning).toMatch(/could not be reached/);
    expect(result.records.length).toBe(localCatalog().length);
  });
});

describe("catalog search coverage", () => {
  it("returns all matches and includes new imports even with a cached query plan", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const records = Array.from({ length: 31 }, (_, i) => ({
      ...fixture,
      id: `coverage-${i}`,
      name: `Coverage Researcher ${i}`,
      title: "Quasar interpolation",
      summary: "Quasar interpolation methods",
      summaryZh: "",
      keywords: ["quasar interpolation"],
      topics: [],
    }));
    mirrorResearchers(records);
    const query = "quasar interpolation";
    db()
      .prepare("INSERT INTO search_cache(key,payload,expires) VALUES(?,?,?)")
      .run(
        digest("catalog-plan-v4:" + query),
        JSON.stringify({
          intent: "research",
          interpretation: query,
          groups: [{ title: query, terms: [query] }],
          excluded: [],
        }),
        Date.now() + 60000,
      );
    const api = vi.fn();
    vi.stubGlobal("fetch", api);
    const result = await searchCatalog(query, () => {});
    expect(result.researchers).toHaveLength(31);
    mirrorResearchers([
      { ...records[0], id: "coverage-later", name: "Later Researcher" },
    ]);
    const again = await searchCatalog(query, () => {});
    expect(again.researchers).toHaveLength(32);
    expect(api).not.toHaveBeenCalled();
  });
});
