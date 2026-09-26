"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkSimple,
  Compass,
  EnvelopeSimple,
  ClockCounterClockwise,
  Scales,
  ArrowUpRight,
  HardDrive,
} from "@phosphor-icons/react";
import { Brand, Notice, ThemeToggle } from "@/components/ui";
import { useWorkspace } from "./provider";
export function ExplorerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { workspace, ready, storageError } = useWorkspace();
  const navigation = [
    { href: "/explore", label: "Explore", icon: Compass, count: 0 },
    {
      href: "/explore/saved",
      label: "My shortlist",
      icon: BookmarkSimple,
      count: workspace.saved.length,
    },
    {
      href: "/explore/compare",
      label: "Compare",
      icon: Scales,
      count: workspace.comparison.length,
    },
    {
      href: "/explore/mail",
      label: "Emails",
      icon: EnvelopeSimple,
      count: workspace.drafts.length,
    },
    {
      href: "/explore/history",
      label: "Contact history",
      icon: ClockCounterClockwise,
      count: 0,
    },
  ];
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand compact />
        <p className="sidebar-campus">UW-Madison</p>
        <nav aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href ? "sidebar-link active" : "sidebar-link"
              }
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
              {count > 0 && <span className="nav-count">{count}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="https://wiscience.wisc.edu/resources/undergrad-resources/finding-a-mentor/"
            target="_blank"
            rel="noreferrer"
          >
            Finding a research mentor <ArrowUpRight size={15} />
          </a>
          <div className="local-status">
            <HardDrive size={17} />
            <div>
              <strong>Guest workspace</strong>
              <small>Saved in this browser</small>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>Your research, at your pace.</span>
          <span className="collection-label">
            Source-checked starter collection
          </span>
        </header>
        <main id="main" className="workspace-main">
          {storageError && <Notice tone="error">{storageError}</Notice>}
          {ready ? (
            children
          ) : (
            <div className="loading-state" aria-busy="true">
              <div className="skeleton title-skeleton" />
              <div className="skeleton block-skeleton" />
              <p>Restoring your workspace…</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
