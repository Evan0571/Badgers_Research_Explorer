import { after } from "next/server";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { session, rateLimit } from "@/server/security";
import { batchInputSchema, freezeBatch, processBatch } from "@/server/delivery";
import { outlookSender } from "@/server/outlook-mailer";
import { configuredOutlookSender } from "@/server/outlook";
import { checkContactBeforeSending } from "@/server/contact-check";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const startBefore = Date.now() + 60_000;
  try {
    checkOrigin(request);
    const user = await session(false);
    const input = await jsonBody(request, batchInputSchema, 4 * 1024 * 1024);
    const sender = configuredOutlookSender(user);
    await rateLimit(`send:${user.id}`, 10, 3600000);
    await rateLimit("send:global", 100, 3600000);
    const batch = await freezeBatch(user, input, sender);
    if (!batch.existing)
      after(
        async () =>
          await processBatch(
            batch.id,
            outlookSender(user.id),
            checkContactBeforeSending,
            undefined,
            startBefore,
          ),
      );
    return json({ batchId: batch.id, existing: batch.existing }, 202);
  } catch (error) {
    return failure(error);
  }
}
