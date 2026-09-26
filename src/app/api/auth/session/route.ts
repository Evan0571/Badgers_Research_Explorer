import { session } from "@/server/security";
import { integrationStatus } from "@/server/config";
import { db } from "@/server/db";
import { checkOrigin, failure, json } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await session();
    const verified = !!(
      user.verified_email &&
      user.verified_at &&
      user.verified_at > Date.now() - 86400_000
    );
    return json({
      verified,
      email: verified ? user.verified_email : null,
      verificationAvailable: integrationStatus().verification,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false);
    db()
      .prepare(
        "UPDATE sessions SET verified_email=NULL,verified_at=NULL,email=NULL,account_id=NULL,tokens=NULL,oauth=NULL WHERE id=?",
      )
      .run(user.id);
    db().prepare("DELETE FROM challenges WHERE session_id=?").run(user.id);
    db()
      .prepare(
        "UPDATE deliveries SET state='cancelled',updated_at=? WHERE session_id=? AND state='queued'",
      )
      .run(Date.now(), user.id);
    return json({ signedOut: true });
  } catch (error) {
    return failure(error);
  }
}
