"use client";
import { useState } from "react";
import { AppleHeader } from "@/components/apple-header";
import {
  ArrowRight,
  BookmarkSimple,
  Check,
  Compass,
  Scales,
} from "@phosphor-icons/react";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Notice,
  Select,
  Textarea,
} from "@/components/ui";
export default function ComponentsPage() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <AppleHeader />
      <main id="main" className="container library-main">
        <p className="eyebrow">Research Explorer design system</p>
        <h1>Simple. Clear. Considered.</h1>
        <p>
          A small, reusable component library based on the Apple design
          analysis. System typography, neutral surfaces, blue capsule actions,
          and honest states.
        </p>
        <section className="library-section">
          <h2>The foundations</h2>
          <div className="swatches">
            {[
              ["Canvas", "--canvas", "#ffffff"],
              ["Soft", "--soft", "#f5f5f7"],
              ["Card", "--card", "#fafafc"],
              ["Ink", "--ink", "#1d1d1f"],
              ["Action blue", "--accent", "#0066cc"],
              ["Action", "--action", "#0066cc"],
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
            <span>System / Inter · Display · 56 / 600</span>
          </div>
          <div className="type-example">
            <h2>A question worth asking.</h2>
            <span>System / Inter · Heading · 40 / 600</span>
          </div>
          <div className="type-example">
            <p>Plain-language explanations. Sources you can check.</p>
            <span>System / Inter · Body · 17 / 400</span>
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
            href="https://getdesign.md/apple/design-md"
            target="_blank"
            rel="noreferrer"
          >
            VoltAgent’s independent Apple design analysis
          </a>
          . Reference-based web components for Research Explorer. An independent
          preview, not an official Apple component library.
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
