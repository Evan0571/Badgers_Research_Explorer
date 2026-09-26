"use client";
import { useEffect, useRef, useState } from "react";
import { get, set, del } from "idb-keyval";
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
  UserCircle,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { byId } from "@/data/researchers";
import { draftIssues, normalizeRecipients, personalize } from "@/lib/research";
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

export function MailWorkspace() {
  const { workspace: w, setWorkspace, notify } = useWorkspace();
  const [activeId, setActiveId] = useState(w.drafts[0]?.id || "");
  const [preview, setPreview] = useState(false);
  const [connection, setConnection] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [personalPreview, setPersonalPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = w.drafts.find((d) => d.id === activeId) || w.drafts[0];
  const researcher = current && byId(current.researcherId);
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
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Attachments must be smaller than 10 MB.");
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
        <p className="eyebrow">Thoughtful introductions start here</p>
        <h1>Make the first hello yours.</h1>
        <p>
          One researcher, one email. Begin with a draft, add what is true for
          you, then review everything together.
        </p>
      </div>
      {!current ? (
        <EmptyState
          icon={<EnvelopeSimple size={35} />}
          title="A blank page, with a little help."
          action={
            <LinkButton href="/explore/saved">
              Choose from your shortlist <ArrowRight size={17} />
            </LinkButton>
          }
        >
          Prepare drafts from a researcher’s details or select email-eligible
          researchers in your shortlist.
        </EmptyState>
      ) : (
        <>
          <div className="selection-toolbar">
            <div className="row wrap">
              <Badge>
                {w.drafts.length} individual{" "}
                {w.drafts.length === 1 ? "draft" : "drafts"}
              </Badge>
              <span className="small muted">
                Local templates, ready for your edits
              </span>
            </div>
            <Button onClick={openPreview}>
              Review drafts <ArrowRight size={17} />
            </Button>
          </div>
          <Notice title="School email is not connected">
            You can prepare, personalize, and export your drafts. UW identity
            verification and Microsoft 365 sending are still being developed. No
            email will be sent in this build.
          </Notice>
          <div className="mail-layout">
            <aside className="draft-list" aria-label="Email drafts">
              <div className="draft-list-heading">
                <span>RECIPIENTS</span>
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
                    setFileError("");
                  }}
                >
                  <EnvelopeSimple size={17} />
                  <span>
                    <strong>
                      {byId(d.researcherId)?.name || "Researcher"}
                    </strong>
                    <small>
                      {draftIssues(d).length
                        ? "Needs your review"
                        : "Ready to review"}
                    </small>
                  </span>
                </button>
              ))}
            </aside>
            <section className="draft-editor">
              <div className="editor-heading row between">
                <div>
                  <h2>{researcher?.name}</h2>
                  <p>Changes saved in this browser</p>
                </div>
                <IconButton
                  label="Delete this draft"
                  onClick={() => setDeleteId(current.id)}
                >
                  <Trash size={18} />
                </IconButton>
              </div>
              <Field
                id="recipient"
                label="To"
                value={current.to}
                type="email"
                onChange={(e) =>
                  update({ to: e.target.value, recipientEdited: true })
                }
                hint={
                  current.recipientEdited
                    ? "User-entered address. Verify this recipient before sending."
                    : "Public-source address. This inquiry does not assume an open position."
                }
              />
              <Field
                id="subject"
                label="Subject"
                value={current.subject}
                onChange={(e) => update({ subject: e.target.value })}
              />
              <Textarea
                key={current.id}
                id="email-body"
                label="Your message"
                className="body-field"
                rows={16}
                value={current.body}
                onChange={(e) => update({ body: e.target.value })}
              />
              {draftIssues(current).length > 0 && (
                <Notice>{draftIssues(current).join(" ")}</Notice>
              )}
              <details
                className="personalization"
                key={`personal-${current.id}`}
              >
                <summary>
                  <PencilSimple size={17} />
                  Add a few personal details <Badge>Optional</Badge>
                </summary>
                <p className="small muted">
                  Only add experiences and interests that are true for you.
                  These answers affect this draft only.
                </p>
                <Textarea
                  id="personal-interest"
                  label="What about this research interests you?"
                  rows={2}
                  placeholder="I’m curious about…"
                  value={current.answers.interest}
                  onChange={(e) =>
                    update({
                      answers: { ...current.answers, interest: e.target.value },
                    })
                  }
                />
                <Textarea
                  id="personal-experience"
                  label="Any experience you want to mention?"
                  rows={2}
                  placeholder="A course, a project, or that you are exploring research for the first time."
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
                  label="What would you like to ask?"
                  rows={2}
                  placeholder="For example, how undergraduates can get involved."
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
                  onClick={() => setPersonalPreview(personalize(current))}
                >
                  Preview additions <ArrowRight size={16} />
                </Button>
              </details>
              <div className="attachments">
                <div className="row between">
                  <strong className="small">Attachments</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={attaching}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip size={17} />
                    {attaching ? "Saving…" : "Attach a file"}
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
                    No attachments. Your uploaded résumé is never attached
                    automatically.
                  </p>
                )}
                {fileError && <Notice tone="error">{fileError}</Notice>}
              </div>
              <div className="editor-actions">
                <Button variant="secondary" onClick={copyDraft}>
                  <Copy size={17} />
                  Copy draft
                </Button>
                <Button variant="ghost" onClick={() => exportDrafts([current])}>
                  <DownloadSimple size={17} />
                  Export text
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
                  Check original contact source <ArrowUpRight size={15} />
                </a>
              )}
            </section>
          </div>
        </>
      )}
      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title="Review your introductions"
        description="Each selection is a separate email to one researcher."
        wide
      >
        <div className="preview-body">
          <div className="account-box">
            <div className="row">
              <UserCircle size={23} />
              <h3>Connect your UW school email</h3>
            </div>
            <p>
              No account connected. Your school email must be verified before
              real sending is enabled.
            </p>
            <Button variant="secondary" onClick={() => setConnection(true)}>
              Microsoft 365 connection
            </Button>
          </div>
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
                    {byId(d.researcherId)?.name}
                  </label>
                  <Badge
                    tone={issues.length || missingFile ? "negative" : "neutral"}
                  >
                    {issues.length || missingFile
                      ? "Needs edits"
                      : "Ready to review"}
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
              before a future send.
            </Notice>
          )}
          <Notice>
            No emails can be sent yet. Your selections and drafts stay saved.
            Exported text does not include attachment files.
          </Notice>
          <div className="preview-actions">
            <Button
              variant="secondary"
              disabled={!selected.length}
              onClick={() => exportDrafts(selected)}
            >
              <DownloadSimple size={17} />
              Export selected
            </Button>
            <Button disabled>
              Send {unique.length} selected{" "}
              {unique.length === 1 ? "email" : "emails"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={connection}
        onOpenChange={setConnection}
        title="Microsoft 365 is not connected"
        description="Your drafts are safe in this browser."
      >
        <div className="pending-feature">
          <Notice>
            School account verification and sending are not available in this
            build.
          </Notice>
          <p>
            Once the integration is ready, you will verify your UW email and
            sign in with Microsoft to authorize sending. Entering an email
            address alone will never connect an account.
          </p>
          <p>You can continue editing or export your drafts now.</p>
          <Button variant="secondary" onClick={() => setConnection(false)}>
            Keep working on drafts
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!personalPreview}
        onOpenChange={(v) => !v && setPersonalPreview("")}
        title="Review your additions"
        description="Apply only if these statements are accurate for you."
      >
        <div className="preview-body">
          <pre
            style={{
              whiteSpace: "pre-wrap",
              font: "12px/1.9 var(--font-body)",
            }}
          >
            {personalPreview}
          </pre>
          <div className="preview-actions">
            <Button variant="secondary" onClick={() => setPersonalPreview("")}>
              Keep original
            </Button>
            <Button
              onClick={() => {
                update({
                  body: personalPreview,
                  answers: { interest: "", experience: "", request: "" },
                });
                setPersonalPreview("");
              }}
            >
              <Check size={17} />
              Apply to this draft
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete this draft?"
        description="This removes the draft and its attachments from this browser."
      >
        <div className="preview-body">
          <div className="preview-actions">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Keep draft
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
              Delete draft
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
