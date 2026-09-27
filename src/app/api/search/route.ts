import { after } from "next/server";
import { z } from "zod";
import { session, rateLimit } from "@/server/security";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { createJob, runJob } from "@/server/jobs";
import { searchCatalog } from "@/server/catalog-search";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session();
    await rateLimit(`search:${user.id}`, 12, 3600000);
    await rateLimit("search:global", 200, 3600000);
    const { query, expand, refresh } = await jsonBody(
      request,
      z.object({
        query: z.string().trim().min(2).max(3000),
        expand: z.boolean().default(false),
        refresh: z.boolean().default(false),
      }),
    );
    const id = await createJob(user.id, "search");
    after(
      async () =>
        await runJob(
          id,
          async (progress) =>
            await searchCatalog(query, progress, expand, refresh),
        ),
    );
    return json({ id }, 202);
  } catch (error) {
    return failure(error);
  }
}
