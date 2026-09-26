"use client";
import {
  ArrowUpRight,
  BookmarkSimple,
  EnvelopeSimple,
  Scales,
} from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import {
  Badge,
  Button,
  Dialog,
  LinkButton,
  Notice,
  Textarea,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
export function ResearcherDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { workspace, setWorkspace } = useWorkspace();
  const r = id ? researcherById(workspace, id) : undefined;
  const { toggleSave, toggleCompare, prepareDrafts } = useResearchActions();
  if (!r) return null;
  return (
    <Dialog
      open={!!r}
      onOpenChange={(value) => !value && onClose()}
      title={r.name}
      description={`${r.department} · UW-Madison`}
      wide
    >
      <div className="detail-body">
        <Badge>{r.lab}</Badge>
        <h2 className="detail-title">{r.title}</h2>
        <p className="detail-lead">
          {/[\u3400-\u9fff]/.test(workspace.query) ? r.summaryZh : r.summary}
        </p>
        {r.relevance && (
          <Notice title="Connection to your interests">{r.relevance}</Notice>
        )}
        {r.provenance !== "live" && (
          <Notice>
            This is a preserved preview example. Run a live search to check
            current information before preparing contact.
          </Notice>
        )}
        <div className="row wrap">
          <Button variant="secondary" onClick={() => toggleSave(r.id)}>
            <BookmarkSimple
              weight={workspace.saved.includes(r.id) ? "fill" : "regular"}
              size={18}
            />
            {workspace.saved.includes(r.id)
              ? "Saved to shortlist"
              : "Save to shortlist"}
          </Button>
          <Button variant="ghost" onClick={() => toggleCompare(r.id)}>
            <Scales size={19} />
            {workspace.comparison.includes(r.id)
              ? "Remove from comparison"
              : "Add to comparison"}
          </Button>
        </div>
        <section className="detail-section">
          <h3>The question behind the research</h3>
          <p>{r.question}</p>
          <div className="explanation-box">
            <span className="tiny-label">AN EXPLANATORY EXAMPLE</span>
            <p>{r.example}</p>
          </div>
        </section>
        <section className="detail-section">
          <h3>How the research works</h3>
          <p>{r.methods}</p>
          <p className="small muted">
            Plain-language interpretation of the sources below. No full-paper
            analysis is claimed.
          </p>
        </section>
        <section className="detail-section">
          <h3>What is publicly known</h3>
          <div className="condition-list">
            {[
              ["Undergraduate participation", r.participation],
              ["Academic credit", r.credit],
              ["Paid work", r.pay],
            ].map(
              ([label, condition]) =>
                typeof condition !== "string" && (
                  <div key={String(label)}>
                    <div className="row between">
                      <strong>{String(label)}</strong>
                      <Badge
                        tone={
                          condition.value === "supported"
                            ? "positive"
                            : condition.value === "not-supported"
                              ? "negative"
                              : "neutral"
                        }
                      >
                        {condition.value === "supported"
                          ? "Supported"
                          : condition.value === "not-supported"
                            ? "Not supported currently"
                            : "Not stated"}
                      </Badge>
                    </div>
                    <p>{condition.detail}</p>
                    {condition.quote && (
                      <p className="small">
                        Source evidence: “{condition.quote}”
                      </p>
                    )}
                  </div>
                ),
            )}
          </div>
        </section>
        <section className="detail-section">
          <h3>Your next step</h3>
          <Notice>{r.contact.note}</Notice>
          <div className="row wrap detail-cta">
            {canEmail(r) && (
              <Button
                onClick={() => {
                  prepareDrafts([r.id]);
                  onClose();
                }}
              >
                <EnvelopeSimple size={18} />
                Prepare an inquiry
              </Button>
            )}
            <LinkButton href={r.contact.url} external variant="secondary">
              {r.contact.route === "form"
                ? "Open application form"
                : r.contact.route === "program"
                  ? "View program application"
                  : "Visit original website"}
            </LinkButton>
          </div>
        </section>
        <section className="detail-section">
          <h3>Sources you can check</h3>
          <div className="sources">
            {r.sources.map((s) => (
              <div key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <ArrowUpRight size={16} />
                </a>
                <p>{s.note}</p>
                {s.excerpt && <p className="small">“{s.excerpt}”</p>}
                <small>
                  Checked {new Date(s.checkedAt).toLocaleDateString()} ·
                  Public-source snapshot
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="detail-section">
          <Textarea
            id={`note-${r.id}`}
            label="Your own notes"
            hint="Private to this browser. Notes are not automatically included in emails."
            rows={3}
            value={workspace.notes[r.id] || ""}
            onChange={(e) =>
              setWorkspace((w) => ({
                ...w,
                notes: { ...w.notes, [r.id]: e.target.value },
              }))
            }
          />
        </section>
      </div>
    </Dialog>
  );
}
