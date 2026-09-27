import { z } from "zod";
import { undergraduateReviewSchema } from "./undergraduate";

export const backgroundSchema = z.object({
  name: z.string().max(200),
  major: z.string().max(300),
  year: z.string().max(80),
  experience: z.string().max(10000),
  resumeText: z.string().max(50000),
});
export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  note: z.string(),
  checkedAt: z.string(),
  status: z.enum(["checked", "unavailable"]),
  excerpt: z.string().optional(),
});
const conditionSchema = z.object({
  value: z.enum(["supported", "not-supported", "unknown"]),
  detail: z.string(),
  sourceId: z.string().optional(),
  quote: z.string().optional(),
});
export const researcherSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  department: z.string(),
  lab: z.string(),
  title: z.string(),
  academicTitle: z.string().optional(),
  summary: z.string(),
  summaryZh: z.string(),
  question: z.string(),
  example: z.string(),
  methods: z.string(),
  topics: z.array(z.string()),
  keywords: z.array(z.string()),
  recruitment: z.enum(["open", "closed", "unknown"]),
  participation: conditionSchema,
  credit: conditionSchema,
  pay: conditionSchema,
  contact: z.object({
    route: z.enum(["email", "form", "program", "website", "closed"]),
    url: z.url(),
    email: z.string().optional(),
    note: z.string(),
    sourceId: z.string(),
  }),
  sources: z.array(sourceSchema),
  relevance: z.string().optional(),
  provenance: z.enum(["live", "sample"]).optional(),
  supersededBy: z.string().optional(),
  undergraduate: undergraduateReviewSchema.optional(),
  publications: z
    .array(
      z.object({
        title: z.string(),
        year: z.number().nullable(),
        url: z.url().optional(),
      }),
    )
    .optional(),
  coverage: z
    .object({
      level: z.enum(["roster", "research-index", "profile"]),
      rosterKey: z.string(),
      rosterCheckedAt: z.string(),
      researchCheckedAt: z.string().optional(),
      profileCheckedAt: z.string().optional(),
      category: z.enum([
        "faculty",
        "clinical",
        "teaching",
        "adjunct",
        "visiting",
        "emeritus",
        "other",
      ]),
      platformId: z.number().optional(),
      contactChecked: z.boolean(),
    })
    .optional(),
});
export const directionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  question: z.string(),
  keywords: z.array(z.string()),
});
export const searchResultSchema = z.object({
  webSearchStatus: z.enum(["complete", "timed-out", "unavailable"]).optional(),
  outcome: z.enum(["matches", "empty", "needs-clarification"]).optional(),
  id: z.string(),
  query: z.string(),
  interpretation: z.string(),
  language: z.enum(["en", "zh"]),
  broad: z.boolean(),
  directions: z.array(directionSchema),
  researchers: z.array(researcherSchema),
  checkedAt: z.string(),
  cached: z.boolean(),
  warnings: z.array(z.string()),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
export const draftSchema = z.object({
  id: z.string().min(1).max(120),
  researcherId: z.string().min(1).max(120),
  to: z.string().max(300),
  subject: z.string().max(500),
  body: z.string().max(30000),
  recipientEdited: z.boolean(),
  updatedAt: z.string(),
  answers: z.object({
    interest: z.string().max(10000),
    experience: z.string().max(10000),
    request: z.string().max(10000),
  }),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(200),
        size: z.number().nonnegative(),
        type: z.string().max(120),
      }),
    )
    .max(5)
    .optional(),
  generation: z.enum(["ai", "local-template"]).optional(),
});
export interface JobStatus {
  id: string;
  kind: string;
  state: "running" | "succeeded" | "failed";
  stage: string;
  startedAt?: number;
  result?: unknown;
  error?: string;
}
