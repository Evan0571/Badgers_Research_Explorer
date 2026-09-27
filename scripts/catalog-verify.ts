import nextEnv from "@next/env";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd(), true);
const { loadCatalog, catalogConfigured, saveFacultyReview, WEEK } =
  await import("../src/server/catalog-store");
const {
  discoverFacultySites,
  collectFacultyPages,
  extractFacultyReview,
  buildFacultyReview,
  retryVerification,
} = await import("../src/server/faculty-verification");
import type { Researcher } from "../src/lib/types";
const args = process.argv.slice(2);
const argument = (name: string) =>
  args.find((a) => a.startsWith(name + "="))?.slice(name.length + 1);
const force = args.includes("--force");
const batchSize = Math.min(6, Math.max(1, Number(argument("--batch") || 4)));
const workers = Math.min(8, Math.max(1, Number(argument("--workers") || 3)));
const limit = Number(argument("--limit") || Infinity);
const ids = argument("--ids")?.split(",");
const department = argument("--department")?.toLowerCase();
const retry = args.includes("--retry-failed");
if (!catalogConfigured())
  throw new Error(
    "Supabase credentials are required. This job must not audit a local substitute.",
  );
const snapshot = await loadCatalog();
if (!snapshot.shared)
  throw new Error("Could not read the cloud catalog. No records were changed.");
const due = snapshot.records
  .filter(
    (r) =>
      (!ids || ids.includes(r.id)) &&
      (!department || r.department.toLowerCase().includes(department)) &&
      (force ||
        !r.undergraduate ||
        Date.parse(r.undergraduate.attemptedAt) < Date.now() - WEEK ||
        (retry && r.undergraduate.status === "failed")),
  )
  .sort((a, b) => {
    return (
      Number(!!a.undergraduate) - Number(!!b.undergraduate) ||
      a.name.localeCompare(b.name)
    );
  })
  .slice(0, limit);
const root = path.resolve(".data/undergraduate-verification"),
  runId = new Date().toISOString().replace(/[:.]/g, "-");
const run = path.join(root, runId);
await mkdir(run, { recursive: true });
await writeFile(path.join(run, "before.json"), JSON.stringify(due));
const progress = {
  runId,
  startedAt: new Date().toISOString(),
  updatedAt: "",
  total: due.length,
  processed: 0,
  checked: 0,
  partial: 0,
  failed: 0,
  saveFailed: 0,
  supervision: 0,
  applications: 0,
  openings: 0,
  forms: 0,
  active: [] as string[],
  completedAt: null as string | null,
  stoppedReason: "",
};
let writing = Promise.resolve();
const checkpoint = () => {
  progress.updatedAt = new Date().toISOString();
  const body = JSON.stringify(progress, null, 2);
  writing = writing.then(async () => {
    await writeFile(path.join(run, "progress.json"), body);
    await writeFile(path.join(root, "latest.json"), body);
  });
  return writing;
};
await checkpoint();
console.log(JSON.stringify({ runId, total: due.length, workers, batchSize }));
let cursor = 0;
let discoveryFailures = 0;
async function worker() {
  while (cursor < due.length && !progress.stoppedReason) {
    if (existsSync(path.join(run, "stop-requested"))) {
      progress.stoppedReason =
        "Stopped at a checkpoint; remaining records can be resumed.";
      break;
    }
    const batch = due.slice(cursor, cursor + batchSize);
    cursor += batchSize;
    progress.active.push(...batch.map((r) => r.name));
    await checkpoint();
    let sites: Awaited<ReturnType<typeof discoverFacultySites>> = new Map();
    let searched = false;
    let searchError = "";
    try {
      sites = await discoverFacultySites(batch);
      searched = true;
      discoveryFailures = 0;
    } catch (e) {
      searchError = e instanceof Error ? e.message : "Discovery failed";
      discoveryFailures++;
      if (discoveryFailures >= 3)
        progress.stoppedReason =
          "Repeated web discovery failures; remaining records were not marked reviewed. " +
          searchError;
    }
    await Promise.all(
      batch.map(async (original) => {
        const cache = path.join(run, original.id + ".json");
        try {
          const pages = await collectFacultyPages(
            original,
            sites.get(original.id) || [],
          );
          if (searchError) pages.limitations.push(searchError);
          let raw = null;
          if (pages.documents.length)
            try {
              raw = await retryVerification(() =>
                extractFacultyReview(original, pages),
              );
            } catch (e) {
              pages.limitations.push(
                e instanceof Error ? e.message : "Extraction failed",
              );
            }
          const reviewed = buildFacultyReview(original, pages, raw, searched);
          await writeFile(
            cache,
            JSON.stringify(
              {
                originalId: original.id,
                discoveredSites: sites.get(original.id) || [],
                pages,
                raw,
                reviewed,
              },
              null,
              2,
            ),
          );
          await saveFacultyReview(reviewed, original);
          const v = reviewed.undergraduate!;
          progress[v.status]++;
          if (v.supervision.value === "yes") progress.supervision++;
          if (v.applications.value === "yes") progress.applications++;
          if (v.openings.value === "yes") progress.openings++;
          if (v.contactOptions.some((o) => o.kind === "form")) progress.forms++;
          console.log(
            JSON.stringify({
              name: original.name,
              status: v.status,
              supervision: v.supervision.value,
              applications: v.applications.value,
              openings: v.openings.value,
              forms: v.contactOptions.filter((o) => o.kind === "form").length,
              read: pages.documents.length,
            }),
          );
        } catch (e) {
          progress.saveFailed++;
          await appendFile(
            path.join(run, "failures.jsonl"),
            JSON.stringify({
              id: original.id,
              name: original.name,
              error: e instanceof Error ? e.message : "Verification failed",
            }) + "\n",
          );
          console.error("Could not save review: " + original.name);
        } finally {
          progress.processed++;
          progress.active = progress.active.filter((n) => n !== original.name);
          await checkpoint();
        }
      }),
    );
  }
}
await Promise.all(Array.from({ length: workers }, () => worker()));
progress.completedAt =
  progress.processed === progress.total ? new Date().toISOString() : null;
await checkpoint();
console.log(JSON.stringify(progress));
if (progress.saveFailed || progress.stoppedReason) process.exitCode = 1;
