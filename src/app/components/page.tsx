"use client";
import { useState } from "react";
import {
  ArrowRight,
  BookmarkSimple,
  Check,
  Compass,
  Scales,
} from "@phosphor-icons/react";
import {
  Badge,
  Brand,
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  LinkButton,
  Notice,
  Select,
  Textarea,
  ThemeToggle,
} from "@/components/ui";
export default function ComponentsPage() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <header className="container library-header">
        <Brand />
        <div className="row">
          <ThemeToggle />
          <LinkButton href="/explore" variant="secondary">
            Open workspace <ArrowRight size={17} />
          </LinkButton>
        </div>
      </header>
      <main id="main" className="container library-main">
        <p className="eyebrow">Research Explorer design system</p>
        <h1>Warm, clear, considered.</h1>
        <p>
          A small, reusable component library based on the Claude design
          analysis. Editorial typography, warm surfaces, accessible controls,
          and honest states.
        </p>
        <section className="library-section">
          <h2>The foundations</h2>
          <div className="swatches">
            {[
              ["Canvas", "--canvas", "#faf9f5"],
              ["Soft", "--soft", "#f5f0e8"],
              ["Card", "--card", "#efe9de"],
              ["Ink", "--ink", "#141413"],
              ["Coral", "--accent", "#cc785c"],
              ["Action", "--action", "#a9583e"],
            ].map(([label, token, hex]) => (
              <div key={token}>
                <div
                  className="swatch"
                  style={{ background: `var(${token})` }}
                />
                <p>{label}</p>
                <small>
                  {hex} (light) · {token}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="library-section">
          <h2>Typography</h2>
          <div className="type-example">
            <h1>Start with curiosity.</h1>
            <span>EB Garamond · Display · 48 / 400</span>
          </div>
          <div className="type-example">
            <h2>A question worth asking.</h2>
            <span>EB Garamond · Heading · 36 / 400</span>
          </div>
          <div className="type-example">
            <p>Plain-language explanations. Sources you can check.</p>
            <span>Inter · Body · 15 / 400</span>
          </div>
        </section>
        <section className="library-section">
          <h2>Actions</h2>
          <div className="row wrap">
            <Button onClick={() => setOpen(true)}>
              Primary action <ArrowRight size={17} />
            </Button>
            <Button variant="secondary" onClick={() => setSaved(!saved)}>
              <BookmarkSimple size={18} weight={saved ? "fill" : "regular"} />
              {saved ? "Saved" : "Save researcher"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(true)}>
              Text action
            </Button>
            <Button disabled>Unavailable</Button>
            <IconButton label="Compare example" onClick={() => setOpen(true)}>
              <Scales size={20} />
            </IconButton>
          </div>
        </section>
        <section className="library-section">
          <h2>Labels with meaning</h2>
          <div className="row wrap">
            <Badge>Not stated</Badge>
            <Badge tone="positive">Explicitly supported</Badge>
            <Badge tone="negative">No current openings</Badge>
            <Badge tone="accent">Source included</Badge>
          </div>
          <Notice title="An unknown is not a no">
            Missing information stays visible. Color always has an accompanying
            text label.
          </Notice>
          <Notice tone="error" title="We could not read this file">
            Paste the text or continue with your interests. Your earlier input
            is still saved.
          </Notice>
          <Notice tone="success">
            Your draft has been saved locally. Nothing has been sent.
          </Notice>
        </section>
        <section className="library-section">
          <h2>Inputs</h2>
          <div className="library-fields">
            <Field
              id="demo-name"
              label="Your name"
              placeholder="What should we call you?"
              hint="Optional until you prepare an email."
            />
            <Select id="demo-select" label="Department">
              <option>All departments</option>
              <option>Computer Sciences</option>
              <option>Psychology</option>
            </Select>
            <Field
              id="demo-error"
              label="School email"
              defaultValue="not-an-email"
              error="Enter a valid email address."
            />
          </div>
          <div style={{ marginTop: 22 }}>
            <Textarea
              id="demo-interest"
              label="What interests you?"
              rows={3}
              placeholder="Start with a question…"
            />
          </div>
        </section>
        <section className="library-section">
          <h2>Empty states and dialogs</h2>
          <EmptyState
            icon={<Compass size={32} />}
            title="Every search starts somewhere."
            action={
              <Button onClick={() => setOpen(true)}>Explore an example</Button>
            }
          >
            A useful empty state explains what belongs here and offers a clear
            next step.
          </EmptyState>
        </section>
        <p className="small">
          Reference:{" "}
          <a
            className="quiet-link"
            href="https://getdesign.md/claude/design-md"
            target="_blank"
            rel="noreferrer"
          >
            VoltAgent’s independent Claude design analysis
          </a>
          . Original branding and component implementation for Research
          Explorer.
        </p>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Room to focus"
          description="A keyboard-accessible dialog with focus containment and Escape dismissal."
        >
          <div className="demo-dialog-body">
            <p>
              Dialogs preserve the workspace behind them and keep important
              actions in reach.
            </p>
            <Button onClick={() => setOpen(false)}>
              <Check size={17} />
              Got it
            </Button>
          </div>
        </Dialog>
      </main>
    </>
  );
}
