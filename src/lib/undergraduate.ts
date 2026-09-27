import { z } from "zod";

export const opportunityEvidenceSchema = z.object({
  sourceId: z.string(),
  quote: z.string(),
  audience: z.enum(["undergraduate", "all", "unknown"]),
  period: z.enum(["current", "historical", "unspecified"]),
});
export const opportunityFactSchema = z.object({
  value: z.enum(["yes", "no", "unknown"]),
  detail: z.string(),
  detailZh: z.string(),
  evidence: z.array(opportunityEvidenceSchema),
});
export const undergraduateReviewSchema = z.object({
  version: z.literal(1),
  attemptedAt: z.string(),
  checkedAt: z.string().nullable(),
  status: z.enum(["checked", "partial", "failed"]),
  supervision: opportunityFactSchema,
  applications: opportunityFactSchema,
  openings: opportunityFactSchema,
  credit: opportunityFactSchema,
  pay: opportunityFactSchema,
  applicationUrl: z.string().nullable(),
  contactOptions: z.array(
    z.object({
      kind: z.enum(["form", "instructions", "email"]),
      url: z.string(),
      label: z.string(),
      labelZh: z.string(),
      required: z.boolean(),
      sourceId: z.string(),
      quote: z.string(),
      status: z.enum(["open", "closed", "unknown"]).optional(),
    }),
  ),
  websites: z.array(
    z.object({
      url: z.string(),
      kind: z.enum(["university", "personal", "lab", "opportunities", "team"]),
    }),
  ),
  attempts: z.array(
    z.object({
      url: z.string(),
      status: z.enum(["read", "failed", "skipped"]),
      reason: z.string(),
      checkedAt: z.string().nullable(),
    }),
  ),
  discovery: z.enum(["searched", "failed"]),
  limitations: z.array(z.string()),
});
export type OpportunityFact = z.infer<typeof opportunityFactSchema>;
export type UndergraduateReview = z.infer<typeof undergraduateReviewSchema>;
const opportunityFilterSchema = z.enum(["", "yes", "no", "unknown"]);
export const undergraduateFiltersSchema = z.object({
  supervision: opportunityFilterSchema.optional(),
  openings: opportunityFilterSchema.optional(),
  applications: opportunityFilterSchema.optional(),
});
export type UndergraduateFilters = z.infer<typeof undergraduateFiltersSchema>;

export function matchesUndergraduateFilters(
  review: UndergraduateReview | undefined,
  filters: UndergraduateFilters,
) {
  return (["supervision", "openings", "applications"] as const).every(
    (key) =>
      !filters[key] || (review?.[key].value ?? "unknown") === filters[key],
  );
}

/** Retain the meaning of saved searches from the original combined dropdown. */
export function workspaceUndergraduateFilters(workspace: {
  recruitment?: string;
  undergraduateFilters?: UndergraduateFilters;
}): UndergraduateFilters {
  if (workspace.undergraduateFilters) return workspace.undergraduateFilters;
  const legacy = workspace.recruitment;
  return {
    supervision: legacy === "supervision" ? "yes" : "",
    applications: legacy === "applications" ? "yes" : "",
    openings:
      legacy === "open" || legacy === "openings"
        ? "yes"
        : legacy === "closed"
          ? "no"
          : legacy === "unknown"
            ? "unknown"
            : "",
  };
}

export function unknownOpportunity(
  detail = "No explicit evidence was found in the pages checked.",
  detailZh = "已检查的页面中未找到明确证据。 ",
): OpportunityFact {
  return { value: "unknown", detail, detailZh: detailZh.trim(), evidence: [] };
}
export function matchesUndergraduate(
  review: UndergraduateReview | undefined,
  filter: string,
) {
  if (!filter) return true;
  if (filter === "pending") return !review || review.status === "failed";
  if (filter === "partial") return review?.status === "partial";
  if (filter === "checked") return review?.status === "checked";
  if (filter === "supervision") return review?.supervision.value === "yes";
  if (filter === "applications") return review?.applications.value === "yes";
  if (filter === "openings") return review?.openings.value === "yes";
  if (filter === "closed") return review?.openings.value === "no";
  if (filter === "unknown")
    return !review || review.openings.value === "unknown";
  return false;
}
