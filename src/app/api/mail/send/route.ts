import { after } from "next/server";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { session, rateLimit } from "@/server/security";
import { batchInputSchema, freezeBatch, processBatch } from "@/server/delivery";
import { configuredSender, sendWithResend } from "@/server/mailer";
import { checkContactBeforeSending } from "@/server/contact-check";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false);
    const input = await jsonBody(request, batchInputSchema, 10 * 1024 * 1024);
    const sender = configuredSender(input.senderName);
    rateLimit(`send:${user.id}`, 10, 3600000);
    rateLimit("send:global", 100, 3600000);
    const batch = freezeBatch(user, input, sender);
    if (!batch.existing)
      after(() =>
        processBatch(batch.id, sendWithResend, checkContactBeforeSending),
      );
    return json({ batchId: batch.id, existing: batch.existing }, 202);
  } catch (error) {
    return failure(error);
  }
}
