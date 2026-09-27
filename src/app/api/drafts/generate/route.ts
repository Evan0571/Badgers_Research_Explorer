import { after } from "next/server";
import { z } from "zod";
import { backgroundSchema } from "@/lib/contracts";
import { session, rateLimit } from "@/server/security";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { createJob, runJob } from "@/server/jobs";
import { generateDrafts } from "@/server/generation";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session();
    rateLimit(`drafts:${user.id}`, 15, 3600000);
    rateLimit("drafts:global", 200, 3600000);
    const input = await jsonBody(
      request,
      z.object({
        ids: z.array(z.string().max(120)).min(1).max(6),
        query: z.string().max(3000),
        background: backgroundSchema,
      }),
    );
    const id = createJob(user.id, "drafts");
    after(() =>
      runJob(id, (progress) =>
        generateDrafts(input.ids, input.background, input.query, progress),
      ),
    );
    return json({ id }, 202);
  } catch (error) {
    return failure(error);
  }
}
