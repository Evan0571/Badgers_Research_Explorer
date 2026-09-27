"use client";
import {
  ArrowRight,
  ArrowUpRight,
  BookmarkSimple,
  Scales,
} from "@phosphor-icons/react";
import { useLocale } from "../locale";
import { academicTitle } from "@/lib/research-metadata";
import type { Researcher } from "@/lib/types";
import { Badge, Button, IconButton } from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import { UndergraduateBadges } from "./undergraduate-evidence";
export function ResearchCard({
  researcher: r,
  onOpen,
}: {
  researcher: Researcher;
  onOpen: (id: string) => void;
}) {
  const { workspace } = useWorkspace();
  const { toggleSave, toggleCompare } = useResearchActions();
  const { t, locale } = useLocale();
  const chinese = locale === "zh";
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
        <h2>{r.name}</h2>
      </button>
      <p className="academic-title">
        {academicTitle(r) || t("Academic title not stated", "职称未公开说明")}
      </p>
      {r.coverage && (
        <p className="profile-evidence-label">
          {r.coverage.level === "roster"
            ? t(
                "Official roster · research details pending",
                "官方名录已收录 · 研究资料待补充",
              )
            : r.coverage.level === "research-index"
              ? t(
                  "Research topics / publications indexed",
                  "已有研究主题或论文证据",
                )
              : t("Individual profile checked", "已核验个人主页")}
          {r.coverage.category === "emeritus"
            ? t(" · Emeritus", " · 荣休")
            : ""}
        </p>
      )}
      {r.title &&
        r.title !== academicTitle(r) &&
        r.title !== r.name &&
        !/title not stated|faculty profile/i.test(r.title) && (
          <h3 className="research-heading">{r.title}</h3>
        )}
      <p className="research-summary">{chinese ? r.summaryZh : r.summary}</p>
      <div className="researcher-byline">
        <span className="initials">{r.initials}</span>
        <div>
          <strong>{r.name}</strong>
          <small>{r.lab}</small>
        </div>
      </div>
      <div className="row wrap conditions">
        <UndergraduateBadges researcher={r} />
        <span className="small muted">
          {t("Credit:", "学分：")}{" "}
          {r.credit.value === "supported"
            ? t("supported", "支持")
            : r.credit.value === "not-supported"
              ? t("not supported", "不支持")
              : t("not stated", "未说明")}
        </span>
      </div>
      <div className="card-reason">
        <span>{t("Why explore this", "为何值得了解")}</span>
        <p>
          {r.topics.filter((t) => workspace.topics.includes(t)).length > 1
            ? t(
                "Connects more than one of your selected interests. ",
                "涉及多个已选研究兴趣。",
              )
            : ""}
          {r.relevance ||
            (/^Explore the source-backed/.test(r.question)
              ? t(
                  "Review the research topics and publications below to assess the fit.",
                  "可以查看下方研究主题和论文，判断是否符合你的兴趣。",
                )
              : r.question)}
        </p>
      </div>
      <p className="source-date">
        {t("Source checked", "来源核查")} ·{" "}
        {r.sources.length
          ? new Date(
              Math.min(...r.sources.map((s) => Date.parse(s.checkedAt))),
            ).toLocaleDateString()
          : t("Unknown", "未知")}
      </p>
      <footer className="card-actions">
        <Button variant="ghost" size="sm" onClick={() => onOpen(r.id)}>
          {t("Understand the research", "了解研究详情")}{" "}
          <ArrowRight size={16} />
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
