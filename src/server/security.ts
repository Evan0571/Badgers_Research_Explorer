import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, transaction } from "./db";
import { config } from "./config";
import { AppError } from "./http";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export interface Session {
  id: string;
  expires: number;
  verified_email: string | null;
  verified_at: number | null;
  account_id: string | null;
  email: string | null;
  tokens: string | null;
  oauth: string | null;
}
export async function session(create = true): Promise<Session> {
  const jar = await cookies();
  const raw = jar.get("research_session")?.value;
  const current =
    raw &&
    ((await db()
      .prepare("SELECT * FROM sessions WHERE id=? AND expires>?")
      .get(digest(raw), Date.now())) as unknown as Session | undefined);
  if (current) return current;
  if (!create)
    throw new AppError(
      "SESSION",
      "Your session expired. Reload the page to continue.",
      401,
    );
  const token = randomBytes(32).toString("base64url");
  const id = digest(token),
    expires = Date.now() + 30 * 86400_000;
  await db()
    .prepare("INSERT INTO sessions(id,expires) VALUES(?,?)")
    .run(id, expires);
  jar.set("research_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config().origin.startsWith("https:"),
    path: "/",
    maxAge: 30 * 86400,
  });
  return (await db()
    .prepare("SELECT * FROM sessions WHERE id=?")
    .get(id)) as unknown as Session;
}
export async function rateLimit(key: string, max: number, periodMs: number) {
  await transaction(async () => {
    const now = Date.now();
    const current = (await db()
      .prepare("SELECT started,count FROM limits WHERE key=?")
      .get(key)) as { started: number; count: number } | undefined;
    if (current && current.started + periodMs > now && current.count >= max)
      throw new AppError(
        "RATE_LIMIT",
        `Too many requests. Try again in ${Math.ceil((current.started + periodMs - now) / 60000)} minutes. You can still browse the catalog and use saved results.`,
        429,
      );
    await db()
      .prepare(
        "INSERT INTO limits(key,started,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET started=excluded.started,count=?",
      )
      .run(
        key,
        current && current.started + periodMs > now ? current.started : now,
        current && current.started + periodMs > now ? current.count + 1 : 1,
      );
  });
}
function encryptionKey() {
  const value = config().encryptionKey;
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new AppError(
      "ENCRYPTION_CONFIG",
      "Mailbox storage is not configured on this server.",
      503,
    );
  return Buffer.from(value, "hex");
}
export function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const bytes = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), bytes]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function unseal<T>(value: string): T {
  const [iv, tag, bytes] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(bytes), cipher.final()]).toString("utf8"),
  );
}
export const codeDigest = (sessionId: string, email: string, code: string) =>
  createHmac("sha256", encryptionKey())
    .update(`${sessionId}:${email}:${code}`)
    .digest("hex");
export { isUWEmail } from "@/lib/uw-email";
