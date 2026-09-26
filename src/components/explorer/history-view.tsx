"use client";
import { useEffect, useRef, useState } from "react";
import { ClockCounterClockwise, ArrowRight } from "@phosphor-icons/react";
import {
  EmptyState,
  LinkButton,
  Notice,
  Button,
  Badge,
  Textarea,
  Dialog,
} from "@/components/ui";
import { EmailVerification, type EmailIdentity } from "./email-verification";
import { requestJSON } from "@/lib/api";
import type { DeliverySnapshot } from "@/lib/types";

type DeliveryRecord = DeliverySnapshot & { error?: string; progress: string };
const labels = {
  queued: "Queued",
  submitting: "Submitting",
  accepted: "Accepted by email service",
  failed: "Submission failed",
  unknown: "Status needs verification",
  cancelled: "Cancelled",
};
export function HistoryView() {
  const [identity, setIdentity] = useState<EmailIdentity | null>(null);
  const [records, setRecords] = useState<DeliveryRecord[]>([]),
    [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState<DeliveryRecord | null>(null);
  const epoch = useRef(0);
  const refresh = async () => {
    const token = epoch.current;
    setLoading(true);
    setError("");
    try {
      const result = await requestJSON<{ records: DeliveryRecord[] }>(
        "/api/mail/history",
      );
      if (token === epoch.current) setRecords(result.records);
    } catch (e) {
      if (token === epoch.current)
        setError(
          e instanceof Error ? e.message : "History could not be loaded.",
        );
    } finally {
      if (token === epoch.current) setLoading(false);
    }
  };
  useEffect(() => {
    epoch.current++;
    setNotes({});
    setRecords([]);
    setRetry(null);
    if (identity?.verified) void refresh();
    return () => {
      epoch.current++;
    };
  }, [identity?.email, identity?.verified]);
  useEffect(() => {
    if (!records.some((r) => r.state === "queued" || r.state === "submitting"))
      return;
    const timer = setTimeout(() => void refresh(), 3000);
    return () => clearTimeout(timer);
  }, [records]);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Keep the next step clear</p>
        <h1>Your contact history.</h1>
        <p>
          A record of each individual message, with its original content and an
          honest status.
        </p>
      </div>
      <EmailVerification onChange={setIdentity} />
      {error && <Notice tone="error">{error}</Notice>}
      <Notice>
        “Accepted” means the email service accepted the request. It does not
        mean delivered, read, or replied. Reply progress below is recorded by
        you.
      </Notice>
      {identity?.verified && (
        <Button
          variant="ghost"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Loading history…" : "Refresh history"}
        </Button>
      )}
      {!records.length ? (
        <EmptyState
          icon={<ClockCounterClockwise size={35} />}
          title="No submissions in this account."
          action={
            <LinkButton href="/explore/mail" variant="secondary">
              Open email workspace <ArrowRight size={17} />
            </LinkButton>
          }
        >
          Drafts and exports do not create sending records. Verify your UW email
          to view submissions for this browser and account.
        </EmptyState>
      ) : (
        records.map((record) => (
          <details key={record.id} className="preview-message">
            <summary>
              <strong>{record.draft.to}</strong>
              <Badge
                tone={
                  record.state === "failed" || record.state === "unknown"
                    ? "negative"
                    : "neutral"
                }
              >
                {labels[record.state]}
              </Badge>
            </summary>
            <p className="small muted">
              {new Date(record.createdAt).toLocaleString()} · From:{" "}
              {record.sender}
              <br />
              Replies to: {identity?.email}
            </p>
            <p>
              <strong>{record.draft.subject}</strong>
            </p>
            <pre>{record.draft.body}</pre>
            <p className="small">
              Attachments:{" "}
              {record.draft.attachments?.map((a) => a.name).join(", ") ||
                "None"}
            </p>
            {record.error && <Notice tone="error">{record.error}</Notice>}
            <p className="small muted">
              Submission reference: {record.id}
              {record.providerRequestId && (
                <> · Service reference: {record.providerRequestId}</>
              )}
            </p>
            {record.state === "queued" && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await requestJSON(
                      "/api/mail/history",
                      { id: record.id, action: "cancel" },
                      "PATCH",
                    );
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Cancel queued message
              </Button>
            )}
            {(record.state === "queued" || record.state === "failed") && (
              <Button variant="secondary" onClick={() => setRetry(record)}>
                {record.state === "failed"
                  ? "Review retry"
                  : "Review and resume"}
              </Button>
            )}
            <Textarea
              id={`progress-${record.id}`}
              label="Your own progress note"
              hint="Manual note only. This does not change the email service's submission status."
              value={notes[record.id] ?? record.progress}
              maxLength={1000}
              onChange={(e) =>
                setNotes((n) => ({ ...n, [record.id]: e.target.value }))
              }
            />
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await requestJSON(
                    "/api/mail/history",
                    {
                      id: record.id,
                      action: "progress",
                      progress: notes[record.id] ?? record.progress,
                    },
                    "PATCH",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Save note
            </Button>
          </details>
        ))
      )}
      <Dialog
        open={!!retry}
        onOpenChange={(open) => !open && !busy && setRetry(null)}
        title="Review this submission"
        description="Only this saved message will be submitted. Changes made later in your draft are not included."
      >
        {retry && (
          <div className="preview-body">
            <p>
              From: {retry.sender}
              <br />
              To: {retry.draft.to}
              <br />
              Subject: {retry.draft.subject}
            </p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{retry.draft.body}</pre>
            <p>
              Attachments:{" "}
              {retry.draft.attachments?.map((a) => a.name).join(", ") || "None"}
            </p>
            <div className="preview-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setRetry(null)}
              >
                Go back
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await requestJSON("/api/mail/retry", {
                      id: retry.id,
                      confirmed: true,
                    });
                    setRetry(null);
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                    setRetry(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Submitting…" : "Submit this message"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
