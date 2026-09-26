import { resolve } from "node:path";

export const config = () => ({
  origin: (process.env.APP_ORIGIN || "http://127.0.0.1:3002").replace(
    /\/$/,
    "",
  ),
  database: resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
      ".data/research.sqlite",
  ),
  model: process.env.OPENAI_MODEL || "gpt-5.5",
  apiKey: process.env.OPENAI_API_KEY || "",
  encryptionKey: process.env.APP_ENCRYPTION_KEY || "",
  mailTransport: process.env.MAIL_TRANSPORT || "",
  mailFrom: process.env.MAIL_FROM || "",
  resendKey: process.env.RESEND_API_KEY || "",
  verificationFrom: process.env.VERIFICATION_FROM || "",
});
export function integrationStatus() {
  const c = config();
  return {
    discovery: !!c.apiKey,
    generation: !!c.apiKey,
    verification: !!(
      c.resendKey &&
      c.verificationFrom &&
      /^[a-f0-9]{64}$/i.test(c.encryptionKey)
    ),
    sending: !!(
      c.apiKey &&
      c.mailTransport === "resend" &&
      c.resendKey &&
      /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(c.mailFrom) &&
      /^[a-f0-9]{64}$/i.test(c.encryptionKey)
    ),
  };
}
