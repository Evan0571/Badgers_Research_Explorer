import type { Researcher } from "./types";
import { containsTerm, departments, normalizeTopic } from "./research-metadata";
import { knownTopicAliases } from "./research-topic-labels";

/** A conservative outage fallback: only a complete known topic, never keywords
 * plucked from a sentence, a request with exclusions, or an instruction. */
export function literalCatalogTerms(query: string, records: Researcher[]) {
  const clean = normalizeTopic(query);
  if (!clean || query.length > 100 || clean.split(" ").length > 6) return [];
  const aliases = knownTopicAliases(clean);
  if (aliases.length) return aliases;
  const known = records.some((r) =>
    [...departments(r.department), ...r.keywords].some(
      (term) => normalizeTopic(term) === clean,
    ),
  );
  return known ? [query.trim()] : [];
}

/** Prioritize direct disciplinary and research evidence over incidental mentions
 * in publication titles. Keep every match available. */
export function rankCatalogMatches(
  records: Researcher[],
  terms: string[],
  concepts: string[][] = [],
) {
  const score = (r: Researcher) => {
    const departmentMatch = terms.some((term) =>
      departments(r.department).some(
        (department) => normalizeTopic(department) === normalizeTopic(term),
      ),
    );
    const topicMatch = terms.some((term) =>
      r.keywords.some(
        (keyword) => normalizeTopic(keyword) === normalizeTopic(term),
      ),
    );
    const descriptionMatch = terms.some((term) =>
      containsTerm(`${r.title} ${r.summary} ${r.summaryZh}`, term),
    );
    return (
      Number(departmentMatch) * 100 +
      Number(topicMatch) * 20 +
      Number(descriptionMatch) * 5 +
      concepts.filter((aliases) =>
        aliases.some((term) =>
          r.keywords.some((keyword) => containsTerm(keyword, term)),
        ),
      ).length *
        30
    );
  };
  return records
    .map((r) => ({ r, score: score(r) }))
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .map(({ r }) => r);
}
