"use client";
import { useState } from "react";
import { Scales, X, BookmarkSimple, ArrowRight } from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  LinkButton,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import { ResearcherDialog } from "./researcher-dialog";
export function CompareView() {
  const { workspace: w } = useWorkspace();
  const { toggleSave, toggleCompare, prepareDrafts } = useResearchActions();
  const [detail, setDetail] = useState<string | null>(null);
  const chosen = w.comparison
    .map((id) => researcherById(w, id))
    .filter((r) => !!r);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Different questions. Different possibilities.</p>
        <h1>Find your own connection.</h1>
        <p>
          Compare up to three researchers by the same questions. There is no
          single “best” choice.
        </p>
      </div>
      {chosen.length > 0 ? (
        <>
          <div className="row between comparison-summary">
            <span>
              {chosen.length} of 3 comparison spaces used
              {chosen.length === 1 && ". Add another researcher to compare."}
            </span>
            <LinkButton href="/explore" variant="secondary">
              Add a researcher
            </LinkButton>
          </div>
          <div
            className="comparison-grid"
            style={{ "--compare-count": chosen.length } as React.CSSProperties}
          >
            {chosen.map((r) => (
              <article className="comparison-column" key={r.id}>
                <header>
                  <div className="row between">
                    <span className="initials">{r.initials}</span>
                    <IconButton
                      label={`Remove ${r.name} from comparison`}
                      onClick={() => toggleCompare(r.id)}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                  <h2>{r.name}</h2>
                  <p>{r.department}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetail(r.id)}
                  >
                    View research <ArrowRight size={15} />
                  </Button>
                </header>
                <section>
                  <h3>The research question</h3>
                  <p>{r.question}</p>
                </section>
                <section>
                  <h3>Research approach</h3>
                  <p>{r.methods}</p>
                </section>
                <section>
                  <h3>Connection to your interests</h3>
                  <p>{r.summary}</p>
                </section>
                <section>
                  <h3>Public participation conditions</h3>
                  <Badge
                    tone={r.recruitment === "closed" ? "negative" : "neutral"}
                  >
                    {r.recruitment === "closed"
                      ? "No current openings"
                      : "Openings not stated"}
                  </Badge>
                  <p>
                    Academic credit: not stated.
                    <br />
                    Paid work: not stated.
                  </p>
                </section>
                <section>
                  <h3>What you still need to know</h3>
                  <p>
                    {r.recruitment === "closed"
                      ? "Whether the group opens opportunities in a future cycle."
                      : "Current availability, undergraduate requirements, time commitment, and the application process."}
                  </p>
                </section>
                <section>
                  <h3>The next step</h3>
                  <p>{r.contact.note}</p>
                </section>
                <footer>
                  <Button variant="secondary" onClick={() => toggleSave(r.id)}>
                    <BookmarkSimple
                      size={17}
                      weight={w.saved.includes(r.id) ? "fill" : "regular"}
                    />
                    {w.saved.includes(r.id) ? "Saved" : "Save researcher"}
                  </Button>
                  {canEmail(r) && (
                    <Button
                      variant="ghost"
                      onClick={() => prepareDrafts([r.id])}
                    >
                      Prepare inquiry <ArrowRight size={16} />
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Scales size={34} />}
          title="A little perspective helps."
          action={
            <LinkButton href="/explore">
              Find researchers <ArrowRight size={17} />
            </LinkButton>
          }
        >
          Use the comparison icon on a research card to bring two or three
          possibilities together.
        </EmptyState>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
