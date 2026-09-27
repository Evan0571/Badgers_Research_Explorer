import type { Researcher } from "./types";
import type { z } from "zod";
import type { directionSchema } from "./contracts";
type Direction = z.infer<typeof directionSchema>;
export const normalizeTopic = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function departments(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[;；|\n]+/)
    .flatMap((v) => {
      const clean = v
        .trim()
        .replace(/^(?:faculty )?affiliate (?:appointments? in|of the)\s+/i, "")
        .replace(/^Department of\s+/i, "")
        .replace(/\s+Department$/i, "")
        .replace(/\s+affiliation listed$/i, "")
        .replace(/\s*&\s*/g, " and ")
        .replace(/^LaFollette /, "La Follette ");
      return /^Computer Sciences and Statistics$/i.test(clean)
        ? ["Computer Sciences", "Statistics"]
        : /^English and African Cultural Studies$/i.test(clean)
          ? ["English", "African Cultural Studies"]
          : [clean];
    })
    .filter((v) => {
      const key = v.toLowerCase();
      if (
        !v ||
        /^(?:ph\.?d\.?|m\.?d\.?|ms|bs|ba|mfa|ma)\s+\d{4}\b/i.test(v) ||
        seen.has(key)
      )
        return false;
      seen.add(key);
      return true;
    });
}
export function containsTerm(text: string, term: string) {
  return containsNormalizedTerm(normalizeTopic(text), normalizeTopic(term));
}
/** Both inputs are already normalized; reuse a profile's index across query terms. */
export function containsNormalizedTerm(hay: string, needle: string) {
  if (!needle) return false;
  return /[\u3400-\u9fff]/.test(needle)
    ? hay.includes(needle)
    : (" " + hay + " ").includes(" " + needle + " ");
}
export function matchesDirection(r: Researcher, direction: Direction) {
  const tags = r.topics.map(normalizeTopic);
  if (
    [direction.id, direction.title].some((v) =>
      tags.includes(normalizeTopic(v)),
    )
  )
    return true;
  const hay = [
    r.name,
    r.department,
    r.title,
    r.summary,
    r.summaryZh,
    ...r.keywords,
    ...r.topics,
    ...(r.publications || []).map((p) => p.title),
  ].join(" ");
  const normalized = normalizeTopic(hay);
  return direction.keywords.some((k) =>
    containsNormalizedTerm(normalized, normalizeTopic(k)),
  );
}
export function repairDirections(
  researchers: Researcher[],
  directions: Direction[],
) {
  return researchers.map((r) => ({
    ...r,
    topics: [
      ...new Set([
        ...r.topics,
        ...directions.filter((d) => matchesDirection(r, d)).map((d) => d.id),
      ]),
    ],
  }));
}
/** A generated search concept becomes a visible direction only with matches. */
export function directionsWithMatches(
  researchers: Researcher[],
  directions: Direction[],
) {
  return directions
    .map((direction) => ({
      direction,
      count: researchers.filter((r) => matchesDirection(r, direction)).length,
    }))
    .filter(({ count }) => count > 0);
}
export function academicTitle(r: Researcher) {
  const role =
    /\b(?:(?:assistant|associate|full|emeritus|distinguished|research|clinical|adjunct)\s+)?professor(?:\s+emerit(?:us|a))?\b|\blab(?:oratory)? director\b/i;
  if (r.academicTitle?.trim()) return r.academicTitle;
  if (role.test(r.title) && r.title.length < 100) return r.title;
  return "";
}
