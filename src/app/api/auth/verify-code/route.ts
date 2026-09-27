import { z } from "zod";
import { verifyCode } from "@/server/verification";
import { session, rateLimit } from "@/server/security";
import { checkOrigin, failure, json, jsonBody, AppError } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false);
    await rateLimit(`verify:${user.id}`, 30, 3600000);
    const input = await jsonBody(
      request,
      z.object({ code: z.string().regex(/^\d{6}$/) }),
    );
    const result = await verifyCode(user, input.code);
    if (!result.verified)
      throw new AppError(
        "CODE_INVALID",
        "The code does not match. Check it and try again.",
      );
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
