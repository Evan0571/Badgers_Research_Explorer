"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Sparkle } from "@phosphor-icons/react";
import type { Draft } from "@/lib/types";
import { requestJSON } from "@/lib/api";
import { errorCopy } from "@/lib/error-copy";
import {
  captureDraftSnapshot,
  matchesDraftSnapshot,
  type DraftRevision,
} from "@/lib/draft-revisions";
import { Button, Textarea, Field, Notice } from "@/components/ui";
import { useLocale } from "../locale";
export function PolishDraft({
  draft,
  onApply,
}: {
  draft: Draft;
  onApply: (revision: DraftRevision) => void;
}) {
  const { t, locale } = useLocale();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<DraftRevision | null>(null);
  const [undo, setUndo] = useState<DraftRevision | null>(null);
  const request = useRef<AbortController | null>(null);
  const changed = !!proposal && !matchesDraftSnapshot(draft, proposal.base);
  const undoChanged = !!undo && !matchesDraftSnapshot(draft, undo.base);
  const pendingDetails = Object.values(draft.answers).some((v) => v.trim());
  useEffect(() => () => request.current?.abort(), []);
  async function polish() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const base = captureDraftSnapshot(draft);
    setBusy(true);
    setError("");
    setProposal(null);
    try {
      const patch = await requestJSON<Pick<Draft, "subject" | "body">>(
        "/api/drafts/polish",
        { draft, instruction: prompt },
        "POST",
        controller.signal,
      );
      if (!controller.signal.aborted) setProposal({ base, patch });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(
        e instanceof Error
          ? errorCopy(e.message, locale)
          : t(
              "Polishing failed. Your draft is unchanged.",
              "润色失败，原草稿保留。",
            ),
      );
    } finally {
      request.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="polish-panel" id="draft-polish">
      <div className="section-heading">
        <h2>
          <Sparkle size={23} /> {t("Refine with AI", "AI 润色")}
        </h2>
        <span>
          {t("Optional · review before applying", "可选 · 先预览，再应用")}
        </span>
      </div>
      {pendingDetails && (
        <Notice>
          {t(
            "Your personal details below are saved but not yet included in the message. Preview and apply those additions first if you want AI to refine them too.",
            "下方的个人细节已保存，但尚未加入邮件正文。如需一起润色，请先预览并应用这些细节。",
          )}
        </Notice>
      )}
      <Textarea
        id="polish-instruction"
        label={t("What would you like to change?", "想怎样调整这封邮件？")}
        rows={2}
        maxLength={2000}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t(
          "Make it shorter and more natural; keep my project details.",
          "例如：语气自然一点，缩短篇幅，保留我的项目经历。",
        )}
      />
      <div
        className="polish-suggestions"
        role="group"
        aria-labelledby="polish-suggestions-label"
      >
        <p id="polish-suggestions-label">
          {t(
            "Example instructions · click to fill in",
            "示例指令 · 点击填入，可继续修改",
          )}
        </p>
        <div className="polish-suggestion-list">
          {[
            ["Shorter and more concise", "更简洁"],
            ["Warmer but professional", "自然且专业"],
          ].map(([en, zh]) => (
            <Button
              key={en}
              variant="ghost"
              size="sm"
              className="polish-suggestion"
              onClick={() => setPrompt(t(en, zh))}
            >
              {t(en, zh)}
            </Button>
          ))}
        </div>
      </div>
      <div className="polish-actions">
        {undo && (
          <Button
            variant="ghost"
            size="sm"
            className="polish-restore"
            disabled={undoChanged || busy}
            onClick={() => {
              if (!matchesDraftSnapshot(draft, undo.base)) return;
              onApply(undo);
              setUndo(null);
              setProposal(null);
            }}
          >
            <ArrowCounterClockwise size={18} aria-hidden="true" />
            {t("Restore previous version", "恢复上次版本")}
          </Button>
        )}
        <Button
          className="polish-submit"
          disabled={!prompt.trim() || busy}
          onClick={polish}
        >
          {busy
            ? t("Refining…", "正在润色…")
            : t("Preview AI revision", "预览润色版本")}
        </Button>
      </div>
      {undoChanged && (
        <Notice>
          {t(
            "You have edited this draft since the last AI revision. Restore is unavailable so your newer changes are kept.",
            "上次润色后，草稿已有新的修改。为保留这些内容，暂不可恢复旧版本。",
          )}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {proposal && (
        <div className="polish-preview">
          <h3>{t("Suggested revision", "润色预览")}</h3>
          <Field
            id="polished-subject"
            label={t("Subject", "主题")}
            value={proposal.patch.subject}
            onChange={(e) =>
              setProposal({
                ...proposal,
                patch: { ...proposal.patch, subject: e.target.value },
              })
            }
          />
          <Textarea
            id="polished-body"
            label={t("Revised message", "润色正文")}
            rows={10}
            value={proposal.patch.body}
            onChange={(e) =>
              setProposal({
                ...proposal,
                patch: { ...proposal.patch, body: e.target.value },
              })
            }
          />
          {changed && (
            <Notice>
              {t(
                "This preview is based on an older draft. Your message or recipient has changed, so generate a new AI preview to keep those changes.",
                "此预览基于旧草稿。邮件内容或收件人已更改，请基于当前草稿重新生成 AI 预览，保留最新修改。",
              )}
            </Notice>
          )}
          <div className="row">
            <Button
              disabled={changed}
              onClick={() => {
                if (!matchesDraftSnapshot(draft, proposal.base)) return;
                setUndo({
                  base: captureDraftSnapshot({ ...draft, ...proposal.patch }),
                  patch: { subject: draft.subject, body: draft.body },
                });
                onApply(proposal);
                setProposal(null);
              }}
            >
              {t("Apply to this draft", "应用到此草稿")}
            </Button>
            <Button variant="ghost" onClick={() => setProposal(null)}>
              {t("Keep original", "保留原稿")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
