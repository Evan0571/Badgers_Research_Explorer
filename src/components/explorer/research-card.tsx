"use client";
import {
  ArrowRight,
  ArrowUpRight,
  BookmarkSimple,
  Scales,
} from "@phosphor-icons/react";
import type { Researcher } from "@/lib/types";
import { Badge, Button, IconButton } from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
export function ResearchCard({
  researcher: r,
  onOpen,
}: {
  researcher: Researcher;
  onOpen: (id: string) => void;
}) {
  const { workspace } = useWorkspace();
  const { toggleSave, toggleCompare } = useResearchActions();
  const chinese = /[\u3400-\u9fff]/.test(workspace.query);
  return (
    <article className="research-card">
      <div className="row between">
        <span className="department-label">{r.department}</span>
        <IconButton
          label={`${workspace.saved.includes(r.id) ? "Unsave" : "Save"} ${r.name}`}
          aria-pressed={workspace.saved.includes(r.id)}
          onClick={() => toggleSave(r.id)}
        >
          <BookmarkSimple
            size={21}
            weight={workspace.saved.includes(r.id) ? "fill" : "regular"}
          />
        </IconButton>
      </div>
      <button className="card-title-button" onClick={() => onOpen(r.id)}>
        <h2>{r.title}</h2>
      </button>
      <p className="research-summary">{chinese ? r.summaryZh : r.summary}</p>
      <div className="researcher-byline">
        <span className="initials">{r.initials}</span>
        <div>
          <strong>{r.name}</strong>
          <small>{r.lab}</small>
        </div>
      </div>
      <div className="row wrap conditions">
        <Badge tone={r.recruitment === "closed" ? "negative" : "neutral"}>
          {r.recruitment === "closed"
            ? "No current openings"
            : r.recruitment === "open"
              ? "Applications open"
              : "Openings not stated"}
        </Badge>
        <span className="small muted">
          Credit:{" "}
          {r.credit.value === "supported"
            ? "supported"
            : r.credit.value === "not-supported"
              ? "not supported"
              : "not stated"}
        </span>
      </div>
      <div className="card-reason">
        <span>Why explore this</span>
        <p>
          {r.topics.filter((t) => workspace.topics.includes(t)).length > 1
            ? "Connects more than one of your selected interests. "
            : ""}
          {r.relevance || r.question}
        </p>
      </div>
      <footer className="card-actions">
        <Button variant="ghost" size="sm" onClick={() => onOpen(r.id)}>
          Understand the research <ArrowRight size={16} />
        </Button>
        <IconButton
          label={`${workspace.comparison.includes(r.id) ? "Remove" : "Compare"} ${r.name}`}
          aria-pressed={workspace.comparison.includes(r.id)}
          onClick={() => toggleCompare(r.id)}
        >
          <Scales size={20} />
        </IconButton>
        <a
          className="icon-button"
          href={r.contact.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${r.name} original website`}
        >
          <ArrowUpRight size={20} />
        </a>
      </footer>
    </article>
  );
}
