import { beforeEach, describe, expect, it, vi } from "vitest";
import { researchers } from "@/data/researchers";
import type { Researcher } from "@/lib/types";
import { matchesFacultyName } from "@/lib/faculty-search";
import {
  unknownOpportunity,
  type UndergraduateReview,
} from "@/lib/undergraduate";

const { loadCatalog } = vi.hoisted(() => ({ loadCatalog: vi.fn() }));
vi.mock("./catalog-store", () => ({ loadCatalog }));
const person = (
  id: string,
  name: string,
  overrides: Partial<Researcher> = {},
): Researcher => ({
  ...researchers[0],
  id,
  name,
  ...overrides,
});

beforeEach(() => {
  vi.resetModules();
  loadCatalog.mockReset();
});
function catalog(records: Researcher[]) {
  loadCatalog.mockResolvedValue({ records, shared: true, warning: "" });
}
async function listing(params: Record<string, string>) {
  const { GET } = await import("@/app/api/catalog/route");
  const response = await GET(
    new Request(`http://localhost/api/catalog?${new URLSearchParams(params)}`),
  );
  expect(response.status).toBe(200);
  return response.json();
}

describe("faculty name search and combined filters", () => {
  it("intersects mentoring, current openings and application acceptance independently", async () => {
    const review = (
      openings: "yes" | "no" | "unknown",
      applications: "yes" | "no",
    ): UndergraduateReview => ({
      version: 1,
      attemptedAt: "2026-09-27",
      checkedAt: "2026-09-27",
      status: "checked",
      discovery: "searched",
      supervision: { ...unknownOpportunity(), value: "yes" },
      openings: { ...unknownOpportunity(), value: openings },
      applications: { ...unknownOpportunity(), value: applications },
      credit: unknownOpportunity(),
      pay: unknownOpportunity(),
      applicationUrl: null,
      contactOptions: [],
      websites: [],
      attempts: [],
      limitations: [],
    });
    catalog([
      person("full", "Past Mentor", { undergraduate: review("no", "no") }),
      person("open", "Open Mentor", { undergraduate: review("yes", "yes") }),
      person("form", "Application Mentor", {
        undergraduate: review("unknown", "yes"),
      }),
      person("pending", "Pending Faculty", { undergraduate: undefined }),
    ]);
    const ids = async (params: Record<string, string>) =>
      (await listing(params)).records.map((r: Researcher) => r.id);
    expect(await ids({ supervision: "yes", openings: "no" })).toEqual(["full"]);
    expect(
      await ids({ supervision: "yes", openings: "yes", applications: "yes" }),
    ).toEqual(["open"]);
    expect(
      await ids({
        supervision: "yes",
        openings: "unknown",
        applications: "yes",
      }),
    ).toEqual(["form"]);
    expect(await ids({ supervision: "unknown", openings: "unknown" })).toEqual([
      "pending",
    ]);
  });
  it("does not return research keyword or substring matches for a person's name", async () => {
    catalog([
      person("evan", "Evan Smith"),
      person("harris", "Andrea Harris", { keywords: ["evan", "film"] }),
      person("gutierrez", "Agustin Gutierrez", {
        keywords: ["relevant fluctuations"],
      }),
      person("dept", "Alex Jones", { department: "Evan Studies" }),
    ]);
    const result = await listing({ q: "Evan" });
    expect(result.records.map((r: Researcher) => r.id)).toEqual(["evan"]);
    expect(result.total).toBe(1);
  });
  it("supports partial names, accents, reordered names and CJK names", () => {
    expect(matchesFacultyName("José García", "garcia jos")).toBe(true);
    expect(matchesFacultyName("Evan M. Smith", "smith ev")).toBe(true);
    expect(matchesFacultyName("Steven Lee", "evan")).toBe(false);
    expect(matchesFacultyName("王小明", "小明")).toBe(true);
    expect(matchesFacultyName("Evan Smith", "!!!")).toBe(false);
  });
  it("intersects name, department, availability and appointment filters", async () => {
    const coverage = {
      level: "research-index",
      category: "faculty",
      rosterKey: "fixture",
      rosterCheckedAt: "2026-09-26",
      contactChecked: true,
    } as const;
    catalog([
      person("cs", "Evan Smith", {
        department: "Statistics; Computer Sciences",
        coverage,
      }),
      person("dance", "Evan Adams", { department: "Dance", coverage }),
      person("emeritus", "Evan Brown", {
        department: "Computer Sciences",
        coverage: { ...coverage, category: "emeritus" },
      }),
      person("no-email", "Evan Davis", {
        department: "Computer Sciences",
        coverage,
        contact: { ...researchers[0].contact, email: undefined },
      }),
    ]);
    const result = await listing({
      q: "evan",
      department: "Computer Sciences",
      level: "email",
      category: "faculty",
    });
    expect(result.records.map((r: Researcher) => r.id)).toEqual(["cs"]);
    expect(result.departments).toEqual([
      "Computer Sciences",
      "Dance",
      "Statistics",
    ]);
  });
});

describe("faculty pagination", () => {
  it("jumps to the requested page and clamps invalid API page numbers", async () => {
    catalog(
      Array.from({ length: 123 }, (_, i) =>
        person(String(i), `Professor ${String(i).padStart(3, "0")}`),
      ),
    );
    const second = await listing({ page: "2" });
    expect(second.page).toBe(2);
    expect(second.total).toBe(123);
    expect(second.records).toHaveLength(50);
    expect(second.records[0].id).toBe("50");
    const last = await listing({ page: "999" });
    expect(last.page).toBe(3);
    expect(last.records).toHaveLength(23);
    for (const page of ["0", "-1", "NaN", "Infinity"]) {
      expect((await listing({ page })).page).toBe(1);
    }
  });
  it("keeps empty results on page one and keeps all department choices", async () => {
    catalog([person("one", "Evan Smith")]);
    const result = await listing({ q: "Nobody", page: "50" });
    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.records).toEqual([]);
    expect(result.departments).toContain("Computer Sciences");
  });
});
