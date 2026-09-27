import nextEnv from "@next/env";
import type { Researcher } from "../src/lib/types";
nextEnv.loadEnvConfig(process.cwd(), true);
const { loadCatalog, saveCatalog } =
  await import("../src/server/catalog-store");
const { writeFile, readFile } = await import("node:fs/promises");
const { records } = await loadCatalog();
const { departments } = await import("../src/lib/research-metadata");
// Explicitly reviewed legacy/Guide identity variants. Do not generalize nicknames to arbitrary people.
const pairs = [
  [
    "Menzie Chinn",
    "Menzie D. Chinn",
    "Same given/family name and La Follette department",
  ],
  [
    "Jason Fletcher",
    "Jason M Fletcher",
    "Same given/family name and La Follette department",
  ],
  [
    "Keith Levin",
    "Keith D. Levin",
    "Same given/family name and Statistics department",
  ],
  [
    "Joshua Cape",
    "Joshua R. Cape",
    "Same given/family name and Statistics department",
  ],
  [
    "Ainehi Edoro-Glines",
    "Ainehi Edoro",
    "Identical explicitly published aedoro@wisc.edu on both departmental profiles",
  ],
  [
    "Rick Chappell",
    "Richard Chappell",
    "Official Statistics article explicitly uses Rick and Richard for this professor: https://stat.wisc.edu/2023/12/14/professor-rick-chappell-has-been-bestowed-with-the-honor-of-a-distinguished-visiting-professor-at-the-city-university-of-hong-kong/",
  ],
  [
    "Daniel Quint",
    "Dan Quint",
    "Official research page uses both names: https://users.ssc.wisc.edu/~dquint/papers.htm",
  ],
  [
    "Chris Geoga",
    "Christopher Geoga",
    "Statistics profile and Guide agree on Statistics appointment and Rutgers PhD 2023: https://stat.wisc.edu/staff/geoga-chris/",
  ],
];
const changes: Researcher[] = [];
const report = [];
for (const [previousName, rosterName, evidence] of pairs) {
  const current = records.filter((r) => r.name === rosterName && r.coverage);
  const old = records.filter(
    (r) =>
      r.name === previousName &&
      (!r.coverage || r.coverage.rosterKey === current[0]?.coverage?.rosterKey),
  );
  if (old.length !== 1 || current.length !== 1) continue;
  const a = old[0],
    b = current[0];
  changes.push({
    ...a,
    academicTitle: b.academicTitle,
    department: departments(a.department + "; " + b.department).join("; "),
    keywords: [...new Set([...a.keywords, ...b.keywords])],
    publications: b.publications,
    sources: [
      ...new Map([...b.sources, ...a.sources].map((s) => [s.url, s])).values(),
    ],
    coverage: {
      ...b.coverage!,
      level: "profile" as const,
      contactChecked: !!a.contact.email,
      profileCheckedAt: a.sources[0]?.checkedAt,
    },
  });
  // Reversible alias preserves the old payload and ID for audit; display/search use the canonical original ID.
  changes.push({ ...b, supersededBy: a.id });
  report.push({ from: b.id, to: a.id, previousName, rosterName, evidence });
}
if (changes.length) {
  await writeFile(
    "output/catalog-identity-before.json",
    JSON.stringify(
      records.filter((r) => changes.some((c) => c.id === r.id)),
      null,
      2,
    ),
  );
  await saveCatalog(changes);
  await writeFile(
    "output/catalog-identity-reconciliation.json",
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify({ merged: report.length, identities: report }));
