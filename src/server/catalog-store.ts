import { db } from "./db";
import { researcherSchema } from "@/lib/contracts";
import type { Researcher } from "@/lib/types";
import { AppError } from "./http";
import { applyUndergraduateReview } from "./faculty-verification";
export const WEEK = 7 * 86400_000;
export const catalogConfigured = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function catalogREST(path: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new AppError(
      "CATALOG_CONFIG",
      "Supabase catalog is not connected.",
      503,
    );
  const res = await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok)
    throw new AppError(
      "CATALOG_UNAVAILABLE",
      "The shared catalog is unavailable. Preserved records may still be searched.",
      503,
    );
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}
export async function localCatalog(): Promise<Researcher[]> {
  return (
    (await db()
      .prepare("SELECT payload FROM researchers ORDER BY id")
      .all()) as {
      payload: string;
    }[]
  ).flatMap((row) => {
    const parsed = researcherSchema.safeParse(JSON.parse(row.payload));
    return parsed.success && !parsed.data.supersededBy ? [parsed.data] : [];
  });
}
export async function mirrorResearchers(records: Researcher[]) {
  const insert = db().prepare(
    "INSERT INTO researchers(id,payload,checked_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,checked_at=excluded.checked_at",
  );
  for (const r of records) {
    const dates = r.sources
      .map((s) => Date.parse(s.checkedAt))
      .filter(Number.isFinite);
    // Mirroring is not verification: never advance evidence dates on a database read.
    await insert.run(
      r.id,
      JSON.stringify(r),
      dates.length ? Math.min(...dates) : 0,
    );
  }
}
type CatalogSnapshot = {
  records: Researcher[];
  shared: boolean;
  warning: string;
};
let cachedSnapshot: CatalogSnapshot | undefined;
let snapshotExpires = 0;
let snapshotRequest: Promise<CatalogSnapshot> | undefined;
export async function loadCatalog(): Promise<CatalogSnapshot> {
  // Web requests share a short-lived snapshot; ingestion/audit commands and tests always read the database.
  if (process.env.NODE_ENV !== "production") return await readCatalog();
  if (cachedSnapshot && Date.now() < snapshotExpires) return cachedSnapshot;
  if (snapshotRequest) return snapshotRequest;
  snapshotRequest = readCatalog()
    .then((result) => {
      cachedSnapshot = result;
      snapshotExpires = Date.now() + 60_000;
      return result;
    })
    .finally(() => {
      snapshotRequest = undefined;
    });
  return snapshotRequest;
}
async function readCatalog(): Promise<CatalogSnapshot> {
  if (process.env.DATABASE_URL) {
    const rows = await db()
      .prepare(
        "SELECT payload::text AS payload FROM public.research_catalog ORDER BY id",
      )
      .all();
    return {
      records: rows
        .map((row) => researcherSchema.parse(JSON.parse(String(row.payload))))
        .filter((r) => !r.supersededBy),
      shared: true,
      warning: "",
    };
  }
  if (!catalogConfigured())
    return {
      records: await localCatalog(),
      shared: false,
      warning:
        "Using the server's saved public-source catalog. Supabase is not connected yet.",
    };
  try {
    const records: Researcher[] = [];
    for (let offset = 0; ; offset += 500) {
      const rows = (await catalogREST(
        "research_catalog?select=payload&order=id&limit=500&offset=" + offset,
      )) as { payload: unknown }[];
      for (const row of rows) records.push(researcherSchema.parse(row.payload));
      if (rows.length < 500) break;
    }
    await mirrorResearchers(records);
    return {
      records: records.filter((r) => !r.supersededBy),
      shared: true,
      warning: "",
    };
  } catch {
    return {
      records: await localCatalog(),
      shared: false,
      warning:
        "Supabase could not be reached. Showing the last locally preserved catalog; check source dates.",
    };
  }
}
export async function saveCatalog(records: Researcher[]) {
  cachedSnapshot = undefined;
  snapshotExpires = 0;
  records = await Promise.all(
    records.map(async (r) => {
      if (r.coverage) return r;
      const previous = (await db()
        .prepare(
          process.env.DATABASE_URL
            ? "SELECT payload::text AS payload FROM public.research_catalog WHERE id=?"
            : "SELECT payload FROM researchers WHERE id=?",
        )
        .get(r.id)) as { payload: string } | undefined;
      if (!previous) return r;
      const old = researcherSchema.parse(JSON.parse(previous.payload));
      if (!old.coverage) return r;
      const indexes = old.sources.filter(
        (s) =>
          s.url === "https://guide.wisc.edu/faculty/" ||
          s.url.startsWith("https://wisc.discovery.academicanalytics.com/"),
      );
      return {
        ...r,
        publications: old.publications,
        keywords: [...new Set([...r.keywords, ...old.keywords])],
        sources: [
          ...r.sources,
          ...indexes.filter((s) => !r.sources.some((next) => next.id === s.id)),
        ],
        coverage: {
          ...old.coverage,
          level: "profile" as const,
          profileCheckedAt: r.sources[0]?.checkedAt,
          contactChecked: !!r.contact.email,
        },
      };
    }),
  );
  // Other ingestion paths must not erase a newer opportunity review.
  const previous =
    catalogConfigured() && records.length
      ? (
          (await catalogREST(
            "research_catalog?select=payload&id=in.(" +
              records.map((r) => encodeURIComponent(r.id)).join(",") +
              ")",
          )) as { payload: Researcher }[]
        ).map((row) => row.payload)
      : await localCatalog();
  records = records.map((r) => {
    const old = previous.find((p) => p.id === r.id);
    if (
      !old?.undergraduate ||
      (r.undergraduate &&
        r.undergraduate.attemptedAt >= old.undergraduate.attemptedAt)
    )
      return r;
    return applyUndergraduateReview({
      ...r,
      undergraduate: old.undergraduate,
      sources: [
        ...r.sources,
        ...old.sources.filter((s) => !r.sources.some((n) => n.id === s.id)),
      ],
    });
  });
  await mirrorResearchers(records);
  if (!catalogConfigured() || !records.length) return;
  await catalogREST("research_catalog?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(
      records.map((r) => ({
        id: r.id,
        name: r.name,
        department: r.department,
        payload: r,
        checked_at: new Date(
          Math.min(...r.sources.map((s) => Date.parse(s.checkedAt))),
        ).toISOString(),
        refresh_error: null,
        last_attempt_at: new Date().toISOString(),
      })),
    ),
  });
}

/** Compare-and-swap protects unrelated catalog updates while a long web audit runs. */
export async function saveFacultyReview(
  reviewed: Researcher,
  original: Researcher,
) {
  if (!catalogConfigured())
    throw new Error("Cloud verification requires Supabase.");
  for (let attempt = 0; attempt < 4; attempt++) {
    const rows = (await catalogREST(
      "research_catalog?select=payload,last_attempt_at&id=eq." +
        encodeURIComponent(reviewed.id),
    )) as { payload: Researcher; last_attempt_at: string | null }[];
    const row = rows[0];
    if (!row)
      throw new Error("The professor no longer exists in the cloud catalog.");
    const current = researcherSchema.parse(row.payload);
    if (current.supersededBy) return;
    if (
      current.undergraduate &&
      reviewed.undergraduate &&
      current.undergraduate.attemptedAt > reviewed.undergraduate.attemptedAt
    )
      return;
    const changed: Partial<Researcher> = {};
    for (const key of [
      "title",
      "summary",
      "summaryZh",
      "academicTitle",
      "keywords",
    ] as const) {
      if (JSON.stringify(reviewed[key]) !== JSON.stringify(original[key]))
        Object.assign(changed, { [key]: reviewed[key] });
    }
    const merged = applyUndergraduateReview({
      ...current,
      ...changed,
      undergraduate: reviewed.undergraduate,
      sources: [
        ...reviewed.sources,
        ...current.sources.filter(
          (s) => !reviewed.sources.some((n) => n.id === s.id),
        ),
      ],
    });
    const condition = row.last_attempt_at
      ? "eq." + encodeURIComponent(row.last_attempt_at)
      : "is.null";
    const result = (await catalogREST(
      "research_catalog?id=eq." +
        encodeURIComponent(reviewed.id) +
        "&last_attempt_at=" +
        condition,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          payload: merged,
          last_attempt_at: new Date().toISOString(),
          refresh_error:
            merged.undergraduate?.status === "failed"
              ? "Undergraduate review incomplete; see payload.undergraduate.attempts"
              : null,
        }),
      },
    )) as { payload: unknown }[];
    if (result.length) {
      await mirrorResearchers([merged]);
      cachedSnapshot = undefined;
      snapshotExpires = 0;
      return;
    }
  }
  throw new Error(
    "Concurrent catalog updates prevented this save; retry is safe.",
  );
}
