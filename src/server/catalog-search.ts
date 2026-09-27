import {
  planSchema,
  cleanQueryPlan,
  researcherIndex,
  satisfiesRequiredConcepts,
  satisfiesOpportunityRequirements,
  CATALOG_QUERY_INSTRUCTIONS,
  needsEnglishAliases,
} from "@/lib/query-plan";
export { planSchema } from "@/lib/query-plan";
import { readableInput } from "@/lib/input-quality";
import {
  literalCatalogTerms,
  rankCatalogMatches,
} from "@/lib/catalog-matching";
import { randomUUID } from "node:crypto";
import { loadCatalog, WEEK } from "./catalog-store";
import { saveFacultyReview } from "./catalog-store";
import {
  discoverFacultySites,
  collectFacultyPages,
  extractFacultyReview,
  buildFacultyReview,
} from "./faculty-verification";
import { discoverLive } from "./discovery";
import { structured } from "./openai";
import { db } from "./db";
import { digest } from "./security";
import { AppError } from "./http";
import { withSearchDeadline } from "./search-deadline";
import {
  containsNormalizedTerm,
  normalizeTopic,
  repairDirections,
  directionsWithMatches,
} from "@/lib/research-metadata";
import type { SearchResult } from "@/lib/contracts";
import type { Researcher } from "@/lib/types";
export async function searchCatalog(
  query: string,
  progress: (stage: string) => void,
  expand = false,
  refresh = false,
): Promise<SearchResult> {
  const clarification = (interpretation: string): SearchResult => ({
    id: randomUUID(),
    query,
    interpretation,
    outcome: "needs-clarification",
    language: /[\u3400-\u9fff]/.test(query) ? "zh" : "en",
    broad: false,
    directions: [],
    researchers: [],
    checkedAt: new Date().toISOString(),
    cached: false,
    warnings: [],
  });
  progress("Checking your research question");
  if (!readableInput(query)) return clarification("");
  progress("Checking the research catalog");
  const catalog = await loadCatalog();
  let records = catalog.records;
  if (!/emerit|荣休|退休/i.test(query))
    records = records.filter(
      (r) =>
        r.coverage?.category !== "emeritus" ||
        normalizeTopic(query) === normalizeTopic(r.name),
    );
  const warnings = catalog.warning ? [catalog.warning] : [];
  let live: SearchResult | undefined;
  let webSearchStatus: SearchResult["webSearchStatus"];
  const key = digest("catalog-plan-v6:" + query.toLowerCase());
  const saved = db()
    .prepare("SELECT payload FROM search_cache WHERE key=? AND expires>?")
    .get(key, Date.now()) as { payload: string } | undefined;
  const exactNames = records.filter(
    (r) => normalizeTopic(query) === normalizeTopic(r.name),
  );
  progress("Checking your research question");
  let literalFallback = false;
  const rawPlan = exactNames.length
    ? {
        intent: "research" as const,
        interpretation: query,
        groups: [{ title: query, terms: exactNames.map((r) => r.name) }],
        excluded: [],
      }
    : saved
      ? planSchema.parse(JSON.parse(saved.payload))
      : await structured(
          "catalog_query",
          planSchema,
          CATALOG_QUERY_INSTRUCTIONS,
          { query },
          45000,
        ).catch((error: unknown) => {
          if (!(error instanceof AppError) || !error.code.startsWith("AI_"))
            throw error;
          const terms = literalCatalogTerms(query, records);
          if (!terms.length) throw error;
          literalFallback = true;
          return {
            intent: "research" as const,
            interpretation: query,
            groups: [{ title: query, terms }],
            excluded: [],
          };
        });
  let plan = cleanQueryPlan(planSchema.parse(rawPlan), query);
  if (!exactNames.length && needsEnglishAliases(plan, query)) {
    progress("Checking bilingual research terms");
    plan = cleanQueryPlan(
      await structured(
        "catalog_query_bilingual",
        planSchema,
        CATALOG_QUERY_INSTRUCTIONS +
          "\nRepair the provided plan: preserve its intent and criteria, but add concise English aliases to EVERY group and requiredConcept. Do not create professors or assume openings.",
        { query, plan },
        20000,
      ),
      query,
    );
    if (needsEnglishAliases(plan, query))
      throw new AppError(
        "AI_SCHEMA",
        "The research terms could not be translated reliably. Please try the topic in English or browse the faculty catalog.",
        502,
      );
  }
  if (literalFallback)
    warnings.push(
      "AI interpretation is unavailable. These results match the complete topic and known aliases in the catalog; nuanced intent and exclusions have not been interpreted.",
    );
  if (!saved && !exactNames.length && !literalFallback)
    db()
      .prepare(
        "INSERT INTO search_cache(key,payload,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires=excluded.expires",
      )
      .run(key, JSON.stringify(plan), Date.now() + WEEK);
  if (plan.intent !== "research" || !plan.groups.length)
    return clarification(plan.interpretation);
  if (!records.length || expand) {
    try {
      // A roster entry may still lack research evidence. Never exclude the whole
      // campus roster from discovery; verified profiles merge by stable ID.
      live = await withSearchDeadline((signal) =>
        discoverLive(
          query,
          (stage) => {
            signal.throwIfAborted();
            progress(stage);
          },
          true,
          signal,
        ),
      );
      webSearchStatus = "complete";
      records = [
        ...new Map(
          [...records, ...live.researchers].map((r) => [r.id, r]),
        ).values(),
      ];
      warnings.push(...live.warnings);
    } catch (error) {
      if (error instanceof AppError && error.code === "JOB_STOPPED")
        throw error;
      webSearchStatus =
        error instanceof AppError &&
        ["WEB_SEARCH_TIMEOUT", "AI_TIMEOUT"].includes(error.code)
          ? "timed-out"
          : "unavailable";
    }
  }
  progress(
    "Matching interests across " + records.length + " researcher profiles",
  );
  const terms = plan.groups.flatMap((g) => g.terms.map(normalizeTopic));
  const excluded = plan.excluded.map(normalizeTopic);
  let matched = records.filter((r) => {
    if (exactNames.length)
      return exactNames.some((person) => person.id === r.id);
    const indexed = researcherIndex(r);
    return (
      (plan.requiredConcepts.length > 0 ||
        terms.some((t) => containsNormalizedTerm(indexed, t))) &&
      satisfiesRequiredConcepts(indexed, plan) &&
      !excluded.some((t) => containsNormalizedTerm(indexed, t))
    );
  });
  const topicMatches = matched.length;
  matched = matched.filter((r) => satisfiesOpportunityRequirements(r, plan));
  if (plan.requiredConcepts.length)
    warnings.push(
      "Required research concepts: " +
        plan.requiredConcepts.map((c) => c.title).join(" + "),
    );
  if (plan.unverifiedConstraints.length)
    warnings.push(
      "Needs confirmation with the lab: " +
        plan.unverifiedConstraints.join("; ") +
        ". These conditions have not been verified for the listed profiles.",
    );
  const concepts = plan.requiredConcepts.map((concept) => concept.terms);
  matched = rankCatalogMatches(matched, terms, concepts);
  const directions = plan.groups.map((g) => ({
    id: "topic-" + digest(g.title.toLowerCase()).slice(0, 12),
    title: g.title,
    description: g.terms.join(", "),
    question: g.terms.slice(0, 4).join(" · "),
    keywords: g.terms,
  }));
  if (refresh) {
    const refreshed: Researcher[] = [];
    for (let i = 0; i < matched.length; i += 2) {
      progress(
        `Reading current sources ${i + 1}–${Math.min(i + 2, matched.length)} of ${matched.length}`,
      );
      await Promise.all(
        matched.slice(i, i + 2).map(async (old) => {
          try {
            const sites = await discoverFacultySites([old]);
            const pages = await collectFacultyPages(
              old,
              sites.get(old.id) || [],
            );
            const raw = pages.documents.length
              ? await extractFacultyReview(old, pages)
              : null;
            const next = buildFacultyReview(old, pages, raw, true);
            await saveFacultyReview(next, old);
            if (next.undergraduate?.status !== "checked")
              warnings.push(
                "The expanded website review for " +
                  old.name +
                  " is incomplete; see its source coverage.",
              );
            refreshed.push(next);
          } catch {
            refreshed.push(old);
            warnings.push(
              "Could not refresh " +
                old.name +
                "; previous evidence dates are preserved.",
            );
          }
        }),
      );
    }
    matched = rankCatalogMatches(
      refreshed.filter((r) => satisfiesOpportunityRequirements(r, plan)),
      terms,
      concepts,
    );
  }
  if (plan.requirements.length)
    warnings.push(
      "Required source evidence: " +
        plan.requirements.join(", ") +
        ". " +
        (topicMatches - matched.length) +
        " topic-related profiles were excluded because these conditions are not confirmed. Unknown is not evidence of no opportunity.",
    );
  matched = repairDirections(matched, directions).map((r) => ({
    ...r,
    relevance: "",
  }));
  const supportedDirections = directionsWithMatches(matched, directions).map(
    ({ direction }) => direction,
  );
  const stale = matched.filter((r) =>
    r.sources.some((s) => Date.parse(s.checkedAt) < Date.now() - WEEK),
  ).length;
  if (stale)
    warnings.push(
      stale +
        " profiles have evidence older than one week. Openings may have changed; refresh before contacting.",
    );
  progress("Preparing all " + matched.length + " matching results");
  return {
    id: randomUUID(),
    query,
    outcome: matched.length ? "matches" : "empty",
    interpretation: plan.interpretation,
    language: /[\u3400-\u9fff]/.test(query) ? "zh" : "en",
    broad: supportedDirections.length > 1,
    directions: supportedDirections,
    researchers: matched,
    checkedAt: new Date().toISOString(),
    cached: !live && !refresh,
    webSearchStatus,
    warnings,
  };
}
