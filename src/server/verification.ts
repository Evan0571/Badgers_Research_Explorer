import { randomInt, timingSafeEqual } from "node:crypto";
import { BRAND_NAME } from "@/lib/brand";
import { config, integrationStatus } from "./config";
import { db, transaction } from "./db";
import { AppError } from "./http";
import {
  codeDigest,
  digest,
  isUWEmail,
  rateLimit,
  type Session,
} from "./security";

export async function requestCode(user: Session, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!isUWEmail(email))
    throw new AppError(
      "UW_EMAIL",
      "Use your UW-Madison email address ending in wisc.edu.",
    );
  if (!integrationStatus().verification)
    throw new AppError(
      "VERIFICATION_CONFIG",
      "Email verification is not configured on this server yet.",
      503,
    );
  await rateLimit(`code:session:${user.id}`, 5, 3600000);
  await rateLimit(`code:email:${digest(email)}`, 5, 3600000);
  await rateLimit(`code:cooldown:${user.id}`, 1, 60000);
  await rateLimit("code:global", 100, 3600000);
  const code = String(randomInt(100000, 1000000));
  const challengeDigest = codeDigest(user.id, email, code);
  await db()
    .prepare(
      "INSERT INTO challenges(session_id,email,digest,expires,attempts) VALUES(?,?,?,?,0) ON CONFLICT(session_id) DO UPDATE SET email=excluded.email,digest=excluded.digest,expires=excluded.expires,attempts=0",
    )
    .run(user.id, email, challengeDigest, Date.now() + 10 * 60000);
  const c = config();
  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `verification-${challengeDigest}`,
      },
      body: JSON.stringify({
        from: c.verificationFrom,
        to: [email],
        subject: `Your ${BRAND_NAME} verification code`,
        text: `Your verification code is ${code}.\n\nIt expires in 10 minutes. This verifies ownership of your UW email; it does not grant access to your school mailbox.\n\nIf you did not request this code, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!sent.ok) throw new Error("Email rejected");
  } catch {
    await db()
      .prepare("DELETE FROM challenges WHERE session_id=? AND digest=?")
      .run(user.id, challengeDigest);
    throw new AppError(
      "CODE_SEND",
      "The verification email could not be confirmed. Wait a minute and request a new code.",
      502,
    );
  }
  return { sent: true, expiresIn: 600 };
}
export async function verifyCode(user: Session, code: string) {
  return await transaction(async () => {
    const challenge = (await db()
      .prepare("SELECT * FROM challenges WHERE session_id=?")
      .get(user.id)) as
      | { email: string; digest: string; expires: number; attempts: number }
      | undefined;
    if (!challenge || challenge.expires < Date.now() || challenge.attempts >= 5)
      throw new AppError(
        "CODE_EXPIRED",
        "This code expired or reached its attempt limit. Request a new code.",
      );
    const actual = Buffer.from(
        codeDigest(user.id, challenge.email, code),
        "hex",
      ),
      expected = Buffer.from(challenge.digest, "hex");
    if (!timingSafeEqual(actual, expected)) {
      // Return instead of throwing so the failed attempt is committed.
      await db()
        .prepare("UPDATE challenges SET attempts=attempts+1 WHERE session_id=?")
        .run(user.id);
      return { verified: false as const };
    }
    await db()
      .prepare(
        "UPDATE sessions SET verified_email=?,verified_at=?,email=?,account_id=?,tokens=NULL,oauth=NULL WHERE id=?",
      )
      .run(
        challenge.email,
        Date.now(),
        challenge.email,
        digest(challenge.email),
        user.id,
      );
    await db()
      .prepare("DELETE FROM challenges WHERE session_id=?")
      .run(user.id);
    return { verified: true as const, email: challenge.email };
  });
}
export function verifiedIdentity(user: Session) {
  if (
    !user.verified_email ||
    !user.verified_at ||
    user.verified_at < Date.now() - 86400_000 ||
    !user.account_id
  )
    throw new AppError(
      "VERIFY_REQUIRED",
      "Verify your UW email before sending. Verification lasts 24 hours.",
      401,
    );
  return { email: user.verified_email, accountId: user.account_id };
}
