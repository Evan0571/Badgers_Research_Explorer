import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { mkdir, readFile, writeFile } = await import("node:fs/promises");
const { join } = await import("node:path");
const {
  parseFacultyRoster,
  ROSTER_URL,
  RESEARCH_PLATFORM,
  matchRoster,
  publicEvidence,
  rosterResearcher,
  nameKey,
} = await import("../src/server/faculty-roster");
const { loadCatalog, saveCatalog, WEEK } =
  await import("../src/server/catalog-store");
import type {
  PublicScholar,
  PublicResearchEvidence,
} from "../src/server/faculty-roster";
const root = join(process.cwd(), ".data", "campus-import");
await mkdir(root, { recursive: true });
await mkdir(join(root, "units"), { recursive: true });
await mkdir(join(root, "profiles"), { recursive: true });
await mkdir("output", { recursive: true });
const force = process.argv.includes("--all");
const profileWorkers = Math.max(
  1,
  Math.min(8, Number(process.env.CATALOG_IMPORT_WORKERS) || 8),
);
async function publicRequest(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "UWResearchExplorer/0.2 (public faculty research indexing)",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Public source HTTP ${res.status}`);
    return res;
  }
  throw new Error("Public source temporarily unavailable after retries");
}
async function cachedJSON(file: string, url: string) {
  if (!force)
    try {
      const c = JSON.parse(await readFile(file, "utf8"));
      if (Date.parse(c.checkedAt) > Date.now() - WEEK) return c.data;
    } catch {}
  const data = await (await publicRequest(url)).json();
  await writeFile(
    file,
    JSON.stringify({ checkedAt: new Date().toISOString(), data }),
  );
  return data;
}
async function mapWorkers<T>(
  items: T[],
  count: number,
  work: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: count }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        await work(items[i], i);
        await new Promise((r) => setTimeout(r, 100));
      }
    }),
  );
}
const rosterHTML = await (await publicRequest(ROSTER_URL)).text();
const roster = parseFacultyRoster(rosterHTML);
if (roster.length < 2000)
  throw new Error(
    "Official roster unexpectedly shrank. Existing catalog was not changed.",
  );
await writeFile(
  join(root, "roster.json"),
  JSON.stringify({
    checkedAt: new Date().toISOString(),
    source: ROSTER_URL,
    entries: roster,
  }),
);
// Preserve the full official teaching roster separately; catalog professor-rank appointments, including explicitly labeled categories.
const professors = roster.filter((r) => /professor/i.test(r.title));
const existing = (await loadCatalog()).records;
const existingRoster = new Map(
  existing.filter((r) => r.coverage).map((r) => [r.coverage!.rosterKey, r]),
);
const existingNames = new Map<string, typeof existing>();
for (const r of existing) {
  const key = nameKey(r.name);
  existingNames.set(key, [...(existingNames.get(key) || []), r]);
}
const byRoster = new Map(
  professors.map((r) => {
    const sameName = existingNames.get(nameKey(r.name)) || [];
    const sameDepartment = sameName.filter(
      (old) =>
        old.coverage?.rosterKey === r.key ||
        old.department
          .split(";")
          .some((d) => nameKey(d) === nameKey(r.department)),
    );
    const old =
      existingRoster.get(r.key) ??
      (sameDepartment.length === 1
        ? sameDepartment[0]
        : !r.key.includes("|") && sameName.length === 1
          ? sameName[0]
          : undefined);
    return [r.key, rosterResearcher(r, undefined, old)] as const;
  }),
);
if (new Set([...byRoster.values()].map((r) => r.id)).size !== professors.length)
  throw new Error(
    "Faculty identities collided; existing catalog was not changed.",
  );
for (const [key, record] of byRoster) {
  const previous = existingRoster.get(key);
  if (previous && record.id !== previous.id)
    throw new Error("A known professor identity would change; import stopped.");
}
if (process.argv.includes("--check-identities")) {
  console.log(
    JSON.stringify({
      professors: professors.length,
      stableIdentities: byRoster.size,
      previousRosterIdentities: existingRoster.size,
    }),
  );
  process.exit(0);
}
const failures: { stage: string; id: string; reason: string }[] = [];
const context = await cachedJSON(
  join(root, "context.json"),
  RESEARCH_PLATFORM + "/api/institutions",
);
if (String(context.institutionId) !== "14")
  throw new Error("Unexpected institution; refusing to mix universities.");
const units = (await cachedJSON(
  join(root, "units.json"),
  RESEARCH_PLATFORM + "/api/units/14",
)) as { id: number; name: string }[];
const people = new Map<number, PublicScholar>();
let unitsDone = 0,
  profilesDone = 0,
  profilesWithResearch = 0;
const report = () => ({
  at: new Date().toISOString(),
  rosterEntries: roster.length,
  professorAppointments: professors.length,
  unitsTotal: units.filter((u) => u.id > 0).length,
  unitsDone,
  platformPeople: people.size,
  profilesDone,
  profilesWithResearch,
  failures,
});
await writeFile(
  "output/catalog-campus-progress.json",
  JSON.stringify(report(), null, 2),
);
console.log(
  JSON.stringify({
    stage: "roster",
    entries: roster.length,
    professors: professors.length,
  }),
);
await mapWorkers(
  units.filter((u) => u.id > 0),
  4,
  async (u) => {
    try {
      const rows = (await cachedJSON(
        join(root, "units", u.id + ".json"),
        `${RESEARCH_PLATFORM}/api/people/getbyunitids/14/${u.id}`,
      )) as PublicScholar[];
      for (const p of rows) {
        if (p.deprecatedDate) continue;
        const previous = people.get(p.id);
        people.set(p.id, {
          ...p,
          unitIds: [...new Set([...(previous?.unitIds || []), u.id])],
        });
      }
    } catch (e) {
      failures.push({
        stage: "unit",
        id: String(u.id),
        reason: e instanceof Error ? e.message : String(e),
      });
    }
    unitsDone++;
    if (unitsDone % 20 === 0) {
      console.log(
        JSON.stringify({
          stage: "directories",
          unitsDone,
          people: people.size,
        }),
      );
      await writeFile(
        "output/catalog-campus-progress.json",
        JSON.stringify(report(), null, 2),
      );
    }
  },
);
const matches = [...people.values()].flatMap((p) => {
  const r = matchRoster(
    p,
    professors,
    units.filter((u) => p.unitIds?.includes(u.id)).map((u) => u.name),
  );
  return r ? [{ person: p, roster: r }] : [];
});
console.log(
  JSON.stringify({
    stage: "research",
    matched: matches.length,
    platformPeople: people.size,
  }),
);
await mapWorkers(matches, profileWorkers, async ({ person, roster: entry }) => {
  try {
    const path = join(root, "profiles", person.id + ".json");
    let ev: PublicResearchEvidence | undefined;
    if (!force)
      try {
        const c = JSON.parse(await readFile(path, "utf8"));
        if (Date.parse(c.checkedAt) > Date.now() - WEEK) ev = c;
      } catch {}
    if (!ev) {
      const p = await (
        await publicRequest(`${RESEARCH_PLATFORM}/api/people/${person.id}`)
      ).json();
      if (p.deprecatedDate || p.desiredExposure !== 2)
        throw new Error("Profile is not publicly exposed/current");
      const terms = await (
        await publicRequest(
          `${RESEARCH_PLATFORM}/api/people/getEditedResearchKeywords/${person.id}`,
        )
      ).json();
      ev = publicEvidence(p, terms);
      await writeFile(path, JSON.stringify(ev));
    }
    if (!matchRoster(ev.person, [entry]))
      throw new Error("Profile identity changed; manual review required");
    const old = byRoster.get(entry.key)!;
    const enriched = rosterResearcher(entry, ev, old);
    byRoster.set(entry.key, enriched);
    if (enriched.coverage?.level !== "roster") profilesWithResearch++;
  } catch (e) {
    failures.push({
      stage: "profile",
      id: String(person.id),
      reason: e instanceof Error ? e.message : String(e),
    });
  }
  profilesDone++;
  if (profilesDone % 100 === 0) {
    console.log(
      JSON.stringify({
        stage: "profiles",
        profilesDone,
        total: matches.length,
        profilesWithResearch,
        failed: failures.length,
      }),
    );
    await writeFile(
      "output/catalog-campus-progress.json",
      JSON.stringify(report(), null, 2),
    );
  }
});
const results = [...byRoster.values()];
for (let i = 0; i < results.length; i += 75) {
  await saveCatalog(results.slice(i, i + 75));
  console.log(
    JSON.stringify({
      stage: "cloud-sync",
      saved: Math.min(i + 75, results.length),
      total: results.length,
    }),
  );
}
const coverage = {
  ...report(),
  complete: true,
  professorRecords: results.length,
  researchIndexed: results.filter((r) => r.coverage?.level !== "roster").length,
  rosterOnly: results.filter((r) => r.coverage?.level === "roster").length,
  departmentCount: new Set(professors.map((r) => r.department)).size,
  categories: professors.reduce(
    (acc, r) => ({ ...acc, [r.category]: (acc[r.category] || 0) + 1 }),
    {} as Record<string, number>,
  ),
  unmatched: professors
    .filter((r) => !matches.some((m) => m.roster.key === r.key))
    .map((r) => ({
      name: r.name,
      department: r.department,
      category: r.category,
    })),
};
await writeFile(
  "output/catalog-campus-progress.json",
  JSON.stringify(coverage, null, 2),
);
await writeFile(join(root, "coverage.json"), JSON.stringify(coverage, null, 2));
console.log(
  JSON.stringify({
    stage: "complete",
    ...Object.fromEntries(
      Object.entries(coverage).filter(
        ([key]) => !["failures", "unmatched", "categories"].includes(key),
      ),
    ),
  }),
);
if (failures.length) process.exitCode = 1;
