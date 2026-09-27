"use client";
import { useLocale } from "../locale";
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
import { useEmailIdentity } from "./use-email-identity";
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
  const { t, locale } = useLocale();
  const {
    identity,
    loading: identityLoading,
    error: identityError,
  } = useEmailIdentity();
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
    setLoading(false);
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
        <p className="eyebrow">
          {t("Keep the next step clear", "记录每一次联系")}
        </p>
        <h1>{t("Your contact history.", "你的联系记录。")}</h1>
        <p>
          {t(
            "A record of each individual message, with its original content and an honest status.",
            "逐封保留原始邮件内容及其真实提交状态。",
          )}
        </p>
      </div>
      {identityError && <Notice tone="error">{identityError}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {identity?.verified && (
        <Notice>
          {t(
            "“Accepted” means the email service accepted the request. It does not mean delivered, read, or replied. Reply progress below is recorded by you.",
            "“已接受”表示邮件服务已接受发送请求，不代表邮件已送达、已读或已回复。下方的回复进度由你手动记录。",
          )}
        </Notice>
      )}
      {identity?.verified && (
        <Button
          variant="ghost"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading
            ? t("Loading history…", "正在加载记录…")
            : t("Refresh history", "刷新记录")}
        </Button>
      )}
      {identityLoading && !identity ? (
        <p role="status">
          {t("Loading contact history…", "正在加载联系记录…")}
        </p>
      ) : !identity?.verified ? (
        <EmptyState
          icon={<ClockCounterClockwise size={35} />}
          title={t(
            "Verify your email to view contact history.",
            "验证邮箱后查看联系记录。",
          )}
          action={
            <LinkButton href="/explore/settings" variant="secondary">
              {t("Open settings", "前往设置")} <ArrowRight size={17} />
            </LinkButton>
          }
        >
          {t(
            "Your past submissions are linked to your verified UW email. Manage verification in Settings.",
            "历史联系记录与你验证的 UW 邮箱关联。请前往设置完成验证。",
          )}
        </EmptyState>
      ) : loading && !records.length ? (
        <p role="status">
          {t("Loading contact history…", "正在加载联系记录…")}
        </p>
      ) : !records.length ? (
        <EmptyState
          icon={<ClockCounterClockwise size={35} />}
          title={t("No submissions in this account.", "此账户暂无发送记录。")}
          action={
            <LinkButton href="/explore/mail" variant="secondary">
              {t("Open email workspace", "前往邮件草稿")}{" "}
              <ArrowRight size={17} />
            </LinkButton>
          }
        >
          {t(
            "Submitted emails and their statuses will appear here. Drafts and exports do not create sending records.",
            "已提交的邮件及其状态会显示在这里。保存或导出草稿不会产生发送记录。",
          )}
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
                disabled={
                  busy ||
                  identityLoading ||
                  !identity?.verified ||
                  !identity?.outlook?.connected
                }
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
            {!identityLoading && !identity?.outlook?.connected && (
              <Notice>
                {t(
                  "Connect Outlook in Settings before resubmitting this message.",
                  "重新提交邮件前，请在设置中连接 Outlook。",
                )}{" "}
                <LinkButton href="/explore/settings" variant="ghost">
                  {t("Open settings", "前往设置")}
                </LinkButton>
              </Notice>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
