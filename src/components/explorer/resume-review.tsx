"use client";
import { useState } from "react";
import { Button, Dialog, Field, Notice, Textarea } from "@/components/ui";
import { requestJSON } from "@/lib/api";
import { useWorkspace } from "./provider";
interface Proposal {
  name: string;
  major: string;
  year: string;
  experience: string;
  interests: string[];
  evidence: { field: string; quote: string }[];
}
export function ResumeReview({
  onInterest,
}: {
  onInterest: (query: string) => void;
}) {
  const { workspace, setWorkspace } = useWorkspace();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!workspace.background.resumeText) return null;
  return (
    <>
      <p className="small muted">
        Optional AI review sends the résumé text to the configured AI service.
        Suggestions only become your background after you confirm them.
      </p>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setProposal(
              await requestJSON<Proposal>("/api/resume/analyze", {
                text: workspace.background.resumeText,
              }),
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "The résumé could not be reviewed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Reviewing résumé…" : "Suggest background from résumé"}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
      <Dialog
        open={!!proposal}
        onOpenChange={(open) => !open && setProposal(null)}
        title="Confirm your background"
        description="Correct these suggestions before using them. Your interests can differ from your past experience."
      >
        {proposal && (
          <div className="preview-body">
            {(["name", "major", "year"] as const).map((field) => (
              <Field
                key={field}
                id={`proposal-${field}`}
                label={field}
                value={proposal[field]}
                onChange={(e) =>
                  setProposal({ ...proposal, [field]: e.target.value })
                }
              />
            ))}
            <Textarea
              id="proposal-experience"
              label="Experience"
              rows={4}
              value={proposal.experience}
              onChange={(e) =>
                setProposal({ ...proposal, experience: e.target.value })
              }
            />
            <details>
              <summary>Supporting résumé text</summary>
              {proposal.evidence.map((e, i) => (
                <p key={i} className="small">
                  {e.field}: {e.quote}
                </p>
              ))}
            </details>
            <p>Possible interests, only if you want to explore them:</p>
            <div className="row wrap">
              {proposal.interests.map((interest) => (
                <Button
                  variant="ghost"
                  key={interest}
                  onClick={() => onInterest(interest)}
                >
                  {interest}
                </Button>
              ))}
            </div>
            <div className="preview-actions">
              <Button variant="secondary" onClick={() => setProposal(null)}>
                Keep current background
              </Button>
              <Button
                onClick={() => {
                  setWorkspace((w) => ({
                    ...w,
                    background: {
                      ...w.background,
                      name: proposal.name,
                      major: proposal.major,
                      year: proposal.year,
                      experience: proposal.experience,
                    },
                  }));
                  setProposal(null);
                }}
              >
                Use reviewed background
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
