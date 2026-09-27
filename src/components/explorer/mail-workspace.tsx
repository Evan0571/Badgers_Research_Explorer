"use client";
import { useEffect, useRef, useState } from "react";
import { get, set, del } from "idb-keyval";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  DownloadSimple,
  EnvelopeSimple,
  Paperclip,
  PencilSimple,
  Trash,
  X,
  Check,
  Copy,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { PolishDraft } from "./polish-draft";
import { useLocale } from "../locale";
import { errorCopy } from "@/lib/error-copy";
import { researcherById } from "@/lib/catalog";
import { draftIssues, normalizeRecipients } from "@/lib/research";
import {
  applyDraftRevision,
  matchesDraftSnapshot,
  previewPersonalDetails,
  type DraftRevision,
} from "@/lib/draft-revisions";
import type { Draft } from "@/lib/types";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  LinkButton,
  Notice,
  Textarea,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useEmailIdentity } from "./use-email-identity";
import { useMailSubmission } from "./use-mail-submission";

export function MailWorkspace() {
  const { workspace: w, setWorkspace, notify } = useWorkspace();
  const { t, locale } = useLocale();
  const router = useRouter();
  const {
    identity,
    loading: identityLoading,
    error: identityError,
  } = useEmailIdentity();
  const submission = useMailSubmission(identity?.outlook.connected);
  const [activeId, setActiveId] = useState(w.drafts[0]?.id || "");
  const [preview, setPreview] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [personalPreview, setPersonalPreview] = useState<DraftRevision | null>(
    null,
  );
  const [fileError, setFileError] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = w.drafts.find((d) => d.id === activeId) || w.drafts[0];
  const personalPreviewChanged =
    !!personalPreview && !matchesDraftSnapshot(current, personalPreview.base);
  const researcher = current && researcherById(w, current.researcherId);
  const selected = w.drafts.filter(
    (d) =>
      w.selectedDrafts.includes(d.id) &&
      !draftIssues(d).length &&
      !(d.attachments || []).some((a) => missing.includes(a.id)),
  );
  const unique = normalizeRecipients(selected);
  const update = (patch: Partial<Draft>, id = current?.id) =>
    setWorkspace((p) => ({
      ...p,
      drafts: p.drafts.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
  const applyRevision = (revision: DraftRevision) =>
    setWorkspace((p) => {
      const drafts = applyDraftRevision(p.drafts, revision);
      return drafts === p.drafts ? p : { ...p, drafts };
    });
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      w.drafts
        .flatMap((d) => d.attachments || [])
        .map(async (a) => {
          try {
            return (await get(`research-attachment:${a.id}`)) ? null : a.id;
          } catch {
            return a.id;
          }
        }),
    ).then((ids) => {
      if (!cancelled) setMissing(ids.filter((id): id is string => !!id));
    });
    return () => {
      cancelled = true;
    };
  }, [w.drafts]);
  const attach = async (file?: File) => {
    if (!file || !current) return;
    const target = current.id;
    setFileError("");
    if (file.size > 2 * 1024 * 1024) {
      setFileError("Attachments must be no larger than 2 MB each.");
      return;
    }
    if (
      (current.attachments || []).reduce((n, a) => n + a.size, file.size) >
      2 * 1024 * 1024
    ) {
      setFileError(
        "Keep attachments within 2 MB total per message for Outlook sending.",
      );
      return;
    }
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setFileError("Choose a PDF, DOCX, or TXT attachment.");
      return;
    }
    if ((current.attachments?.length || 0) >= 3) {
      setFileError("Keep up to three attachments per draft.");
      return;
    }
    setAttaching(true);
    const attachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    };
    try {
      await set(`research-attachment:${attachment.id}`, file);
      setWorkspace((p) => ({
        ...p,
        drafts: p.drafts.map((d) =>
          d.id === target
            ? {
                ...d,
                attachments: [...(d.attachments || []), attachment],
                updatedAt: new Date().toISOString(),
              }
            : d,
        ),
      }));
      notify("Attachment added to this draft only.");
    } catch {
      setFileError(
        "The attachment could not be saved in this browser. It has not been added.",
      );
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const removeAttachment = async (id: string) => {
    try {
      await del(`research-attachment:${id}`);
      update({ attachments: current.attachments?.filter((a) => a.id !== id) });
      notify(
        "Attachment removed. Check the body for references to attached files.",
      );
    } catch {
      setFileError("Could not remove the stored attachment. Please try again.");
    }
  };
  const exportDrafts = (drafts: Draft[]) => {
    const blob = new Blob(
      [
        drafts
          .map(
            (d) =>
              `To: ${d.to}\nSubject: ${d.subject}\n\n${d.body}\n\nAttachments (not included in this text export): ${(d.attachments || []).map((a) => a.name).join(", ") || "None"}\n\n${"=".repeat(60)}`,
          )
          .join("\n\n"),
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-email-drafts.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Draft text exported. Nothing was sent.");
  };
  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(
        `To: ${current.to}\nSubject: ${current.subject}\n\n${current.body}`,
      );
      notify("Copied this draft. Nothing was sent.");
    } catch {
      notify("Clipboard is unavailable. Use Export text instead.");
    }
  };
  const openPreview = () => {
    if (!w.selectedDrafts.length)
      setWorkspace((p) => ({
        ...p,
        selectedDrafts: p.drafts
          .filter((d) => !draftIssues(d).length)
          .map((d) => d.id),
      }));
    setPreview(true);
  };
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">
          {t("Thoughtful introductions start here", "从一封真诚的邮件开始")}
        </p>
        <h1>{t("Make the first hello yours.", "写出属于你的第一封邮件。")}</h1>
        <p>
          {t(
            "One researcher, one email. Begin with a draft, add what is true for you, then review everything together.",
            "每位教授一封独立邮件。先准备草稿，补充真实经历，再逐封核对。",
          )}
        </p>
      </div>
      {identityError && (
        <Notice tone="error">
          {identityError}{" "}
          <LinkButton href="/explore/settings" variant="ghost">
            {t("Open settings", "前往设置")}
          </LinkButton>
        </Notice>
      )}
      {!identityLoading &&
        identity &&
        (!identity.verified || !identity.outlook.connected) && (
          <Notice>
            {t(
              "Complete your email setup in Settings before sending. You can keep editing your drafts.",
              "发送前请在设置中完成邮箱配置。你仍可继续编辑草稿。",
            )}{" "}
            <LinkButton href="/explore/settings" variant="ghost">
              {t("Open settings", "前往设置")}
            </LinkButton>
          </Notice>
        )}
      {!current ? (
        <EmptyState
          icon={<EnvelopeSimple size={35} />}
          title={t("A blank page, with a little help.", "从一封草稿开始。")}
          action={
            <LinkButton href="/explore/saved">
              {t("Choose from your shortlist", "从收藏的教授中选择")}{" "}
              <ArrowRight size={17} />
            </LinkButton>
          }
        >
          {t(
            "Prepare drafts from a researcher’s details or select email-eligible researchers in your shortlist.",
            "在教授详情中准备草稿，或在收藏列表中选择可邮件联系的教授。",
          )}
        </EmptyState>
      ) : (
        <>
          {current.generation === "local-template" && (
            <Notice>
              {t(
                "Basic template · AI was unavailable. Add your specific research interest and review this message before sending.",
                "基础邮件模板 · AI 暂不可用。请补充具体研究兴趣，核对后再发送。",
              )}
            </Notice>
          )}
          <div className="selection-toolbar">
            <div className="row wrap">
              <Badge>
                {w.drafts.length}{" "}
                {t(
                  w.drafts.length === 1
                    ? "individual draft"
                    : "individual drafts",
                  "封独立草稿",
                )}
              </Badge>
              <span className="small muted">
                {w.drafts.some((d) => d.generation === "ai")
                  ? t(
                      "AI-assisted drafts, ready for your review",
                      "AI 辅助起草，请逐封核对",
                    )
                  : t(
                      "Preserved drafts, ready for your edits",
                      "草稿已保留，可继续编辑",
                    )}
              </span>
            </div>
            <Button onClick={openPreview}>
              {t("Review drafts", "检查草稿")} <ArrowRight size={17} />
            </Button>
          </div>
          <Notice title={t("Review before sending", "发送前请核对")}>
            {t(
              "Review every recipient, message and attachment before sending from your own address.",
              "发送前请检查每位收件人、邮件内容和附件。",
            )}
          </Notice>
          <div className="mail-layout">
            <aside className="draft-list" aria-label="Email drafts">
              <div className="draft-list-heading">
                <span>{t("RECIPIENTS", "收件人")}</span>
                <span>{w.drafts.length}</span>
              </div>
              {w.drafts.map((d) => (
                <button
                  key={d.id}
                  className={
                    current.id === d.id ? "draft-tab active" : "draft-tab"
                  }
                  aria-pressed={current.id === d.id}
                  onClick={() => {
                    setActiveId(d.id);
                    setPersonalPreview(null);
                    setFileError("");
                  }}
                >
                  <EnvelopeSimple size={17} />
                  <span>
                    <strong>
                      {researcherById(w, d.researcherId)?.name || "Researcher"}
                    </strong>
                    <small>
                      {draftIssues(d).length
                        ? t("Needs your review", "需要核对")
                        : t("Ready to review", "可以核对")}
                    </small>
                  </span>
                </button>
              ))}
            </aside>
            <section className="draft-editor">
              <div className="editor-heading row between">
                <div>
                  <h2>{researcher?.name}</h2>
                  <p>
                    {t(
                      "Changes saved in this browser",
                      "修改已保存在当前浏览器",
                    )}
                  </p>
                </div>
                <IconButton
                  label={t("Delete this draft", "删除此草稿")}
                  onClick={() => setDeleteId(current.id)}
                >
                  <Trash size={18} />
                </IconButton>
              </div>
              <nav
                className="draft-tools"
                aria-label={t("Draft tools", "草稿工具")}
              >
                <a href="#draft-personalization">
                  <PencilSimple size={19} />
                  {t("Personal details", "个人细节")}
                </a>
                <a href="#draft-attachments">
                  <Paperclip size={19} />
                  {t("Attachments", "邮件附件")}
                </a>
                <a href="#draft-polish">{t("Refine with AI", "AI 润色")}</a>
              </nav>
              <Field
                id="recipient"
                label={t("To", "收件人")}
                value={current.to}
                type="email"
                onChange={(e) =>
                  update({ to: e.target.value, recipientEdited: true })
                }
                hint={
                  current.recipientEdited
                    ? t(
                        "User-entered address. Verify this recipient before sending.",
                        "此地址由你修改，请在发送前核对。",
                      )
                    : t(
                        "Public-source address. This inquiry does not assume an open position.",
                        "地址来自公开来源。发出咨询并不代表教授有空缺名额。",
                      )
                }
              />
              <Field
                id="subject"
                label={t("Subject", "主题")}
                value={current.subject}
                onChange={(e) => update({ subject: e.target.value })}
              />
              <Textarea
                key={current.id}
                id="email-body"
                label={t("Your message", "邮件正文")}
                className="body-field"
                rows={16}
                value={current.body}
                onChange={(e) => update({ body: e.target.value })}
              />
              {draftIssues(current).length > 0 && (
                <Notice>
                  {draftIssues(current)
                    .map((issue) => errorCopy(issue, locale))
                    .join(" ")}
                </Notice>
              )}
              <PolishDraft
                key={`polish-${current.id}`}
                draft={current}
                onApply={applyRevision}
              />
              <details
                open
                id="draft-personalization"
                className="personalization"
                key={`personal-${current.id}`}
              >
                <summary>
                  <PencilSimple size={17} />
                  {t("Add a few personal details", "添加个人细节")}{" "}
                  <Badge>{t("Optional", "选填")}</Badge>
                </summary>
                <p className="small muted">
                  {t(
                    "Only add true details. Preview and apply them to add them to the current message, including any AI revision you have already applied. An unapplied AI preview is a separate version.",
                    "只填写真实信息。预览并应用后，细节才会加入当前邮件正文（包括已应用的 AI 润色）；尚未应用的 AI 预览是另一个版本。",
                  )}
                </p>
                <Textarea
                  id="personal-interest"
                  label={t(
                    "What about this research interests you?",
                    "这项研究的哪些内容吸引你？",
                  )}
                  rows={2}
                  placeholder={t("I’m curious about…", "我感兴趣的是……")}
                  value={current.answers.interest}
                  onChange={(e) =>
                    update({
                      answers: { ...current.answers, interest: e.target.value },
                    })
                  }
                />
                <Textarea
                  id="personal-experience"
                  label={t(
                    "Any experience you want to mention?",
                    "有什么想提及的经历？",
                  )}
                  rows={2}
                  placeholder={t(
                    "A course, a project, or that you are exploring research for the first time.",
                    "可以是一门课程、一个项目，或说明你正在初次尝试研究。",
                  )}
                  value={current.answers.experience}
                  onChange={(e) =>
                    update({
                      answers: {
                        ...current.answers,
                        experience: e.target.value,
                      },
                    })
                  }
                />
                <Textarea
                  id="personal-request"
                  label={t("What would you like to ask?", "你想询问什么？")}
                  rows={2}
                  placeholder={t(
                    "For example, how undergraduates can get involved.",
                    "例如：本科生可以通过什么途径参与研究。",
                  )}
                  value={current.answers.request}
                  onChange={(e) =>
                    update({
                      answers: { ...current.answers, request: e.target.value },
                    })
                  }
                />
                <Button
                  variant="secondary"
                  disabled={
                    !Object.values(current.answers).some((v) => v.trim())
                  }
                  onClick={() =>
                    setPersonalPreview(previewPersonalDetails(current))
                  }
                >
                  {t("Preview additions", "预览添加的内容")}{" "}
                  <ArrowRight size={16} />
                </Button>
              </details>
              <div className="attachments" id="draft-attachments">
                <div className="row between">
                  <h2>{t("Attachments", "邮件附件")}</h2>
                  <Button
                    variant="secondary"
                    disabled={attaching}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip size={17} />
                    {attaching
                      ? t("Saving…", "正在保存…")
                      : t("Attach a file", "添加附件")}
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Attach file to this draft"
                  onChange={(e) => attach(e.target.files?.[0])}
                />
                {current.attachments?.length ? (
                  current.attachments.map((a) => (
                    <div key={a.id} className="attachment-row">
                      <Paperclip size={14} />
                      <span>
                        {a.name}
                        {missing.includes(a.id) && (
                          <span className="error-text">
                            {" "}
                            (file missing, reattach)
                          </span>
                        )}
                      </span>
                      <small>{Math.ceil(a.size / 1024)} KB</small>
                      <IconButton
                        label={`Remove ${a.name}`}
                        onClick={() => removeAttachment(a.id)}
                      >
                        <X size={16} />
                      </IconButton>
                    </div>
                  ))
                ) : (
                  <p className="attachment-hint">
                    {t(
                      "No attachments. Your uploaded résumé is never attached automatically.",
                      "尚未添加附件。之前上传的简历不会自动作为邮件附件。",
                    )}
                  </p>
                )}
                {fileError && <Notice tone="error">{fileError}</Notice>}
              </div>
              <div className="editor-actions">
                <Button variant="secondary" onClick={copyDraft}>
                  <Copy size={17} />
                  {t("Copy draft", "复制草稿")}
                </Button>
                <Button variant="ghost" onClick={() => exportDrafts([current])}>
                  <DownloadSimple size={17} />
                  {t("Export text", "导出文本")}
                </Button>
              </div>
              {researcher && (
                <a
                  href={researcher.contact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="quiet-link"
                  style={{ marginTop: 20 }}
                >
                  {t("Check original contact source", "查看原始联系来源")}{" "}
                  <ArrowUpRight size={15} />
                </a>
              )}
            </section>
          </div>
        </>
      )}
      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title={t("Review your introductions", "检查每封联系邮件")}
        description={t(
          "Each selection is a separate email to one researcher.",
          "每个选中的草稿会单独发送给一位教授。",
        )}
        wide
      >
        <div className="preview-body">
          {identity?.outlook?.connected ? (
            <Notice>
              {t("From:", "发件邮箱：")} {identity.outlook.email}.{" "}
              {t(
                "Sent through your Outlook mailbox, with a copy in Sent Items. Replies return to this address.",
                "通过你的 Outlook 邮箱发送，并保存至已发送邮件。回复会发送到此地址。",
              )}
            </Notice>
          ) : (
            <Notice>
              {t(
                "Complete your email setup in Settings before sending.",
                "请先在设置中完成邮箱配置，再发送邮件。",
              )}{" "}
              <LinkButton href="/explore/settings" variant="ghost">
                {t("Open settings", "前往设置")}
              </LinkButton>
            </Notice>
          )}
          {submission.error && (
            <Notice tone="error">
              {submission.error}{" "}
              <a href="/explore/history">Open contact history</a>
            </Notice>
          )}
          {w.drafts.map((d) => {
            const issues = draftIssues(d);
            const missingFile = (d.attachments || []).some((a) =>
              missing.includes(a.id),
            );
            return (
              <details key={d.id} className="preview-message" open>
                <summary>
                  <label
                    className="checkbox-label"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={
                        !issues.length &&
                        !missingFile &&
                        w.selectedDrafts.includes(d.id)
                      }
                      disabled={!!issues.length || missingFile}
                      onChange={(e) =>
                        setWorkspace((p) => ({
                          ...p,
                          selectedDrafts: e.target.checked
                            ? [...new Set([...p.selectedDrafts, d.id])]
                            : p.selectedDrafts.filter((id) => id !== d.id),
                        }))
                      }
                    />
                    {researcherById(w, d.researcherId)?.name}
                  </label>
                  <Badge
                    tone={issues.length || missingFile ? "negative" : "neutral"}
                  >
                    {issues.length || missingFile
                      ? t("Needs edits", "需要修改")
                      : t("Ready to review", "可以核对")}
                  </Badge>
                </summary>
                <p className="mail-meta">
                  <strong>To:</strong> {d.to}
                  <br />
                  <strong>Subject:</strong> {d.subject}
                </p>
                {(issues.length > 0 || missingFile) && (
                  <p className="preview-errors">
                    {issues.join(" ")}
                    {missingFile && " Reattach the missing file."}
                  </p>
                )}
                <pre>{d.body}</pre>
                <p className="small muted">
                  Attachments:{" "}
                  {d.attachments?.length
                    ? d.attachments
                        .map(
                          (a) => `${a.name} (${Math.ceil(a.size / 1024)} KB)`,
                        )
                        .join(", ")
                    : "None"}
                </p>
              </details>
            );
          })}
          {unique.length !== selected.length && (
            <Notice tone="error">
              Two drafts use the same recipient address. Resolve duplicates
              before sending.
            </Notice>
          )}
          <Notice>
            {submission.capability?.sendEnabled
              ? "Send submits one separate message per recipient through your Outlook account. Microsoft’s acceptance does not guarantee delivery."
              : "Connect Outlook to send from your own mailbox. Your drafts stay saved. Exported text does not include attachment files."}
          </Notice>
          <div className="preview-actions">
            <Button
              variant="secondary"
              disabled={!selected.length}
              onClick={() => exportDrafts(selected)}
            >
              <DownloadSimple size={17} />
              {t("Export selected", "导出选中的草稿")}
            </Button>
            <Button
              disabled={
                !submission.capability?.sendEnabled ||
                identityLoading ||
                !identity?.verified ||
                !identity?.outlook?.connected ||
                submission.busy ||
                !unique.length ||
                unique.length > 6 ||
                unique.length !== selected.length
              }
              onClick={async () => {
                const result = await submission.submit(
                  unique,
                  identity!.outlook.email!,
                );
                if (result) {
                  setPreview(false);
                  notify(
                    "Batch saved. Check each message's status in contact history.",
                  );
                  router.push("/explore/history");
                }
              }}
            >
              {submission.busy ? "Submitting" : "Send from Outlook:"}{" "}
              {unique.length} selected{" "}
              {unique.length === 1 ? "email" : "emails"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!personalPreview}
        onOpenChange={(v) => !v && setPersonalPreview(null)}
        title={t("Review your additions", "检查新增内容")}
        description={t(
          "Apply only if these statements are accurate for you.",
          "确认内容真实准确后再应用。",
        )}
      >
        <div className="preview-body">
          <pre
            style={{
              whiteSpace: "pre-wrap",
              font: "12px/1.9 var(--font-body)",
            }}
          >
            {personalPreview?.patch.body}
          </pre>
          {personalPreviewChanged && (
            <Notice>
              {t(
                "Your draft or personal details have changed since this preview. Refresh it before applying so newer edits are kept.",
                "生成预览后，草稿或个人细节已有变化。请更新预览后再应用，以保留最新修改。",
              )}
              {current && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setPersonalPreview(previewPersonalDetails(current))
                  }
                >
                  {t("Refresh additions preview", "更新个人细节预览")}
                </Button>
              )}
            </Notice>
          )}
          <div className="preview-actions">
            <Button
              variant="secondary"
              onClick={() => setPersonalPreview(null)}
            >
              {t("Keep original", "保留原稿")}
            </Button>
            <Button
              disabled={!personalPreview || personalPreviewChanged}
              onClick={() => {
                if (
                  !personalPreview ||
                  !matchesDraftSnapshot(current, personalPreview.base)
                )
                  return;
                applyRevision(personalPreview);
                setPersonalPreview(null);
              }}
            >
              <Check size={17} />
              {t("Apply to this draft", "应用到当前草稿")}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title={t("Delete this draft?", "删除这封草稿？")}
        description={t(
          "This removes the draft and its attachments from this browser.",
          "这会移除当前浏览器中的草稿及其附件。",
        )}
      >
        <div className="preview-body">
          <div className="preview-actions">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              {t("Keep draft", "保留草稿")}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const draft = w.drafts.find((d) => d.id === deleteId);
                try {
                  await Promise.all(
                    (draft?.attachments || []).map((a) =>
                      del(`research-attachment:${a.id}`),
                    ),
                  );
                  setWorkspace((p) => ({
                    ...p,
                    drafts: p.drafts.filter((d) => d.id !== deleteId),
                    selectedDrafts: p.selectedDrafts.filter(
                      (id) => id !== deleteId,
                    ),
                  }));
                  setDeleteId(null);
                } catch {
                  notify(
                    "The draft could not be fully removed. Please try again.",
                  );
                }
              }}
            >
              {t("Delete draft", "删除草稿")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
