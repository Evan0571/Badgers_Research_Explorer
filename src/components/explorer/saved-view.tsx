"use client";
import { useState } from "react";
import {
  BookmarkSimple,
  ArrowRight,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import { Button, EmptyState, LinkButton, Notice } from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import { ResearchCard } from "./research-card";
import { ResearcherDialog } from "./researcher-dialog";
export function SavedView() {
  const { workspace: w } = useWorkspace();
  const { prepareDrafts } = useResearchActions();
  const [detail, setDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const saved = w.saved.map((id) => researcherById(w, id)).filter((r) => !!r);
  const eligible = saved.filter(canEmail);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">A collection of possibilities</p>
        <h1>Your shortlist.</h1>
        <p>
          Keep the research that makes you pause. Decide what comes next when
          you are ready.
        </p>
      </div>
      {saved.length ? (
        <>
          <div className="selection-toolbar">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={
                  eligible.length > 0 &&
                  eligible.every((r) => selected.includes(r.id))
                }
                onChange={(e) =>
                  setSelected(e.target.checked ? eligible.map((r) => r.id) : [])
                }
              />
              Select email-eligible researchers
            </label>
            <Button
              disabled={
                !selected.some((id) => eligible.some((r) => r.id === id))
              }
              onClick={() =>
                prepareDrafts(
                  selected.filter((id) => eligible.some((r) => r.id === id)),
                )
              }
            >
              <EnvelopeSimple size={18} />
              Prepare{" "}
              {selected.filter((id) => eligible.some((r) => r.id === id))
                .length || ""}{" "}
              drafts
            </Button>
          </div>
          <Notice>
            Saving is separate from contacting. Public email addresses allow you
            to ask about the process; they do not establish an opening.
          </Notice>
          <div className="research-grid">
            {saved.map((r) => (
              <div className="saved-item" key={r.id}>
                {canEmail(r) && (
                  <label className="checkbox-label saved-check">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name} for email`}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, r.id]
                            : s.filter((id) => id !== r.id),
                        )
                      }
                    />
                    Prepare email
                  </label>
                )}
                <ResearchCard researcher={r} onOpen={setDetail} />
                {w.notes[r.id] && (
                  <p className="saved-note">
                    <strong>Your note:</strong> {w.notes[r.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<BookmarkSimple size={34} />}
          title="Make room for a possibility."
          action={
            <LinkButton href="/explore">
              Explore research <ArrowRight size={17} />
            </LinkButton>
          }
        >
          Save a researcher while exploring. Your shortlist and personal notes
          will stay together here.
        </EmptyState>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
