import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { loadCatalog, localCatalog } =
  await import("../src/server/catalog-store");
const { catalogCoverage } = await import("../src/lib/catalog-coverage");
const { departments, matchesDirection } =
  await import("../src/lib/research-metadata");
const { searchCatalog } = await import("../src/server/catalog-search");
const { writeFile } = await import("node:fs/promises");
const local = new Map(
  (await localCatalog()).map((r) => [r.id, JSON.stringify(r)]),
);
const { records, shared } = await loadCatalog();
const cloudEqualsLocal =
  shared &&
  records.length === local.size &&
  records.every((r) => local.get(r.id) === JSON.stringify(r));
const names = ["Matthew Brown", "Leslie Smith", "Paul Koch", "Yang Yang"];
const report = {
  checkedAt: new Date().toISOString(),
  shared,
  cloudEqualsLocal,
  coverage: catalogCoverage(records),
  sameNames: names.map((name) => ({
    name,
    records: records
      .filter((r) => r.name === name)
      .map((r) => ({
        id: r.id,
        department: r.department,
        title: r.academicTitle,
      })),
  })),
  departmentExamples: [
    "History",
    "Psychology",
    "Chemistry",
    "Computer Sciences",
    "Medicine",
    "Mathematics",
    "Mechanical Engineering",
  ].map((d) => ({
    department: d,
    total: records.filter((r) => departments(r.department).includes(d)).length,
    research: records.filter(
      (r) =>
        departments(r.department).includes(d) && r.coverage?.level !== "roster",
    ).length,
  })),
};
console.log(JSON.stringify(report, null, 2));
if (!shared || !cloudEqualsLocal || report.coverage.rosterListed < 2800)
  throw new Error("Catalog integrity verification failed");
await writeFile(
  "output/catalog-campus-verification.json",
  JSON.stringify(report, null, 2),
);
if (process.argv.includes("--search")) {
  const start = Date.now();
  const result = await searchCatalog(
    "I am interested in artificial intelligence, but I am not sure which research direction to choose.",
    () => {},
  );
  const search = {
    query: result.query,
    elapsedMs: Date.now() - start,
    total: result.researchers.length,
    departments: new Set(
      result.researchers.flatMap((r) => departments(r.department)),
    ).size,
    directions: result.directions.map((d) => ({
      title: d.title,
      matches: result.researchers.filter((r) => matchesDirection(r, d)).length,
    })),
  };
  console.log(JSON.stringify(search, null, 2));
  if (search.total <= 54 || search.departments <= 2)
    throw new Error("Cross-department AI search did not exceed the old sample");
  await writeFile(
    "output/catalog-campus-search-verification.json",
    JSON.stringify(search, null, 2),
  );
}
