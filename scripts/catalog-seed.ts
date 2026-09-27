import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);
const { readSource, isUniversityURL } = await import("../src/server/sources");
const { extractDocuments, validateExtraction } =
  await import("../src/server/discovery");
const { saveCatalog, loadCatalog, WEEK } =
  await import("../src/server/catalog-store");
const { mkdir, writeFile } = await import("node:fs/promises");
// Faculty directories, not arbitrary search snippets. Extend this source list as coverage grows.
const directories = [
  "https://stat.wisc.edu/staff-type/faculty/",
  "https://edpsych.education.wisc.edu/people/",
];
const known = await loadCatalog();
const fresh = new Set(
  known.records
    .filter((r) =>
      r.sources.every((s) => Date.parse(s.checkedAt) > Date.now() - WEEK),
    )
    .flatMap((r) => r.sources.map((s) => s.url)),
);
const seen = new Set<string>(),
  profiles = new Set<string>();
for (const root of directories) {
  const pending = [root];
  let pages = 0;
  while (pending.length && pages++ < 50) {
    const url = pending.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const page = await readSource(url, new Set([new URL(url).hostname]));
      for (const link of page.links) {
        const u = new URL(link);
        if (u.hostname !== new URL(root).hostname) continue;
        if (
          /\/(staff|people)\/[^/]+\/?$/.test(u.pathname) &&
          !/(emerit|alumni|staff-type)/.test(u.pathname)
        )
          profiles.add(link);
        if (
          root.includes("staff-type") &&
          link.startsWith(root + "page/") &&
          !seen.has(link)
        )
          pending.push(link);
      }
    } catch (e) {
      console.error("Directory unavailable: " + url);
      throw e;
    }
  }
}
const urls = [...profiles].filter((u) => !fresh.has(u));
let saved = 0;
const failures: { url: string; reason: string }[] = [];
console.log(
  JSON.stringify({
    discoveredProfiles: profiles.size,
    alreadyFresh: profiles.size - urls.length,
    queued: urls.length,
  }),
);
for (let i = 0; i < urls.length; i += 4) {
  const documents = (
    await Promise.all(
      urls.slice(i, i + 4).map(async (url) => {
        try {
          const profile = await readSource(
            url,
            new Set([new URL(url).hostname]),
          );
          const personal = profile.links
            .filter((v) => /pages\.(stat|cs)\.wisc\.edu\/~/i.test(v))
            .slice(0, 1);
          const linked = await Promise.all(
            personal.map(async (v) => {
              try {
                return await readSource(v, new Set([new URL(v).hostname]));
              } catch {
                return null;
              }
            }),
          );
          return [
            profile,
            ...linked.filter((v): v is NonNullable<typeof v> => !!v),
          ];
        } catch {
          failures.push({ url, reason: "Source unavailable" });
          return [];
        }
      }),
    )
  ).flat();
  if (!documents.length) continue;
  try {
    const raw = await extractDocuments(
      "Build a reusable UW-Madison faculty research catalog across all research fields. Include every current faculty member in these individual profiles. Do not filter by a student interest. Exclude students, former staff and emeritus-only retired profiles. No assumptions about open positions.",
      documents,
    );
    const verified = validateExtraction(raw, documents);
    await saveCatalog(verified);
    saved += verified.length;
    console.log(
      JSON.stringify({
        processed: Math.min(i + 4, urls.length),
        queued: urls.length,
        saved,
      }),
    );
  } catch (e) {
    failures.push(
      ...urls
        .slice(i, i + 4)
        .map((url) => ({
          url,
          reason: e instanceof Error ? e.message : "Extraction failed",
        })),
    );
  }
}
await mkdir("output", { recursive: true });
await writeFile(
  "output/catalog-seed.json",
  JSON.stringify(
    {
      completedAt: new Date().toISOString(),
      discovered: profiles.size,
      saved,
      failures,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ saved, failed: failures.length }));
if (failures.length) process.exitCode = 1;
