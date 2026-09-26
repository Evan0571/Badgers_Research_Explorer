import { topics } from "@/data/researchers";
import type { Background, Draft, Researcher, Topic, Workspace } from "./types";

export const emptyWorkspace: Workspace = {
  version: 1,
  query: "",
  searched: false,
  topics: [],
  matchAll: false,
  department: "",
  recruitment: "",
  creditOnly: false,
  saved: [],
  comparison: [],
  notes: {},
  drafts: [],
  selectedDrafts: [],
  background: { name: "", major: "", year: "", experience: "", resumeText: "" },
};
export function inferTopics(query: string): Topic[] {
  const q = query.toLowerCase();
  return topics
    .filter((t) =>
      t.keywords.some((k) =>
        k.length <= 2 && /^[a-z]+$/.test(k)
          ? new RegExp(`\\b${k}\\b`, "i").test(q)
          : q.includes(k),
      ),
    )
    .map((t) => t.id);
}
export function isBroadQuery(query: string) {
  return /^(ai|artificial intelligence|人工智能|我对\s*ai\s*感兴趣)[\s.!。]*$/i.test(
    query.trim(),
  );
}
export function findResearchers(
  all: Researcher[],
  query: string,
  selected: Topic[],
  matchAll = false,
): Researcher[] {
  const q = query.toLowerCase().trim();
  const inferred = selected.length ? selected : inferTopics(q);
  let found: Researcher[];
  if (inferred.length)
    found = all.filter((r) =>
      matchAll
        ? inferred.every((t) => r.topics.includes(t))
        : inferred.some((t) => r.topics.includes(t)),
    );
  else if (isBroadQuery(q)) found = all;
  else {
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    found = all.filter((r) => {
      const hay =
        `${r.name} ${r.lab} ${r.title} ${r.summary} ${r.summaryZh} ${r.department} ${r.keywords.join(" ")}`.toLowerCase();
      return (
        hay.includes(q) ||
        (words.length > 0 && words.every((w) => hay.includes(w)))
      );
    });
  }
  return [...found].sort(
    (a, b) =>
      Number(a.recruitment === "closed") - Number(b.recruitment === "closed"),
  );
}
export function canEmail(r: Researcher) {
  return (
    r.contact.route === "email" &&
    !!r.contact.email &&
    r.recruitment !== "closed"
  );
}
export function makeDraft(
  r: Researcher,
  background: Background,
  interest: string,
  id: string,
): Draft {
  if (!canEmail(r))
    throw new Error("This researcher does not have an eligible email route.");
  const identity = [background.year, background.major]
    .filter(Boolean)
    .join(" ");
  const body = `Dear Professor ${r.name.split(" ").at(-1)},\n\nMy name is ${background.name.trim() || "[Your name]"}, and I am ${identity ? `a ${identity} student` : "a student"} at UW-Madison. I am exploring undergraduate research and am interested in ${r.title.toLowerCase()}.\n\n${background.experience.trim() ? `A little about my background: ${background.experience.trim()}\n\n` : ""}I am still learning about your work. Could you let me know whether there is an appropriate way for an undergraduate to get involved, or where I could learn about the application process? I understand that opportunities may not currently be available.\n\nThank you for your time.\n\nBest,\n${background.name.trim() || "[Your name]"}`;
  return {
    id,
    researcherId: r.id,
    to: r.contact.email!,
    subject: `Undergraduate research inquiry: ${r.title.toLowerCase()}`,
    body,
    recipientEdited: false,
    updatedAt: new Date().toISOString(),
    answers: { interest: "", experience: "", request: "" },
  };
}
export function draftIssues(draft: Draft): string[] {
  const issues: string[] = [];
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(draft.to))
    issues.push("Add one valid recipient address.");
  if (!draft.subject.trim() || /[\r\n]/.test(draft.subject))
    issues.push("Add a subject on one line.");
  if (!draft.body.trim()) issues.push("Add the email body.");
  if (/\[[^\]]+\]|\{\{[^}]+\}\}/.test(draft.body + draft.subject))
    issues.push("Replace the unfinished placeholders.");
  if (
    (draft.attachments || []).reduce(
      (n, attachment) => n + attachment.size,
      0,
    ) >
    2 * 1024 * 1024
  )
    issues.push(
      "Keep attachments within 2 MB total per message for Outlook sending.",
    );
  return issues;
}
export function normalizeRecipients(drafts: Draft[]) {
  const seen = new Set<string>();
  return drafts.filter((d) => {
    const key = d.to.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function personalize(draft: Draft): string {
  const extra = [
    draft.answers.interest && `What interests me: ${draft.answers.interest}`,
    draft.answers.experience &&
      `Relevant background: ${draft.answers.experience}`,
    draft.answers.request &&
      `What I would like to ask: ${draft.answers.request}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!extra) return draft.body;
  const anchor = "\n\nThank you for your time.";
  return draft.body.includes(anchor)
    ? draft.body.replace(anchor, `\n\n${extra}${anchor}`)
    : `${draft.body}\n\n${extra}`;
}
