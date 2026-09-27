import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { readFile, writeFile, mkdir } = await import("node:fs/promises");
const { join } = await import("node:path");
const { load } = await import("cheerio");
const { digest } = await import("../src/server/security");
const { publicLinks, nameMatcher, profileContact } =
  await import("../src/server/department-evidence");
const { loadCatalog, saveCatalog, WEEK } =
  await import("../src/server/catalog-store");
import type { FacultyEntry } from "../src/server/faculty-roster";
const DEPARTMENTS = "https://www.wisc.edu/academics/departments-and-programs/";
const root = join(process.cwd(), ".data", "department-import");
await mkdir(root, { recursive: true });
await mkdir("output", { recursive: true });
const roster = JSON.parse(
  await readFile(".data/campus-import/roster.json", "utf8"),
).entries.filter((r: FacultyEntry) =>
  /professor/i.test(r.title),
) as FacultyEntry[];
const matchName = nameMatcher(roster);
const failures: { url: string; reason: string }[] = [];
const seen = new Set<string>();
async function page(
  url: string,
): Promise<{ html: string; url: string; checkedAt: string }> {
  const file = join(root, digest(url) + ".json");
  try {
    const cached = JSON.parse(await readFile(file, "utf8"));
    if (Date.parse(cached.checkedAt) > Date.now() - WEEK) return cached;
  } catch {}
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "UWResearchExplorer/0.2 (public faculty profile indexing)",
    },
  });
  if (!res.ok || !res.headers.get("content-type")?.includes("text/html"))
    throw new Error("Public page HTTP " + res.status);
  const final = new URL(res.url);
  if (
    !final.hostname.endsWith(".wisc.edu") ||
    final.pathname.startsWith("/directories")
  )
    throw new Error("Not an allowed public faculty website");
  const html = await res.text();
  if (html.length > 3_000_000)
    throw new Error("Directory exceeds readable page limit");
  const data = { html, url: res.url, checkedAt: new Date().toISOString() };
  await writeFile(file, JSON.stringify(data));
  return data;
}
async function workers<T>(
  items: T[],
  work: (item: T) => Promise<void>,
  count = 4,
) {
  let i = 0;
  await Promise.all(
    Array.from({ length: count }, async () => {
      while (i < items.length) {
        await work(items[i++]);
        await new Promise((r) => setTimeout(r, 150));
      }
    }),
  );
}
const contacts = new Map<
  string,
  NonNullable<ReturnType<typeof profileContact>>
>();
let report: {
  at: string;
  departmentIndex: string;
  roots: number;
  directoryPages: number;
  candidates: number;
  identified: number;
  emails: number;
  failures: typeof failures;
  boundedDirectories: string[];
};
if (process.argv.includes("--apply")) {
  const saved = JSON.parse(await readFile(join(root, "contacts.json"), "utf8"));
  for (const c of saved) contacts.set(c.key, c);
  report = JSON.parse(await readFile("output/catalog-contacts.json", "utf8"));
} else {
  const index = await page(DEPARTMENTS);
  const $ = load(index.html);
  const roots = [
    ...new Set(
      publicLinks($("main").html() || index.html, index.url)
        .filter(
          (l) =>
            l.url !== DEPARTMENTS &&
            !/Academic advising|Academic calendar|Registrar|Undergraduate research/.test(
              l.label,
            ),
        )
        .map((l) => l.url),
    ),
  ];
  const profiles = new Map<string, { entry: FacultyEntry; url: string }>();
  let rootsDone = 0;
  const boundedDirectories: string[] = [];
  await workers(roots, async (rootURL) => {
    const queue = [{ url: rootURL, depth: 0 }];
    let count = 0;
    while (queue.length && count < 24) {
      const current = queue.shift()!;
      if (seen.has(current.url)) continue;
      seen.add(current.url);
      count++;
      try {
        const data = await page(current.url);
        for (const link of publicLinks(data.html, data.url)) {
          const entry = matchName(link.label);
          if (
            entry &&
            link.url !== data.url &&
            !/\/(news|events?|category|tag)\//i.test(new URL(link.url).pathname)
          ) {
            profiles.set(entry.key + "|" + link.url, { entry, url: link.url });
          } else if (
            current.depth < 3 &&
            new URL(link.url).hostname.replace(/^www\./, "") ===
              new URL(data.url).hostname.replace(/^www\./, "") &&
            /^(?:our |all |current )?(?:faculty(?:\s*(?:&|and)\s*staff)?|people|directory|faculty directory|faculty & staff directory|faculty and staff directory|faculty members|core faculty|tenure.track faculty|research faculty|professors|academic staff|emerit[a-z ]*|next|\d{1,2})$/i.test(
              link.label,
            ) &&
            !seen.has(link.url) &&
            !queue.some((q) => q.url === link.url)
          )
            queue.push({ url: link.url, depth: current.depth + 1 });
        }
      } catch (e) {
        failures.push({
          url: current.url,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (queue.length) boundedDirectories.push(rootURL);
    rootsDone++;
    if (rootsDone % 10 === 0)
      console.log(
        JSON.stringify({
          stage: "directories",
          rootsDone,
          roots: roots.length,
          candidateProfiles: profiles.size,
        }),
      );
  });
  await writeFile(
    "output/catalog-contact-candidates.json",
    JSON.stringify([...profiles.values()], null, 2),
  );
  let profilesDone = 0;
  await workers([...profiles.values()], async ({ entry, url }) => {
    try {
      const data = await page(url);
      const evidence = profileContact(
        data.html,
        data.url,
        entry,
        data.checkedAt,
      );
      if (
        evidence &&
        (!contacts.has(entry.key) ||
          (!contacts.get(entry.key)?.email && evidence.email))
      )
        contacts.set(entry.key, evidence);
    } catch (e) {
      failures.push({
        url,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
    profilesDone++;
    if (profilesDone % 100 === 0)
      console.log(
        JSON.stringify({
          stage: "contacts",
          profilesDone,
          candidates: profiles.size,
          identified: contacts.size,
          emails: [...contacts.values()].filter((c) => c.email).length,
        }),
      );
  });
  report = {
    at: new Date().toISOString(),
    departmentIndex: DEPARTMENTS,
    roots: roots.length,
    directoryPages: seen.size,
    candidates: profiles.size,
    identified: contacts.size,
    emails: [...contacts.values()].filter((c) => c.email).length,
    failures,
    boundedDirectories,
  };
  await writeFile(
    "output/catalog-contacts.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    join(root, "contacts.json"),
    JSON.stringify([...contacts.values()], null, 2),
  );
}
// Merge only after research import is complete; --collect stores reusable evidence without modifying the catalog.
if (!process.argv.includes("--collect")) {
  const current = await loadCatalog();
  const updates = current.records.flatMap((r) => {
    const c = r.coverage && contacts.get(r.coverage.rosterKey);
    if (!c) return [];
    const sourceId = digest(c.url).slice(0, 20);
    return [
      {
        ...r,
        contact: c.email
          ? {
              route: "email" as const,
              email: c.email,
              url: c.url,
              sourceId,
              note: "Email explicitly published on the matching official faculty profile. Openings require separate verification.",
            }
          : r.contact.email
            ? r.contact
            : {
                ...r.contact,
                url: c.url,
                sourceId,
                note: "Official individual faculty profile. No unambiguous personal email verified on this page.",
              },
        coverage: {
          ...r.coverage!,
          contactChecked: !!(c.email || r.contact.email),
        },
        sources: [
          ...r.sources.filter((s) => s.url !== c.url),
          {
            id: sourceId,
            title: c.name + " — official department profile",
            url: c.url,
            checkedAt: c.checkedAt,
            status: "checked" as const,
            excerpt: c.excerpt,
            note: "Identity and any listed email checked on the official individual profile; research availability was not inferred.",
          },
        ],
      },
    ];
  });
  for (let i = 0; i < updates.length; i += 75)
    await saveCatalog(updates.slice(i, i + 75));
  console.log(
    JSON.stringify({
      ...report,
      failures: report.failures.length,
      updated: updates.length,
    }),
  );
} else
  console.log(JSON.stringify({ ...report, failures: report.failures.length }));
