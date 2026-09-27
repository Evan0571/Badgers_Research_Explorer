import { z } from "zod";
import { session } from "@/server/security";
import { history } from "@/server/delivery";
import { verifiedIdentity } from "@/server/verification";
import { db } from "@/server/db";
import { checkOrigin, failure, json, jsonBody, AppError } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ records: await history(await session(false)) });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false),
      identity = verifiedIdentity(user);
    const input = await jsonBody(
      request,
      z.object({
        id: z.string().uuid(),
        action: z.enum(["cancel", "progress"]),
        progress: z.string().max(1000).optional(),
      }),
    );
    const row = await db()
      .prepare(
        "SELECT state FROM deliveries WHERE id=? AND session_id=? AND account_id=?",
      )
      .get(input.id, user.id, identity.accountId);
    if (!row)
      throw new AppError(
        "NOT_FOUND",
        "This message does not belong to the verified account.",
        404,
      );
    if (input.action === "cancel") {
      const change = await db()
        .prepare(
          "UPDATE deliveries SET state='cancelled',updated_at=? WHERE id=? AND state='queued'",
        )
        .run(Date.now(), input.id);
      if (!change.changes)
        throw new AppError(
          "ALREADY_SUBMITTED",
          "Only messages that have not begun submission can be cancelled.",
          409,
        );
    } else
      await db()
        .prepare("UPDATE deliveries SET progress=?,updated_at=? WHERE id=?")
        .run(input.progress || "", Date.now(), input.id);
    return json({ updated: true });
  } catch (error) {
    return failure(error);
  }
}
