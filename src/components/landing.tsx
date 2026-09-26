"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CaretRight, Compass } from "@phosphor-icons/react";
import { AppleHeader } from "./apple-header";
import { LinkButton } from "./ui";
import { useWorkspace } from "./explorer/provider";

const questions = [
  [
    "Do I need a résumé or research experience?",
    "No. A topic, a question, or a researcher’s name is enough to start. Add your background later, when it helps you explain your interests.",
  ],
  [
    "Can I explore outside my major?",
    "Yes. Your major does not restrict what you can explore. This first build includes a small, source-checked collection and does not yet provide a complete campus search.",
  ],
  [
    "Does a recommendation mean a lab is hiring?",
    "No. It means the research could be worth understanding. We show publicly stated recruitment information and mark missing information as unknown.",
  ],
  [
    "Can this send emails from my school account?",
    "Drafting and preview are available. UW Microsoft 365 verification and sending are not connected in this build. No message is sent, and delivery status is never simulated.",
  ],
  [
    "Where is my work saved?",
    "Your searches, shortlist, notes, and drafts stay in this browser. They do not sync across devices. Clearing browser data removes them. Résumé files are not saved or attached to email automatically.",
  ],
];

export default function Landing() {
  const { workspace } = useWorkspace();
  return (
    <div className="apple-landing">
      <AppleHeader landing />
      <main id="main">
        <div className="apple-announcement">
          A starting point for UW–Madison students. No research experience
          required.
        </div>
        <section className="apple-product-tile apple-hero">
          <div className="apple-tile-copy">
            <h1>
              Your curiosity.
              <br />A world of possibilities.
            </h1>
            <p className="apple-lead">Find your first research experience.</p>
            <div className="apple-tile-actions">
              <LinkButton href="/explore">
                {workspace.searched ? "Continue exploring" : "Get Started"}
              </LinkButton>
              <a className="apple-text-link" href="#how-it-works">
                See how it works <CaretRight size={18} />
              </a>
            </div>
          </div>
          <Link
            className="apple-product-image apple-hero-image"
            href="/explore"
            aria-label="Open Research Explorer"
          >
            <Image
              src="/apple-explore-preview.webp"
              alt="Research Explorer showing source-checked research in robotics and accessible AI at UW–Madison"
              width={1184}
              height={756}
              priority
              sizes="(max-width: 640px) 94vw, (max-width: 1200px) 88vw, 1080px"
            />
          </Link>
        </section>
        <section
          className="apple-product-tile apple-dark-tile"
          id="how-it-works"
        >
          <div className="apple-tile-copy">
            <h2>
              Understand the work.
              <br />
              See the connection.
            </h2>
            <p className="apple-lead">
              Real research. In words that make sense.
            </p>
            <Link
              className="apple-text-link"
              href="/explore?researcher=yuhang-zhao"
            >
              Explore an example <CaretRight size={18} />
            </Link>
          </div>
          <Link
            className="apple-product-image apple-detail-image"
            href="/explore?researcher=yuhang-zhao"
            aria-label="Read Yuhang Zhao’s research details"
          >
            <Image
              src="/apple-detail-preview.webp"
              alt="A real research detail view with a plain-language explanation, participation conditions, and original sources"
              width={800}
              height={810}
              sizes="(max-width: 640px) 94vw, 900px"
            />
          </Link>
        </section>
        <div className="apple-tile-pair">
          <section className="apple-product-tile apple-shortlist-tile">
            <h2>
              Your shortlist.
              <br />A clearer picture.
            </h2>
            <p className="apple-tile-description">
              Compare the questions. Find your connection.
            </p>
            <Link className="apple-text-link" href="/explore/compare">
              Compare research <CaretRight size={17} />
            </Link>
            <div className="apple-feature-visual">
              <Image
                src="/apple-compare-preview.webp"
                alt="Side-by-side comparison of two researchers, their research questions, and participation information"
                width={1184}
                height={1340}
                sizes="(max-width: 833px) 90vw, 44vw"
              />
            </div>
          </section>
          <section className="apple-product-tile apple-mail-tile">
            <h2>
              A thoughtful hello.
              <br />
              In your own words.
            </h2>
            <p className="apple-tile-description">
              Prepare a personal draft for each researcher.
            </p>
            <Link className="apple-text-link" href="/explore/mail">
              Explore email drafts <CaretRight size={17} />
            </Link>
            <div className="apple-feature-visual">
              <Image
                src="/apple-mail-preview.webp"
                alt="Email workspace with an individual editable research inquiry draft and a preview action"
                width={1184}
                height={1202}
                sizes="(max-width: 833px) 90vw, 44vw"
              />
            </div>
          </section>
        </div>
        <section className="apple-process">
          <h2>
            From an interest.
            <br />
            To a next step.
          </h2>
          <ol>
            <li>
              <span>01</span>
              <h3>Start with a question.</h3>
              <p>
                A topic, a professor’s name, or something you want to
                understand. Your curiosity leads.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Explore the possibilities.</h3>
              <p>
                Read clear explanations. Check the sources. Compare research
                that interests you.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Make it personal.</h3>
              <p>
                Keep a shortlist and prepare your introduction. Follow each
                lab’s public contact route.
              </p>
            </li>
          </ol>
        </section>
        <section id="questions" className="apple-faq">
          <h2>A few good questions.</h2>
          <div className="faq-list">
            {questions.map(([q, a]) => (
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
        <section className="apple-product-tile apple-last-tile">
          <Compass size={44} weight="regular" />
          <h2>
            Big discoveries.
            <br />
            Small first steps.
          </h2>
          <p className="apple-lead">Yours can start here.</p>
          <LinkButton href="/explore">Get Started</LinkButton>
        </section>
      </main>
      <footer className="apple-footer">
        <div className="apple-footer-inner">
          <p>
            A research connection is not an offer of a position. Recruitment,
            credit, and compensation are only confirmed when public sources
            explicitly support them.
          </p>
          <p>
            This first build includes a small, source-checked collection. Live
            campus-wide discovery and UW email connection are still being
            developed. Email drafting is available; sending is not connected.
          </p>
          <div className="apple-footer-links">
            <Link href="/">Research Explorer</Link>
            <Link href="/components">Component library</Link>
            <a
              href="https://wiscience.wisc.edu/resources/undergrad-resources/finding-a-mentor/"
              target="_blank"
              rel="noreferrer"
            >
              UW research guide <ArrowUpRight size={13} />
            </a>
          </div>
          <p className="apple-legal">
            An independent student project for UW–Madison. Not an official
            university service.
          </p>
        </div>
      </footer>
    </div>
  );
}
