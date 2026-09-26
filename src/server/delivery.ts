import { randomUUID } from "node:crypto";
import { z } from "zod";
import { draftSchema } from "@/lib/contracts";
import { draftIssues, canEmail } from "@/lib/research";
import type { Draft, DeliveryState } from "@/lib/types";
import { db, transaction } from "./db";
import { digest, seal, unseal, type Session } from "./security";
import { verifiedIdentity } from "./verification";
import { storedResearcher } from "./discovery";
import { AppError } from "./http";

const attachmentSchema = z.object({
  id: z.string(),
  content: z.string().max(3_000_000),
});
export const batchInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  confirmed: z.literal(true),
  senderName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\r\n<>\x00-\x1f]+$/),
  drafts: z.array(draftSchema).min(1).max(6),
  attachments: z.array(attachmentSchema).max(12),
});
type BatchInput = z.infer<typeof batchInputSchema>;
export interface DeliveryRow {
  id: string;
  batch_id: string;
  session_id: string;
  account_id: string;
  sender: string;
  draft_id: string;
  snapshot: string;
  attachments: string;
  state: DeliveryState;
  attempt: number;
  error: string | null;
  provider_request_id: string | null;
  progress: string;
  created_at: number;
  updated_at: number;
}
export interface FrozenAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  sha256: string;
}
export type Submission =
  | { state: "accepted"; requestId: string }
  | { state: "failed" | "unknown"; error: string };
export type Sender = (message: {
  id: string;
  sender: string;
  replyTo: string;
  draft: Draft;
  attachments: FrozenAttachment[];
}) => Promise<Submission>;

export function freezeBatch(user: Session, input: BatchInput, sender: string) {
  const identity = verifiedIdentity(user);
  const fingerprint = digest(
    JSON.stringify({
      drafts: input.drafts,
      attachments: input.attachments,
      sender,
      accountId: identity.accountId,
    }),
  );
  return transaction(() => {
    const previous = db()
      .prepare(
        "SELECT id,fingerprint FROM batches WHERE session_id=? AND idempotency_key=?",
      )
      .get(user.id, input.idempotencyKey) as
      { id: string; fingerprint: string } | undefined;
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new AppError(
          "BATCH_CHANGED",
          "This confirmation already belongs to a different snapshot. Review the changed drafts again.",
          409,
        );
      return { id: previous.id, existing: true };
    }
    const recipients = new Set<string>();
    let totalBytes = 0;
    const snapshots = input.drafts.map((draft) => {
      const issues = draftIssues(draft);
      if (issues.length) throw new AppError("DRAFT_INVALID", issues.join(" "));
      const recipient = draft.to.trim().toLowerCase();
      if (!z.email().safeParse(recipient).success)
        throw new AppError(
          "RECIPIENT_INVALID",
          "Use one valid recipient email address.",
        );
      if (recipients.has(recipient))
        throw new AppError(
          "DUPLICATE_RECIPIENT",
          "Only one selected draft per recipient is allowed.",
        );
      recipients.add(recipient);
      const researcher = storedResearcher(draft.researcherId);
      if (!canEmail(researcher))
        throw new AppError(
          "CONTACT_ROUTE",
          "A selected researcher no longer has an eligible email contact route.",
          409,
        );
      if (
        !draft.recipientEdited &&
        researcher.contact.email?.toLowerCase() !== recipient
      )
        throw new AppError(
          "RECIPIENT_CHANGED",
          "A recipient differs from its source. Review and confirm the edited address.",
          409,
        );
      const duplicate = db()
        .prepare(
          "SELECT id FROM deliveries WHERE session_id=? AND account_id=? AND draft_id=? AND state IN ('queued','submitting','accepted','unknown')",
        )
        .get(user.id, identity.accountId, draft.id);
      if (duplicate)
        throw new AppError(
          "DRAFT_SUBMITTED",
          "This draft is already queued, submitted, or awaiting verification. Check contact history before submitting it again.",
          409,
        );
      const attachments: FrozenAttachment[] = (draft.attachments || []).map(
        (meta) => {
          const data = input.attachments.find((a) => a.id === meta.id);
          if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.content))
            throw new AppError(
              "ATTACHMENT_MISSING",
              "An attachment is missing. Reattach it and review again.",
            );
          const bytes = Buffer.from(data.content, "base64");
          if (
            bytes.length !== meta.size ||
            bytes.length > 2 * 1024 * 1024 ||
            bytes.toString("base64") !== data.content
          )
            throw new AppError(
              "ATTACHMENT_SIZE",
              "Attachments must match the preview and be no larger than 2 MB each.",
              413,
            );
          if (
            /[\r\n\0]/.test(meta.name) ||
            !/\.(pdf|docx|txt)$/i.test(meta.name)
          )
            throw new AppError(
              "ATTACHMENT_NAME",
              "Use a PDF, DOCX or TXT attachment with a valid filename.",
            );
          totalBytes += bytes.length;
          return {
            ...meta,
            content: data.content,
            sha256: digest(data.content),
          };
        },
      );
      return { draft: { ...draft, to: recipient }, attachments };
    });
    if (totalBytes > 6 * 1024 * 1024)
      throw new AppError(
        "BATCH_SIZE",
        "The selected batch has more than 6 MB of attachment data. Send a smaller batch.",
        413,
      );
    const id = randomUUID(),
      now = Date.now();
    db()
      .prepare(
        "INSERT INTO batches(id,session_id,account_id,idempotency_key,fingerprint,created_at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        id,
        user.id,
        identity.accountId,
        input.idempotencyKey,
        fingerprint,
        now,
      );
    for (const item of snapshots)
      db()
        .prepare(
          "INSERT INTO deliveries(id,batch_id,session_id,account_id,sender,draft_id,snapshot,attachments,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'queued',?,?)",
        )
        .run(
          randomUUID(),
          id,
          user.id,
          identity.accountId,
          sender,
          item.draft.id,
          seal(item.draft),
          seal(item.attachments),
          now,
          now,
        );
    return { id, existing: false };
  });
}
export async function processBatch(
  batchId: string,
  sender: Sender,
  preflight?: (draft: Draft) => Promise<void>,
  onlyId?: string,
) {
  const messages = db()
    .prepare(
      "SELECT * FROM deliveries WHERE batch_id=? AND state='queued' ORDER BY created_at,id",
    )
    .all(batchId) as unknown as DeliveryRow[];
  for (const message of messages) {
    if (onlyId && message.id !== onlyId) continue;
    if (preflight) {
      try {
        await preflight(unseal<Draft>(message.snapshot));
      } catch (error) {
        db()
          .prepare(
            "UPDATE deliveries SET state='failed',error=?,updated_at=? WHERE id=? AND state='queued'",
          )
          .run(
            error instanceof AppError
              ? error.message
              : "The contact source could not be rechecked. Nothing was submitted.",
            Date.now(),
            message.id,
          );
        continue;
      }
    }
    const user = db()
      .prepare("SELECT * FROM sessions WHERE id=? AND expires>?")
      .get(message.session_id, Date.now()) as unknown as Session | undefined;
    let email: string;
    try {
      if (!user) throw new Error("Expired session");
      const identity = verifiedIdentity(user);
      if (identity.accountId !== message.account_id)
        throw new Error("Account changed");
      email = identity.email;
    } catch {
      db()
        .prepare(
          "UPDATE deliveries SET state='cancelled',error='Email verification expired or the account changed. Review a new batch.',updated_at=? WHERE batch_id=? AND state='queued'",
        )
        .run(Date.now(), batchId);
      break;
    }
    // Only the worker that atomically claims this row may submit it.
    const claim = db()
      .prepare(
        "UPDATE deliveries SET state='submitting',attempt=attempt+1,updated_at=? WHERE id=? AND state='queued'",
      )
      .run(Date.now(), message.id);
    if (!claim.changes) continue;
    let result: Submission;
    try {
      result = await sender({
        id: `${message.id}-${message.attempt + 1}`,
        sender: message.sender,
        replyTo: email,
        draft: unseal<Draft>(message.snapshot),
        attachments: unseal<FrozenAttachment[]>(message.attachments),
      });
    } catch {
      result = {
        state: "unknown",
        error:
          "The connection ended without a confirmed response. Check with the email service before sending again.",
      };
    }
    db()
      .prepare(
        "UPDATE deliveries SET state=?,provider_request_id=?,error=?,updated_at=? WHERE id=? AND state='submitting'",
      )
      .run(
        result.state,
        result.state === "accepted" ? result.requestId : null,
        result.state === "accepted" ? null : result.error,
        Date.now(),
        message.id,
      );
    // Never automatically retry a submission, including a timeout.
  }
}
export function resumeDelivery(user: Session, id: string) {
  const identity = verifiedIdentity(user);
  return transaction(() => {
    const row = db()
      .prepare(
        "SELECT * FROM deliveries WHERE id=? AND session_id=? AND account_id=?",
      )
      .get(id, user.id, identity.accountId) as unknown as
      DeliveryRow | undefined;
    if (!row)
      throw new AppError(
        "NOT_FOUND",
        "This message does not belong to your account.",
        404,
      );
    if (!["queued", "failed"].includes(row.state))
      throw new AppError(
        "NO_RETRY",
        "Only a queued message or a confirmed rejection can be submitted. An uncertain submission must not be retried.",
        409,
      );
    const draft = unseal<Draft>(row.snapshot);
    if (!canEmail(storedResearcher(draft.researcherId)))
      throw new AppError(
        "CONTACT_ROUTE",
        "Check this researcher's current contact route before creating a new batch.",
        409,
      );
    db()
      .prepare(
        "UPDATE deliveries SET state='queued',error=NULL,updated_at=? WHERE id=? AND state='failed'",
      )
      .run(Date.now(), id);
    return row.batch_id;
  });
}
export function history(user: Session) {
  const identity = verifiedIdentity(user);
  db()
    .prepare(
      "UPDATE deliveries SET state='unknown',error='Submission was interrupted. Verify with the email service before trying again.',updated_at=? WHERE session_id=? AND account_id=? AND state='submitting' AND updated_at<?",
    )
    .run(Date.now(), user.id, identity.accountId, Date.now() - 120000);
  const rows = db()
    .prepare(
      "SELECT * FROM deliveries WHERE session_id=? AND account_id=? ORDER BY created_at DESC LIMIT 100",
    )
    .all(user.id, identity.accountId) as unknown as DeliveryRow[];
  return rows.map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    sender: row.sender,
    state: row.state,
    createdAt: new Date(row.created_at).toISOString(),
    draft: unseal<Draft>(row.snapshot),
    providerRequestId: row.provider_request_id,
    error: row.error,
    progress: row.progress,
  }));
}
