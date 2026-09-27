// Reapply stricter evidence guards to saved public snapshots without pretending to fetch them again.
import nextEnv from "@next/env";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
nextEnv.loadEnvConfig(process.cwd(), true);
const { loadCatalog, saveFacultyReview } =
  await import("../src/server/catalog-store");
const { buildFacultyReview } =
  await import("../src/server/faculty-verification");
const root = path.resolve(".data/undergraduate-verification");
const latest = new Map<string, { file: string; attemptedAt: string }>();
for (const directory of await readdir(root, { withFileTypes: true })) {
  if (!directory.isDirectory() || !/^\d{4}-/.test(directory.name)) continue;
  for (const file of await readdir(path.join(root, directory.name))) {
    if (!/^uw-.*\.json$/.test(file)) continue;
    const full = path.join(root, directory.name, file);
    const entry = JSON.parse(await readFile(full, "utf8"));
    const date = entry.reviewed?.undergraduate?.attemptedAt;
    if (!entry.raw || !date) continue;
    const id = entry.originalId;
    if (!latest.has(id) || date > latest.get(id)!.attemptedAt)
      latest.set(id, { file: full, attemptedAt: date });
  }
}
const { records, shared } = await loadCatalog();
if (!shared) throw new Error("Cloud unavailable; no changes saved.");
const changes = [];
for (const original of records) {
  const saved = latest.get(original.id);
  if (!saved) continue;
  const entry = JSON.parse(await readFile(saved.file, "utf8"));
  if (
    original.undergraduate?.checkedAt &&
    original.undergraduate.checkedAt > entry.reviewed.undergraduate.checkedAt
  )
    continue;
  const reviewed = buildFacultyReview(
    original,
    entry.pages,
    entry.raw,
    entry.reviewed.undergraduate.discovery === "searched",
  );
  const fields = [
    "supervision",
    "applications",
    "openings",
    "credit",
    "pay",
    "contactOptions",
  ] as const;
  if (
    fields.every(
      (key) =>
        JSON.stringify(original.undergraduate?.[key]) ===
        JSON.stringify(reviewed.undergraduate?.[key]),
    )
  )
    continue;
  changes.push({ original, reviewed });
}
const report = path.join(
  root,
  "revalidated-" + new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(report, { recursive: true });
await writeFile(
  path.join(report, "before.json"),
  JSON.stringify(changes.map((c) => c.original)),
);
for (const { original, reviewed } of changes) {
  await saveFacultyReview(reviewed, original);
  console.log(
    JSON.stringify({
      name: original.name,
      supervision: reviewed.undergraduate?.supervision.value,
      applications: reviewed.undergraduate?.applications.value,
      openings: reviewed.undergraduate?.openings.value,
    }),
  );
}
console.log(JSON.stringify({ revalidated: changes.length }));
