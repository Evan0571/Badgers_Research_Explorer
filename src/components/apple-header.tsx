"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkSimple,
  Compass,
  List,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { IconButton, LinkButton, ThemeToggle } from "./ui";

const links = [
  ["Explore", "/explore"],
  ["My shortlist", "/explore/saved"],
  ["Compare", "/explore/compare"],
  ["Emails", "/explore/mail"],
  ["Contact history", "/explore/history"],
  ["Components", "/components"],
];

export function AppleHeader({ landing = false }: { landing?: boolean }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  return (
    <header
      className="apple-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMenu(false);
      }}
    >
      <div className="apple-global-nav">
        <div className="apple-nav-inner">
          <Link
            className="apple-mark"
            href="/"
            aria-label="Research Explorer home"
            onClick={() => setMenu(false)}
          >
            <Compass size={22} weight="regular" />
          </Link>
          <nav
            id="apple-main-nav"
            aria-label="Main navigation"
            className={
              menu ? "apple-global-links is-open" : "apple-global-links"
            }
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="apple-nav-tools">
            <Link href="/explore" aria-label="Search research">
              <MagnifyingGlass size={17} />
            </Link>
            <Link href="/explore/saved" aria-label="Open shortlist">
              <BookmarkSimple size={17} />
            </Link>
            <IconButton
              className="apple-menu-button"
              label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              aria-controls="apple-main-nav"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={21} /> : <List size={21} />}
            </IconButton>
          </div>
        </div>
      </div>
      <div className="apple-subnav">
        <div className="apple-subnav-inner">
          <Link href="/" className="apple-product-name">
            Research Explorer
          </Link>
          <div className="apple-subnav-actions">
            {landing ? (
              <>
                <a href="#how-it-works" className="apple-subnav-detail">
                  How it works
                </a>
                <a href="#questions" className="apple-subnav-detail">
                  Questions
                </a>
              </>
            ) : (
              <span className="apple-subnav-detail apple-guest-label">
                Guest workspace · Saved in this browser
              </span>
            )}
            <ThemeToggle />
            {landing && <LinkButton href="/explore">Get Started</LinkButton>}
          </div>
        </div>
      </div>
    </header>
  );
}
