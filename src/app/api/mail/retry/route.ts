import { after } from "next/server";
import { z } from "zod";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
import { session, rateLimit } from "@/server/security";
import { processBatch, resumeDelivery } from "@/server/delivery";
import { outlookSender } from "@/server/outlook-mailer";
import { configuredOutlookSender } from "@/server/outlook";
import { checkContactBeforeSending } from "@/server/contact-check";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false);
    const input = await jsonBody(
      request,
      z.object({ id: z.string().uuid(), confirmed: z.literal(true) }),
    );
    configuredOutlookSender(user);
    await rateLimit(`retry:${user.id}`, 10, 3600000);
    const batchId = await resumeDelivery(user, input.id);
    after(
      async () =>
        await processBatch(
          batchId,
          outlookSender(user.id),
          checkContactBeforeSending,
          input.id,
        ),
    );
    return json({ batchId }, 202);
  } catch (error) {
    return failure(error);
  }
}
