"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  EnvelopeSimple,
  List,
  MagnifyingGlass,
  Scales,
  X,
} from "@phosphor-icons/react";
import {
  Badge,
  Brand,
  Button,
  IconButton,
  LinkButton,
  ThemeToggle,
} from "./ui";
import { useWorkspace } from "./explorer/provider";

export default function Landing() {
  const { workspace } = useWorkspace();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav
            className={menu ? "landing-nav is-open" : "landing-nav"}
            aria-label="Main navigation"
          >
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#questions" onClick={() => setMenu(false)}>
              Questions
            </a>
            <Link href="/explore">
              Explore research <ArrowUpRight size={14} />
            </Link>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <LinkButton href="/explore">
              Get Started <ArrowRight size={17} />
            </LinkButton>
            <IconButton
              label={menu ? "Close navigation" : "Open navigation"}
              className="mobile-menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <List size={22} />}
            </IconButton>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="container hero">
          <div className="hero-copy">
            <p className="eyebrow">A starting point for UW-Madison students</p>
            <h1>
              Your curiosity.
              <br />A place to begin.
            </h1>
            <p className="hero-description">
              Find research that interests you, understand the work, and take
              your first step. No research experience required.
            </p>
            <div className="hero-actions">
              <LinkButton href="/explore">
                Get Started <ArrowRight size={18} />
              </LinkButton>
              {workspace.searched ? (
                <LinkButton href="/explore" variant="ghost">
                  Continue exploring
                </LinkButton>
              ) : (
                <a className="quiet-link" href="#how-it-works">
                  See how it works <ArrowRight size={17} />
                </a>
              )}
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-heading">
              <Compass size={20} />
              <span>A little curiosity goes a long way.</span>
            </div>
            <div className="preview-query">
              <MagnifyingGlass size={19} />
              <span>“How can AI help people in everyday life?”</span>
            </div>
            <div className="preview-research">
              <div className="row between">
                <Badge>Research preview</Badge>
                <BookOpen size={20} />
              </div>
              <p className="preview-dept">COMPUTER SCIENCES</p>
              <h2>
                Making the world
                <br />
                more accessible.
              </h2>
              <p>
                Yuhang Zhao studies AI-powered systems that support people with
                diverse abilities.
              </p>
              <div className="preview-connection">
                <span className="tiny-label">WHY EXPLORE THIS?</span>
                <p>
                  A connection between your interest in AI and real needs in
                  people’s lives.
                </p>
              </div>
              <div className="row between preview-footer">
                <span>
                  <Check size={15} /> Public source included
                </span>
                <Link
                  href="/explore?researcher=yuhang-zhao"
                  aria-label="Explore Yuhang Zhao’s research"
                >
                  <ArrowUpRight size={22} />
                </Link>
              </div>
            </div>
            <p className="preview-caption">
              A real research example. Openings may not be listed.
            </p>
          </div>
        </section>
        <div className="principles-strip container">
          <span>
            <Compass size={18} /> Curiosity before credentials
          </span>
          <span>
            <BookOpen size={18} /> Understand before you reach out
          </span>
          <span>
            <Scales size={18} /> Your choice, informed by sources
          </span>
        </div>
        <section id="how-it-works" className="how-section container">
          <div className="how-heading">
            <h2>
              You do not need a plan.
              <br />
              Just a starting point.
            </h2>
            <p>
              Research begins with a question. We help you find where yours
              could lead.
            </p>
            <div
              className="research-illustration"
              role="img"
              aria-label="Editorial illustration of a notebook, microscope, and scientific instruments"
            />
          </div>
          <ol className="steps">
            <li>
              <span className="step-icon">
                <MagnifyingGlass size={24} />
              </span>
              <div>
                <h3>Start with what interests you.</h3>
                <p>
                  A topic, a question, or a professor’s name. Add a résumé if
                  you want to; your interests lead the way.
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <BookOpen size={24} />
              </span>
              <div>
                <h3>Make sense of the research.</h3>
                <p>
                  Read plain-language explanations, follow original sources, and
                  compare the questions different researchers ask.
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <EnvelopeSimple size={24} />
              </span>
              <div>
                <h3>Find your next step.</h3>
                <p>
                  Keep a shortlist and prepare individual email drafts. Check
                  the public contact route before reaching out.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="trust-section">
          <div className="container trust-inner">
            <div>
              <p className="eyebrow">Built around your judgment</p>
              <h2>
                A promising connection.
                <br />
                An honest explanation.
              </h2>
            </div>
            <div className="trust-copy">
              <p>
                A research interest is not an open position. You will see what
                the sources support, what is unknown, and where to learn more.
              </p>
              <div className="row wrap">
                <Badge tone="positive">Explicitly supported</Badge>
                <Badge tone="negative">Not supported</Badge>
                <Badge>Not stated</Badge>
              </div>
              <p className="small">
                This first build includes a small, source-checked collection.
                Live campus-wide discovery and school email connection are still
                being developed.
              </p>
            </div>
          </div>
        </section>
        <section id="questions" className="container faq-section">
          <h2>A few things you might be wondering.</h2>
          <div className="faq-list">
            {[
              [
                "Do I need a résumé or research experience?",
                "No. A topic, a question, or a researcher’s name is enough to start. You can add your background later, when it helps you explain your interests.",
              ],
              [
                "Can I explore outside my major?",
                "Yes. Research often crosses departments. The collection is organized around interests, and your major does not restrict what you can explore. This first build does not yet provide a complete campus search.",
              ],
              [
                "Does a recommendation mean a lab is hiring?",
                "No. It means the research could be worth understanding. We show the publicly stated recruitment status and keep missing information marked as unknown.",
              ],
              [
                "Can this send emails from my school account?",
                "Email drafting and preview are available. UW Microsoft 365 verification and sending are not connected in this build. No message is sent, and no connection or delivery status is simulated.",
              ],
              [
                "Where is my work saved?",
                "Searches, saved researchers, notes, and drafts stay in this browser. They are not synced across devices. Clearing browser data removes them. Uploaded résumé files are not saved or attached to email automatically.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="faq-plus">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="container final-cta">
          <h2>
            There is a question
            <br />
            with your name on it.
          </h2>
          <LinkButton href="/explore" variant="secondary">
            Get Started <ArrowRight size={18} />
          </LinkButton>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <p>
            An independent student project for UW-Madison.
            <br />
            Not an official university service.
          </p>
          <div>
            <Link href="/components">Design system</Link>
            <a
              href="https://wiscience.wisc.edu/resources/undergrad-resources/finding-a-mentor/"
              target="_blank"
              rel="noreferrer"
            >
              UW research guide <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
