import { config, integrationStatus } from "./config";
import type { Sender } from "./delivery";
import { AppError } from "./http";

export function configuredSender(name: string) {
  if (!integrationStatus().sending)
    throw new AppError(
      "MAIL_CONFIG",
      "Outbound mail is not configured. Your drafts have not been submitted.",
      503,
    );
  const displayName = name.replace(/["\\]/g, "").trim();
  return `"${displayName} via Research Explorer" <${config().mailFrom}>`;
}

// Optional platform transport. Disabled until MAIL_TRANSPORT and MAIL_FROM are configured.
export const sendWithResend: Sender = async (message) => {
  if (!integrationStatus().sending)
    return {
      state: "failed",
      error:
        "Outbound mail configuration is unavailable. Nothing was submitted.",
    };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config().resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `research-${message.id}`,
      },
      body: JSON.stringify({
        from: message.sender,
        to: [message.draft.to],
        reply_to: message.replyTo,
        subject: message.draft.subject,
        text: message.draft.body,
        attachments: message.attachments.map((a) => ({
          filename: a.name,
          content: a.content,
        })),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) {
      const data = await response.json();
      if (typeof data.id === "string" && data.id)
        return { state: "accepted", requestId: data.id };
    } else if ([400, 401, 403, 404, 413, 422, 429].includes(response.status)) {
      return {
        state: "failed",
        error: `The email service rejected this request (HTTP ${response.status}). Review the configuration and message before explicitly retrying.`,
      };
    }
    return {
      state: "unknown",
      error:
        "The email service did not provide a confirmed acceptance or rejection. Check the service dashboard before sending again.",
    };
  } catch {
    return {
      state: "unknown",
      error:
        "The submission timed out or the connection was interrupted. It may have been accepted. Check the service dashboard; do not resend blindly.",
    };
  }
};
