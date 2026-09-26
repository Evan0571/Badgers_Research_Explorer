import { z } from "zod";
import { analyzeResume } from "@/server/generation";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { session, rateLimit } from "@/server/security";
export const runtime = "nodejs";
export const maxDuration = 150;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session();
    rateLimit(`resume:${user.id}`, 10, 3600000);
    const { text } = await jsonBody(
      request,
      z.object({ text: z.string().min(20).max(50000) }),
      250000,
    );
    return json(await analyzeResume(text));
  } catch (error) {
    return failure(error);
  }
}
