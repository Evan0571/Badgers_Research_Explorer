import { after } from "next/server";
import { z } from "zod";
import { session, rateLimit } from "@/server/security";
import { checkOrigin, failure, json, jsonBody, AppError } from "@/server/http";
import { integrationStatus } from "@/server/config";
import { createJob, runJob } from "@/server/jobs";
import { discover } from "@/server/discovery";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!integrationStatus().discovery)
      throw new AppError(
        "AI_NOT_CONFIGURED",
        "Live search is not configured yet. Add OPENAI_API_KEY to the server's .env.local and restart it.",
        503,
      );
    const user = await session();
    rateLimit(`search:${user.id}`, 12, 3600000);
    rateLimit("search:global", 200, 3600000);
    const { query } = await jsonBody(
      request,
      z.object({ query: z.string().trim().min(2).max(3000) }),
    );
    const id = createJob(user.id, "search");
    after(() => runJob(id, (progress) => discover(query, progress)));
    return json({ id }, 202);
  } catch (error) {
    return failure(error);
  }
}
