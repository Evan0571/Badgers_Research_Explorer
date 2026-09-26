import { z } from "zod";
import { emptyWorkspace } from "./research";
import type { Workspace } from "./types";
import { researcherSchema, searchResultSchema } from "./contracts";
export const STORAGE_KEY = "uw-research-explorer:guest:v1";
const topic = z.string().max(120);
const schema = z.object({
  version: z.literal(1),
  query: z.string().max(10000),
  searched: z.boolean(),
  topics: z.array(topic),
  matchAll: z.boolean(),
  department: z.string(),
  recruitment: z.string(),
  creditOnly: z.boolean(),
  saved: z.array(z.string()),
  comparison: z.array(z.string()).max(3),
  notes: z.record(z.string(), z.string()),
  background: z.object({
    name: z.string(),
    major: z.string(),
    year: z.string(),
    experience: z.string(),
    resumeText: z.string(),
  }),
  selectedDrafts: z.array(z.string()).default([]),
  catalog: z.array(researcherSchema).optional(),
  search: searchResultSchema.optional(),
  drafts: z.array(
    z.object({
      id: z.string(),
      researcherId: z.string(),
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      recipientEdited: z.boolean(),
      updatedAt: z.string(),
      generation: z.enum(["ai", "local-template"]).optional(),
      answers: z.object({
        interest: z.string(),
        experience: z.string(),
        request: z.string(),
      }),
      attachments: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            size: z.number(),
            type: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});
export function parseWorkspace(raw: string | null): Workspace {
  if (!raw) return structuredClone(emptyWorkspace);
  return schema.parse(JSON.parse(raw));
}
