import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { load } from "cheerio";
import type { Researcher } from "../src/lib/types";

nextEnv.loadEnvConfig(process.cwd(), true);
const { loadCatalog, saveCatalog, catalogConfigured } =
  await import("../src/server/catalog-store");
const { parseFacultyRoster, ROSTER_URL } =
  await import("../src/server/faculty-roster");
const { researcherSchema } = await import("../src/lib/contracts");

// Reviewed identity corrections. Match the existing Guide key and ID, never merge
// people by a guessed nickname. These official pages were checked independently.
const corrections = [
  {
    key: "mitch",
    name: "Mitch",
    initials: "M",
    url: "https://law.wisc.edu/profiles/mitch",
    heading: "Mitch",
    department: "Law School",
    email: "mitch@wisc.edu",
    identityEvidence:
      "The Guide uses MITCH,-; the Law School profile uses the single name Mitch and agrees on the clinical appointment and Wisconsin JD.",
    requiredText: ["Clinical Professor", "J.D., University of Wisconsin"],
    summary:
      "Mitch studies access to justice and ways to deliver legal services to people in need. He directs the Neighborhood Law Clinic, with work in housing, employment and community lawyering.",
    summaryZh:
      "Mitch 关注司法可及性及面向有需要人群的法律服务。他主持社区法律诊所，涉及住房、劳动权益和社区法律实践。",
    question:
      "How can legal services better reach people facing housing and employment problems?",
    example:
      "An illustrative question is how a legal clinic can help tenants understand their options when facing eviction.",
    methods:
      "Clinical legal education, client representation and research on delivery of legal services.",
    keywords: [
      "access to justice",
      "housing law",
      "employment law",
      "community lawyering",
      "clinical legal education",
    ],
    excerpt: "Clinical Professor; Neighborhood Law Clinic Director",
  },
  {
    key: "a cigan mark",
    name: "A. Mark Cigan",
    initials: "MC",
    url: "https://ms-biotech.wisc.edu/staff/cigan-mark/",
    heading: "Mark Cigan",
    department: "M.S. in Biotechnology Program",
    email: "cigan2@wisc.edu",
    identityEvidence:
      "The Guide lists CIGAN,A MARK, an adjunct professor with a Northwestern PhD. The Biotechnology profile uses Mark Cigan and confirms both the adjunct appointment and Northwestern doctorate.",
    requiredText: ["Adjunct Professor", "Northwestern University"],
    summary:
      "A. Mark Cigan works on gene editing and genetics for animal health and agriculture. His faculty profile describes research on disease resistance in livestock, especially poultry, and earlier work on plant reproduction and genome modification.",
    summaryZh:
      "A. Mark Cigan 研究面向动物健康和农业的基因编辑与遗传学，包括家畜尤其是家禽的抗病性，以及植物繁殖和基因组改造。",
    question: "How can gene editing improve disease resistance in livestock?",
    example:
      "An illustrative question is whether a targeted genetic change can help poultry resist an infection.",
    methods:
      "Gene editing, gene sequencing, cell biology and reproductive biology.",
    keywords: [
      "gene editing",
      "genetics",
      "animal health",
      "livestock disease resistance",
      "plant reproduction",
    ],
    excerpt:
      "Adjunct Professor and Faculty with the M.S. in Biotechnology Program",
  },
  {
    key: "a neil salyapongse",
    name: "A. Neil Salyapongse",
    initials: "NS",
    url: "https://ortho.wisc.edu/physicians/a-neil-salyapongse",
    heading: "A. Neil Salyapongse, MD",
    department: "Orthopedics and Rehabilitation",
    email: undefined,
    identityEvidence:
      "The Orthopedics individual profile gives the full display name A. Neil Salyapongse and a Northwestern medical degree, matching the Guide record.",
    requiredText: ["Research Interests", "Northwestern University"],
    summary:
      "A. Neil Salyapongse focuses on hand and upper-extremity care, surgical education and global surgery collaboration. His research interests include resident education and minimally invasive techniques for hand and wrist disorders.",
    summaryZh:
      "A. Neil Salyapongse 关注手部与上肢诊疗、外科教育及国际合作，研究兴趣包括住院医师培训以及手和腕部疾病的微创治疗技术。",
    question:
      "How can surgical training and minimally invasive care improve treatment of hand and wrist disorders?",
    example:
      "An illustrative question is how changes to a surgical training program can improve preparation for hand surgery.",
    methods:
      "Surgical education, international training collaborations and development of minimally invasive treatment techniques.",
    keywords: [
      "hand surgery",
      "upper extremity",
      "surgical education",
      "global surgery",
      "minimally invasive surgery",
    ],
    excerpt: "A. Neil Salyapongse, MD",
  },
];

async function officialPage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || new URL(response.url).hostname !== new URL(url).hostname)
    throw new Error("Official source unavailable or moved: " + url);
  return { html: await response.text(), checkedAt: new Date().toISOString() };
}
const snapshot = await loadCatalog();
if (catalogConfigured() && !snapshot.shared)
  throw new Error("Shared catalog unavailable; repair has not been applied.");
const rosterPage = await officialPage(ROSTER_URL);
const roster = parseFacultyRoster(rosterPage.html, rosterPage.checkedAt);
const updates: Researcher[] = [];
for (const correction of corrections) {
  const candidates = snapshot.records.filter(
    (r) => r.coverage?.rosterKey === correction.key,
  );
  const entry = roster.find((r) => r.key === correction.key);
  if (candidates.length !== 1 || !entry)
    throw new Error("Identity is missing or ambiguous: " + correction.key);
  const old = candidates[0];
  const page = await officialPage(correction.url);
  const $ = load(page.html);
  $("nav,footer,header,script,style").remove();
  const headings = $("h1,h2,.physicians-profile-header")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim());
  const content = $("body").text().replace(/\s+/g, " ");
  if (
    !headings.includes(correction.heading) ||
    correction.requiredText.some((s) => !content.includes(s))
  )
    throw new Error("Identity evidence changed: " + correction.url);
  if (
    correction.email &&
    !$("a[href^='mailto:']")
      .toArray()
      .some(
        (a) =>
          $(a).attr("href")?.toLowerCase() === "mailto:" + correction.email,
      )
  )
    throw new Error("Published email changed: " + correction.url);
  const sourceId = "reviewed-profile-" + old.id;
  const updated = researcherSchema.parse({
    ...old,
    name: correction.name,
    initials: correction.initials,
    department: correction.department,
    summary: correction.summary,
    summaryZh: correction.summaryZh,
    question: correction.question,
    example: correction.example,
    methods: correction.methods,
    keywords: [...new Set([...old.keywords, ...correction.keywords])],
    contact: {
      route: correction.email ? "email" : "website",
      url: correction.url,
      email: correction.email,
      sourceId,
      note: correction.email
        ? "Personal email published on this official individual profile. Current openings require separate confirmation."
        : "Official individual profile verified. The page lists an administrative assistant; that contact has not been assigned as the professor's personal email. Current openings require separate confirmation.",
    },
    sources: [
      ...old.sources
        .filter((s) => s.url !== correction.url)
        .map((s) =>
          s.url === ROSTER_URL
            ? {
                ...s,
                checkedAt: rosterPage.checkedAt,
                excerpt: `${entry.name}; ${entry.title}; ${entry.department}`,
              }
            : s,
        ),
      {
        id: sourceId,
        title: correction.name + " — official individual profile",
        url: correction.url,
        checkedAt: page.checkedAt,
        status: "checked",
        excerpt: correction.excerpt,
        note:
          correction.identityEvidence +
          " Research summary checked on this page; openings were not inferred.",
      },
    ],
    coverage: {
      ...old.coverage!,
      rosterCheckedAt: rosterPage.checkedAt,
      level: "profile",
      profileCheckedAt: page.checkedAt,
      researchCheckedAt: page.checkedAt,
      contactChecked: !!correction.email,
    },
  });
  updates.push(updated);
}
await mkdir("output", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = `output/faculty-profile-repair-${stamp}.json`;
await writeFile(
  reportPath,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      before: snapshot.records.filter((r) =>
        updates.some((u) => u.id === r.id),
      ),
      after: updates,
    },
    null,
    2,
  ),
);
if (process.argv.includes("--apply")) {
  await saveCatalog(updates);
  const verified = await loadCatalog();
  if (catalogConfigured() && !verified.shared)
    throw new Error("Shared catalog verification failed.");
  for (const update of updates) {
    const saved = verified.records.find((r) => r.id === update.id);
    if (saved?.name !== update.name || saved.contact.url !== update.contact.url)
      throw new Error("Repair read-back failed: " + update.id);
  }
  console.log(
    JSON.stringify({
      applied: updates.length,
      shared: verified.shared,
      total: verified.records.length,
      reportPath,
    }),
  );
} else
  console.log(
    JSON.stringify({
      preview: updates.map((r) => ({
        id: r.id,
        name: r.name,
        url: r.contact.url,
      })),
      reportPath,
    }),
  );
