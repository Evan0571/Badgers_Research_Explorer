import { load } from "cheerio";
import { digest } from "./security";
import type { Researcher } from "@/lib/types";
import { departments } from "@/lib/research-metadata";

export const ROSTER_URL = "https://guide.wisc.edu/faculty/";
export const RESEARCH_PLATFORM = "https://wisc.discovery.academicanalytics.com";
export interface FacultyEntry {
  key: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  education: string;
  category:
    | "faculty"
    | "clinical"
    | "teaching"
    | "adjunct"
    | "visiting"
    | "emeritus"
    | "other";
  checkedAt: string;
}
export const nameKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
const displayName = (value: string) =>
  value.toLowerCase().replace(/(^|[\s\-'])[\p{L}]/gu, (s) => s.toUpperCase());
// A dash/underscore can fill an unused name field for a person with one name.
// Remove only a whole placeholder field; preserve real hyphenated names.
const namePart = (value: string) =>
  /^[\s_\-–—]*$/.test(value) ? "" : value.trim();
export function parseFacultyRoster(
  html: string,
  checkedAt = new Date().toISOString(),
): FacultyEntry[] {
  const $ = load(html);
  const result: FacultyEntry[] = [];
  for (const el of $(".faculty-name").toArray()) {
    const lines = ($(el).parent().html() || "")
      .split(/<br\s*\/?\s*>/i)
      .map((s) => load(s).text().replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (lines.length < 3 || !lines[0].includes(","))
      throw new Error("Faculty roster format changed; import stopped.");
    const [family, ...given] = lines[0].split(",");
    const lastName = namePart(family);
    const firstName = namePart(given.join(" "));
    if (!/[\p{L}]/u.test(firstName + lastName))
      throw new Error("Faculty name is missing; import stopped.");
    const title = lines[1];
    const missingDepartment =
      /^(?:ph\.?d\.?|m\.?d\.?|ms|bs|ba|mfa|ma)\s+\d{4}\b/i.test(lines[2]);
    const category: FacultyEntry["category"] = /emerit/i.test(title)
      ? "emeritus"
      : /adjunct/i.test(title)
        ? "adjunct"
        : /visiting/i.test(title)
          ? "visiting"
          : /clinical|\(CHS\)/i.test(title)
            ? "clinical"
            : /teaching.*professor/i.test(title)
              ? "teaching"
              : /professor/i.test(title)
                ? "faculty"
                : "other";
    const name = displayName([firstName, lastName].filter(Boolean).join(" "));
    result.push({
      key: nameKey(name),
      name,
      firstName: displayName(firstName),
      lastName: displayName(lastName),
      title,
      department: missingDepartment ? "Department not listed" : lines[2],
      education: lines.slice(missingDepartment ? 2 : 3).join("; "),
      category,
      checkedAt,
    });
  }
  if (!result.length)
    throw new Error("No faculty records found; previous roster retained.");
  const counts = new Map<string, number>();
  for (const r of result) counts.set(r.key, (counts.get(r.key) || 0) + 1);
  // Identical names can belong to different professors; never collapse them.
  for (const r of result)
    if (counts.get(r.key)! > 1) r.key += "|" + nameKey(r.department);
  return result;
}
export interface PublicScholar {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  isNonFaculty?: boolean;
  deprecatedDate?: string | null;
  unitIds?: number[];
}
export function matchRoster(
  person: PublicScholar,
  roster: FacultyEntry[],
  unitNames: string[] = [],
): FacultyEntry | undefined {
  const full = nameKey(
    `${person.firstName} ${person.middleName || ""} ${person.lastName}`,
  );
  const direct = roster.filter((r) => nameKey(r.name) === full);
  if (direct.length === 1) return direct[0];
  const first = nameKey(person.firstName.split(" ")[0]);
  const last = nameKey(person.lastName);
  const matches = roster.filter(
    (r) =>
      nameKey(r.lastName) === last &&
      nameKey(r.firstName.split(" ")[0]) === first,
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const departments = unitNames.map((n) =>
      nameKey(n.replace(/Department of | Program$/g, "")),
    );
    const sameDepartment = matches.filter((r) =>
      departments.includes(nameKey(r.department)),
    );
    if (sameDepartment.length === 1) return sameDepartment[0];
  }
  return undefined;
}
export interface PublicResearchEvidence {
  person: PublicScholar;
  title: string;
  departments: string[];
  summary: string;
  terms: string[];
  works: { title: string; year: number | null; url?: string }[];
  checkedAt: string;
  profileUrl: string;
}
const plainText = (text: unknown) =>
  typeof text === "string" ? load(text).text().replace(/\s+/g, " ").trim() : "";
/** Retain only public research fields rendered by the institution's platform, never hidden contacts or abstracts. */
export function publicEvidence(
  profile: Record<string, any>,
  terms: { term: string }[],
  checkedAt = new Date().toISOString(),
): PublicResearchEvidence {
  const works = [
    "articles",
    "books",
    "bookChapters",
    "conferenceProceedings",
    "softwareDigitalMedia",
    "projects",
    "exhibits",
    "performances",
  ]
    .flatMap((k) => (Array.isArray(profile[k]) ? profile[k] : []))
    .filter(
      (w) =>
        !w.deprecatedDate &&
        (w.desiredVisibility == null || w.desiredVisibility === 2) &&
        typeof w.title === "string",
    )
    .map((w) => ({
      title: plainText(w.title),
      year:
        Number(
          w.activityYear || w.year || String(w.activityDate || "").slice(0, 4),
        ) || null,
      ...(w.doi ? { url: "https://doi.org/" + w.doi } : {}),
    }))
    .sort((a, b) => (b.year || 0) - (a.year || 0));
  return {
    person: {
      id: profile.id,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      isNonFaculty: profile.isNonFaculty,
      deprecatedDate: profile.deprecatedDate,
    },
    title: plainText(profile.title),
    departments: (profile.unitAffiliations || [])
      .filter((u: any) => u.institutionId === 14 && u.type === 2)
      .map((u: any) => u.name.replace(/^Department of /, "")),
    summary: plainText(profile.researchSummary).slice(0, 700),
    terms: [
      ...new Set(terms.map((t) => plainText(t.term)).filter(Boolean)),
    ].slice(0, 40),
    works: [...new Map(works.map((w) => [w.title, w])).values()].slice(0, 12),
    checkedAt,
    profileUrl: `${RESEARCH_PLATFORM}/scholar/${profile.id}/${encodeURIComponent(profile.firstName + "-" + profile.lastName)}`,
  };
}
export function rosterResearcher(
  entry: FacultyEntry,
  evidence?: PublicResearchEvidence,
  existing?: Researcher,
): Researcher {
  const identity = entry.name
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  const rosterSource = {
    id: "uw-guide-" + digest(entry.key).slice(0, 12),
    title: "UW–Madison official faculty roster",
    url: ROSTER_URL,
    note: "The annually refreshed Guide verifies the listed name, appointment and department. It does not establish research interests or openings.",
    checkedAt: entry.checkedAt,
    status: "checked" as const,
    excerpt: `${entry.name}; ${entry.title}; ${entry.department}`,
  };
  const hasResearch = !!(
    evidence &&
    (evidence.terms.length || evidence.summary || evidence.works.length)
  );
  const unknown = {
    value: "unknown" as const,
    detail: "Not established by the checked public sources.",
  };
  const previousProfile =
    existing &&
    existing.coverage?.level !== "roster" &&
    existing.coverage?.level !== "research-index";
  const preserveIndexed =
    !evidence && existing?.coverage?.level === "research-index";
  const status = previousProfile
    ? "profile"
    : hasResearch || preserveIndexed
      ? "research-index"
      : "roster";
  const terms = evidence?.terms || [];
  const summary =
    evidence?.summary ||
    (terms.length
      ? "Research topics indexed by the university: " +
        terms.slice(0, 10).join(", ") +
        "."
      : evidence?.works.length
        ? "Research publications indexed by the university include: " +
          evidence.works
            .slice(0, 3)
            .map((w) => w.title)
            .join("; ") +
          "."
        : "Listed in the official faculty roster. Research interests and contact details still need source verification.");
  const base: Researcher = existing || {
    id: `uw-${digest(identity + (entry.key.includes("|") ? "|" + nameKey(entry.department) : "")).slice(0, 20)}`,
    name: entry.name,
    initials: (entry.firstName[0] || "") + (entry.lastName[0] || ""),
    department: entry.department,
    lab: "",
    title: entry.title,
    summary: "",
    summaryZh: "",
    question: "",
    example: "",
    methods: "",
    topics: [],
    keywords: [],
    recruitment: "unknown",
    participation: unknown,
    credit: unknown,
    pay: unknown,
    contact: {
      route: "website",
      url: ROSTER_URL,
      sourceId: rosterSource.id,
      note: "Public email and participation route have not been verified.",
    },
    sources: [],
    provenance: "live",
  };
  const platformSource = evidence
    ? {
        id: `uw-research-${evidence.person.id}`,
        title: "Research at UW–Madison: " + entry.name,
        url: evidence.profileUrl,
        note: "Public research terms and publication titles from the university-linked research platform. Publication activity does not imply an open position.",
        checkedAt: evidence.checkedAt,
        status: "checked" as const,
      }
    : undefined;
  const sources = [
    ...base.sources.filter(
      (s) =>
        s.url !== ROSTER_URL &&
        (!evidence || !s.url.startsWith(RESEARCH_PLATFORM)),
    ),
    rosterSource,
    ...(platformSource ? [platformSource] : []),
  ];
  return {
    ...base,
    academicTitle: entry.title,
    department: departments(
      [
        entry.department,
        ...(evidence?.departments || []),
        ...(existing?.department.split("; ") || []),
      ].join("; "),
    )
      .filter((d, _, all) => d !== "Department not listed" || all.length === 1)
      .join("; "),
    ...(!previousProfile && !preserveIndexed
      ? {
          title: entry.title,
          summary,
          summaryZh: hasResearch
            ? "学校研究平台收录的研究主题或成果：" +
              (terms.length
                ? terms.slice(0, 10).join("、")
                : evidence!.summary ||
                  evidence!.works
                    .slice(0, 3)
                    .map((w) => w.title)
                    .join("；"))
            : "已核对官方教师名录；研究方向、个人主页和联系方式尚待补充核验。",
          question: hasResearch
            ? "Explore the source-backed research topics and publications listed below."
            : "Research details are not yet verified.",
          methods: "Not independently established by the indexed sources.",
          contact:
            base.contact.email ||
            (base.contact.url !== ROSTER_URL &&
              !base.contact.url.startsWith(RESEARCH_PLATFORM))
              ? base.contact
              : {
                  ...base.contact,
                  url: evidence?.profileUrl || base.contact.url,
                  sourceId: platformSource?.id || base.contact.sourceId,
                },
        }
      : {}),
    keywords: previousProfile
      ? [...new Set([...base.keywords, ...terms])]
      : preserveIndexed
        ? base.keywords
        : terms,
    sources,
    publications: evidence?.works || base.publications,
    coverage: {
      level: status,
      rosterKey: entry.key,
      rosterCheckedAt: entry.checkedAt,
      researchCheckedAt:
        evidence?.checkedAt || base.coverage?.researchCheckedAt,
      category: entry.category,
      platformId: evidence?.person.id || base.coverage?.platformId,
      contactChecked: base.contact.route === "email",
      profileCheckedAt:
        base.coverage?.profileCheckedAt ||
        (previousProfile ? base.sources[0]?.checkedAt : undefined),
    },
  };
}
