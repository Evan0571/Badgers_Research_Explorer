import { after } from "next/server";
import { z } from "zod";
import { checkOrigin, failure, json, jsonBody, AppError } from "@/server/http";
import { session, rateLimit } from "@/server/security";
import { processBatch, resumeDelivery } from "@/server/delivery";
import { sendWithResend } from "@/server/mailer";
import { integrationStatus } from "@/server/config";
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
    if (!integrationStatus().sending)
      throw new AppError(
        "MAIL_CONFIG",
        "Outbound mail is not configured.",
        503,
      );
    rateLimit(`retry:${user.id}`, 10, 3600000);
    const batchId = resumeDelivery(user, input.id);
    after(() =>
      processBatch(
        batchId,
        sendWithResend,
        checkContactBeforeSending,
        input.id,
      ),
    );
    return json({ batchId }, 202);
  } catch (error) {
    return failure(error);
  }
}
