import { randomUUID } from "node:crypto";
import type { Sender } from "./delivery";
import { AppError } from "./http";
import {
  assertOutlookConnection,
  currentSession,
  disconnectOutlook,
  outlookAccess,
} from "./outlook";

export function outlookSender(sessionId: string): Sender {
  return async (message) => {
    if (message.sender !== message.replyTo)
      return {
        state: "failed",
        error:
          "This snapshot uses a different sender. Review a new batch from your connected Outlook mailbox.",
      };
    let auth: Awaited<ReturnType<typeof outlookAccess>>;
    try {
      auth = await outlookAccess(sessionId, message.sender);
      await assertOutlookConnection(
        sessionId,
        message.sender,
        auth.connectionId,
      );
    } catch (error) {
      return {
        state: "failed",
        error:
          error instanceof AppError
            ? error.message
            : "Outlook authorization could not be checked. Nothing was submitted.",
      };
    }
    const reference = randomUUID();
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
            "client-request-id": reference,
            "return-client-request-id": "true",
          },
          body: JSON.stringify({
            message: {
              subject: message.draft.subject,
              body: { contentType: "Text", content: message.draft.body },
              toRecipients: [{ emailAddress: { address: message.draft.to } }],
              attachments: message.attachments.map((a) => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: a.name,
                contentType: a.type || "application/octet-stream",
                contentBytes: a.content,
              })),
            },
            // /me determines the real sender. Never accept a client-provided From.
            saveToSentItems: true,
          }),
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        },
      );
      if (response.status === 202)
        return {
          state: "accepted",
          requestId: response.headers.get("request-id") || reference,
        };
      if ([400, 401, 403, 404, 413, 422, 429].includes(response.status)) {
        if (response.status === 401)
          await disconnectOutlook(await currentSession(sessionId), auth.tokens);
        return {
          state: "failed",
          error:
            response.status === 401 || response.status === 403
              ? "Microsoft rejected the mailbox authorization. Reconnect Outlook; your school may require administrator approval."
              : `Microsoft rejected this message (HTTP ${response.status}). Review it before explicitly retrying.`,
        };
      }
      return {
        state: "unknown",
        error:
          "Microsoft did not confirm whether this message was accepted. Check Outlook Sent Items before taking any further action.",
      };
    } catch {
      // Graph's client-request-id is diagnostic, not an idempotency guarantee.
      // Do not retry a request after a network error or ambiguous response.
      return {
        state: "unknown",
        error:
          "The connection ended without a confirmed result. Check Outlook Sent Items; this message may already have been sent. Do not resend it automatically.",
      };
    }
  };
}
