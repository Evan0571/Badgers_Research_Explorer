"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkSimple,
  UsersThree,
  MagnifyingGlass,
  ListBullets,
  EnvelopeSimple,
  ClockCounterClockwise,
  Scales,
  ArrowUpRight,
  HardDrive,
  GearSix,
} from "@phosphor-icons/react";
import { Brand, Notice, ThemeToggle, Button } from "@/components/ui";
import { errorCopy } from "@/lib/error-copy";
import { LanguageToggle, useLocale } from "../locale";
import { useWorkspace } from "./provider";
export function ExplorerShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const { workspace, ready, storageError, jobs } = useWorkspace();
  const navigation = [
    {
      href: "/explore/faculty",
      label: t("Faculty catalog", "全校教授名录"),
      icon: UsersThree,
      count: 0,
    },
    {
      href: "/explore",
      label: t("Explore", "探索研究"),
      icon: MagnifyingGlass,
      count: 0,
    },
    {
      href: "/explore/results",
      label: t("Search results", "搜索结果"),
      icon: ListBullets,
      count: 0,
    },
    {
      href: "/explore/saved",
      label: t("My shortlist", "我的收藏"),
      icon: BookmarkSimple,
      count: workspace.saved.length,
    },
    {
      href: "/explore/compare",
      label: t("Compare", "比较"),
      icon: Scales,
      count: workspace.comparison.length,
    },
    {
      href: "/explore/mail",
      label: t("Emails", "邮件草稿"),
      icon: EnvelopeSimple,
      count: workspace.drafts.length,
    },
    {
      href: "/explore/history",
      label: t("Contact history", "联系记录"),
      icon: ClockCounterClockwise,
      count: 0,
    },
    {
      href: "/explore/settings",
      label: t("Settings", "设置"),
      icon: GearSix,
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
            {t("Finding a research mentor", "寻找研究导师指南")}{" "}
            <ArrowUpRight size={15} />
          </a>
          <div className="local-status">
            <HardDrive size={17} />
            <div>
              <strong>{t("Guest workspace", "访客工作区")}</strong>
              <small>{t("Saved in this browser", "保存在当前浏览器")}</small>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>
            {t("Your research, at your pace.", "按你的节奏，探索研究。")}
          </span>
          <LanguageToggle />
        </header>
        <main
          id="main"
          className={`workspace-main${pathname === "/explore" ? " workspace-main-intake" : ""}`}
        >
          {storageError && <Notice tone="error">{storageError}</Notice>}
          {jobs.draftStage && (
            <Notice>
              {t(
                "Preparing email drafts. Existing drafts remain editable.",
                "正在准备邮件草稿，已有草稿仍可编辑。",
              )}
            </Notice>
          )}
          {pathname === "/explore/mail" && jobs.draftError && (
            <Notice tone="error">
              {errorCopy(jobs.draftError, locale)}
              <Button variant="ghost" onClick={jobs.dismissDraftError}>
                {t("Dismiss", "关闭提示")}
              </Button>
            </Notice>
          )}
          {ready ? (
            children
          ) : (
            <div className="loading-state" aria-busy="true">
              <div className="skeleton title-skeleton" />
              <div className="skeleton block-skeleton" />
              <p>{t("Restoring your workspace…", "正在恢复工作区…")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
