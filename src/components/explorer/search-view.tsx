"use client";
import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  MagnifyingGlass,
  Paperclip,
  ArrowUpRight,
  X,
  Scales,
  SlidersHorizontal,
  BookOpen,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { researchers, topics } from "@/data/researchers";
import { findResearchers, inferTopics, isBroadQuery } from "@/lib/research";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Notice,
  Select,
  Textarea,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { ResearchCard } from "./research-card";
import { ResearcherDialog } from "./researcher-dialog";

export function SearchView() {
  const { workspace: w, setWorkspace, notify } = useWorkspace();
  const [input, setInput] = useState(w.query);
  const [detail, setDetail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("researcher")) setDetail(params.get("researcher"));
  }, [params]);
  const submit = (query: string) => {
    if (!query.trim()) return;
    setInput(query);
    setWorkspace((p) => ({
      ...p,
      query: query.trim(),
      searched: true,
      topics: inferTopics(query),
      department: "",
      recruitment: "",
      creditOnly: false,
      matchAll: false,
    }));
  };
  const found = w.searched
    ? findResearchers(researchers, w.query, w.topics, w.matchAll)
    : [];
  const filtered = found.filter(
    (r) =>
      (!w.department || r.department === w.department) &&
      (!w.recruitment || r.recruitment === w.recruitment) &&
      (!w.creditOnly || r.credit.value === "supported"),
  );
  const upload = async (file?: File) => {
    if (!file) return;
    setUploadError("");
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(
        "Choose a file smaller than 10 MB, or paste the text below.",
      );
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/resume", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not read this file.");
      setWorkspace((p) => ({
        ...p,
        background: { ...p.background, resumeText: result.text },
      }));
      notify(
        "Résumé text extracted. Review it below; choose your interests yourself.",
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not read this file. Paste the text or continue with your interests.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <>
      <div
        className={
          w.searched ? "explore-heading results-heading" : "explore-heading"
        }
      >
        <p className="eyebrow">Start with curiosity</p>
        <h1>
          {w.searched
            ? "Follow what interests you."
            : "What are you curious about?"}
        </h1>
        <p>
          {w.searched
            ? "Read the questions. Find a connection. Make the choice yours."
            : "A topic, a question, or a researcher’s name. You do not need to have it all figured out."}
        </p>
      </div>
      <div className="search-section">
        <form
          className="search-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <label htmlFor="interest" className="sr-only">
            What are you curious about?
          </label>
          <textarea
            id="interest"
            maxLength={10000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="I’m interested in AI and how people learn…"
            rows={2}
          />
          <div className="composer-footer">
            <Button
              variant="ghost"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={19} />
              {uploading ? "Reading résumé…" : "Add résumé"}
              <span className="optional-label">optional</span>
            </Button>
            <Button type="submit" disabled={!input.trim()}>
              Explore research <ArrowRight size={18} />
            </Button>
          </div>
        </form>
        <input
          type="file"
          ref={fileRef}
          accept=".pdf,.docx,.txt"
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload résumé"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <p className="input-help">
          English or 中文. Your interests lead; your major does not limit the
          search.
        </p>
        {uploadError && (
          <Notice tone="error">
            {uploadError} You can paste résumé text in optional background.
          </Notice>
        )}
        <details
          className="background-details"
          open={w.background.resumeText ? true : undefined}
        >
          <summary>
            Add a little background <span>Optional</span>
          </summary>
          <div className="background-fields">
            <Field
              id="student-name"
              label="Your name"
              value={w.background.name}
              onChange={(e) =>
                setWorkspace((p) => ({
                  ...p,
                  background: { ...p.background, name: e.target.value },
                }))
              }
            />
            <Field
              id="major"
              label="Major or area of study"
              value={w.background.major}
              onChange={(e) =>
                setWorkspace((p) => ({
                  ...p,
                  background: { ...p.background, major: e.target.value },
                }))
              }
            />
            <Select
              id="year"
              label="Year"
              value={w.background.year}
              onChange={(e) =>
                setWorkspace((p) => ({
                  ...p,
                  background: { ...p.background, year: e.target.value },
                }))
              }
            >
              <option value="">Not specified</option>
              {[
                "first-year",
                "second-year",
                "third-year",
                "fourth-year",
                "graduate",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          </div>
          <Textarea
            id="resume-text"
            label="Résumé text for your review"
            hint="Extraction does not confirm experience or choose interests. The original file is not retained. Only text you keep here is saved in this browser."
            rows={4}
            value={w.background.resumeText}
            onChange={(e) =>
              setWorkspace((p) => ({
                ...p,
                background: { ...p.background, resumeText: e.target.value },
              }))
            }
          />
          {w.background.resumeText && (
            <Button
              variant="ghost"
              onClick={() =>
                setWorkspace((p) => ({
                  ...p,
                  background: { ...p.background, resumeText: "" },
                }))
              }
            >
              Remove résumé text
            </Button>
          )}
        </details>
      </div>
      {!w.searched && (
        <>
          <div className="starter-suggestions">
            <span>Try a starting point</span>
            {["AI", "Robotics", "Accessibility", "AI and education"].map(
              (s) => (
                <button key={s} onClick={() => submit(s)}>
                  {s}
                  <ArrowUpRight size={14} />
                </button>
              ),
            )}
          </div>
          <div className="explore-intro">
            <BookOpen size={34} weight="duotone" />
            <h2>
              You bring the question.
              <br />
              We help you explore it.
            </h2>
            <p>
              Start with the source-checked collection, then save and compare
              research that catches your attention.
            </p>
          </div>
        </>
      )}
      <div className="collection-notice">
        <BookOpen size={17} />
        <p>
          <strong>About this collection.</strong> {researchers.length} real UW
          researchers, sources checked September 26, 2026. This build searches
          these records only. Campus-wide discovery is not connected yet.
        </p>
      </div>
      {w.searched && (
        <>
          {(isBroadQuery(w.query) || w.topics.length > 1) && (
            <section className="directions-section">
              <div className="row between">
                <h2>
                  {isBroadQuery(w.query)
                    ? "A few directions to explore"
                    : "Your interests can overlap"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setWorkspace((p) => ({ ...p, topics: [], matchAll: false }))
                  }
                >
                  Show all matches
                </Button>
              </div>
              <div className="direction-grid">
                {topics
                  .filter(
                    (t) =>
                      isBroadQuery(w.query) ||
                      inferTopics(w.query).includes(t.id),
                  )
                  .map((t) => (
                    <button
                      className={
                        w.topics.includes(t.id)
                          ? "direction-card selected"
                          : "direction-card"
                      }
                      key={t.id}
                      aria-pressed={w.topics.includes(t.id)}
                      onClick={() =>
                        setWorkspace((p) => ({
                          ...p,
                          topics: p.topics.includes(t.id)
                            ? p.topics.filter((x) => x !== t.id)
                            : [...p.topics, t.id],
                        }))
                      }
                    >
                      <span>
                        {t.title}
                        <ArrowUpRight size={16} />
                      </span>
                      <p>{t.question}</p>
                      <small>
                        {researchers.find((r) => r.topics.includes(t.id))?.name}
                      </small>
                    </button>
                  ))}
              </div>
              {w.topics.length > 1 && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={w.matchAll}
                    onChange={(e) =>
                      setWorkspace((p) => ({
                        ...p,
                        matchAll: e.target.checked,
                      }))
                    }
                  />
                  Only show researchers connected to all selected interests
                </label>
              )}
            </section>
          )}
          <section className="results-section">
            <div className="results-title row between">
              <div>
                <h2>Research worth getting to know</h2>
                <p>
                  <strong>{filtered.length}</strong>{" "}
                  {filtered.length === 1 ? "researcher" : "researchers"} in the
                  collection ·{" "}
                  {w.topics.length
                    ? topics
                        .filter((t) => w.topics.includes(t.id))
                        .map((t) => t.title)
                        .join(", ")
                    : w.query}
                </p>
              </div>
              <Badge>No ranking or match scores</Badge>
            </div>
            <div className="filter-bar">
              <SlidersHorizontal size={20} />
              <Select
                id="department"
                label="Department"
                value={w.department}
                onChange={(e) =>
                  setWorkspace((p) => ({ ...p, department: e.target.value }))
                }
              >
                <option value="">All departments</option>
                {[...new Set(researchers.map((r) => r.department))].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
              <Select
                id="recruitment"
                label="Openings"
                value={w.recruitment}
                onChange={(e) =>
                  setWorkspace((p) => ({ ...p, recruitment: e.target.value }))
                }
              >
                <option value="">All statuses</option>
                <option value="open">Applications open</option>
                <option value="unknown">Not stated</option>
                <option value="closed">No current openings</option>
              </Select>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={w.creditOnly}
                  onChange={(e) =>
                    setWorkspace((p) => ({
                      ...p,
                      creditOnly: e.target.checked,
                    }))
                  }
                />
                Credit explicitly supported
              </label>
              {(w.department || w.recruitment || w.creditOnly) && (
                <IconButton
                  label="Clear filters"
                  onClick={() =>
                    setWorkspace((p) => ({
                      ...p,
                      department: "",
                      recruitment: "",
                      creditOnly: false,
                    }))
                  }
                >
                  <ArrowCounterClockwise size={18} />
                </IconButton>
              )}
            </div>
            {w.creditOnly && (
              <Notice>
                {found.filter((r) => r.credit.value === "unknown").length}{" "}
                records with unknown credit arrangements are excluded by this
                filter.
              </Notice>
            )}
            {filtered.length ? (
              <div className="research-grid">
                {filtered.map((r) => (
                  <ResearchCard key={r.id} researcher={r} onOpen={setDetail} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MagnifyingGlass size={32} />}
                title="No matches in this collection"
                action={
                  <Button variant="secondary" onClick={() => submit("AI")}>
                    Explore the starter collection
                  </Button>
                }
              >
                Try a different topic or remove filters. This does not mean
                there is no related research at UW-Madison.
              </EmptyState>
            )}
          </section>
        </>
      )}
      {w.comparison.length > 0 && (
        <div className="compare-tray">
          <Scales size={21} />
          <span>{w.comparison.length} selected for comparison</span>
          <Link className="button button-primary" href="/explore/compare">
            Compare <ArrowRight size={17} />
          </Link>
          <IconButton
            label="Clear comparison"
            onClick={() => setWorkspace((p) => ({ ...p, comparison: [] }))}
          >
            <X size={18} />
          </IconButton>
        </div>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
