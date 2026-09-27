"use client";
import { useEffect } from "react";
import { useLocale } from "../locale";
import {
  ArrowUpRight,
  BookmarkSimple,
  EnvelopeSimple,
  Scales,
} from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import { researchTopicLabels } from "@/lib/research-topic-labels";
import { researcherWebsiteKind } from "@/lib/researcher-website";
import {
  Badge,
  Button,
  Dialog,
  LinkButton,
  Notice,
  Textarea,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import type { Researcher } from "@/lib/types";
import {
  UndergraduateEvidence,
  UndergraduateContactOptions,
} from "./undergraduate-evidence";
export function ResearcherDialog({
  id,
  onClose,
  landingPreview = false,
}: {
  id: string | null;
  onClose: () => void;
  landingPreview?: boolean;
}) {
  const { t, locale } = useLocale();
  const { workspace, setWorkspace } = useWorkspace();
  const r = id ? researcherById(workspace, id) : undefined;
  const { toggleSave, toggleCompare, prepareDrafts } = useResearchActions();
  useEffect(() => {
    if (!id || landingPreview) return;
    const controller = new AbortController();
    fetch("/api/catalog?id=" + encodeURIComponent(id), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { records?: Researcher[] } | null) => {
        const latest = data?.records?.find((person) => person.id === id);
        if (latest && !controller.signal.aborted)
          setWorkspace((w) => ({
            ...w,
            catalog: [
              ...(w.catalog || []).filter((person) => person.id !== id),
              latest,
            ],
          }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [id, landingPreview, setWorkspace]);
  if (!r) return null;
  const displayedTopics = researchTopicLabels(r.keywords, locale);
  const websiteKind = researcherWebsiteKind(r);
  const visibleSources = r.undergraduate
    ? r.sources.filter(
        (source) =>
          !source.note.startsWith("Public page read for independent") ||
          r.undergraduate!.attempts.some(
            (attempt) =>
              attempt.status === "read" && attempt.url === source.url,
          ) ||
          [
            r.undergraduate!.supervision,
            r.undergraduate!.applications,
            r.undergraduate!.openings,
            r.undergraduate!.credit,
            r.undergraduate!.pay,
          ].some((fact) =>
            fact.evidence.some((evidence) => evidence.sourceId === source.id),
          ),
      )
    : r.sources;
  return (
    <Dialog
      open={!!r}
      onOpenChange={(value) => !value && onClose()}
      title={r.name}
      description={`${r.department} · UW-Madison`}
      wide
    >
      <div className="detail-body">
        {r.lab && <Badge>{r.lab}</Badge>}
        <h2 className="detail-title">{r.title}</h2>
        <p className="detail-lead">
          {locale === "zh" ? r.summaryZh : r.summary}
        </p>
        {r.coverage && r.coverage.level !== "profile" && (
          <Notice>
            {r.coverage.level === "roster"
              ? t(
                  "The official roster confirms this appointment. Research details and contacts are still being completed; this does not mean this person has no research.",
                  "官方名录已确认该任职记录，研究详情和联系方式仍待补充；这不代表这位教授没有研究。",
                )
              : t(
                  "This catalog includes research topics and publications from the university research index. Website reviews and undergraduate opportunities are verified separately below.",
                  "名录收录了学校研究平台的研究主题和论文。个人网站、实验室及本科科研机会另外核查，请查看下方分项证据。",
                )}
          </Notice>
        )}
        {r.relevance && (
          <Notice title={t("Connection to your interests", "与你兴趣的联系")}>
            {r.relevance}
          </Notice>
        )}
        {r.provenance !== "live" && (
          <Notice>
            This is a preserved preview example. Run a live search to check
            current information before preparing contact.
          </Notice>
        )}
        <div className="row wrap">
          <Button variant="secondary" onClick={() => toggleSave(r.id)}>
            <BookmarkSimple
              weight={workspace.saved.includes(r.id) ? "fill" : "regular"}
              size={18}
            />
            {workspace.saved.includes(r.id)
              ? t("Saved to shortlist", "已收藏")
              : t("Save to shortlist", "加入收藏")}
          </Button>
          <Button variant="ghost" onClick={() => toggleCompare(r.id)}>
            <Scales size={19} />
            {workspace.comparison.includes(r.id)
              ? t("Remove from comparison", "移出比较")
              : t("Add to comparison", "加入比较")}
          </Button>
        </div>
        <UndergraduateEvidence researcher={r} />
        <section className="detail-section">
          <h3>{t("Your next step", "下一步")}</h3>
          <Notice>
            {r.undergraduate
              ? locale === "zh"
                ? r.undergraduate.applications.detailZh
                : r.undergraduate.applications.detail
              : r.contact.note}
          </Notice>
          <UndergraduateContactOptions researcher={r} />
          {websiteKind === "roster" && (
            <p className="small muted">
              {t(
                "An individual profile has not been verified yet. The link below opens the university-wide faculty roster.",
                "个人主页尚未核实。下方链接打开的是全校教师名录。",
              )}
            </p>
          )}
          <div className="row wrap detail-cta">
            {landingPreview ? (
              <LinkButton href="/explore">
                {t("Get Started", "开始使用")}
              </LinkButton>
            ) : (
              canEmail(r) && (
                <Button
                  onClick={() => {
                    prepareDrafts([r.id]);
                    onClose();
                  }}
                >
                  <EnvelopeSimple size={18} />
                  {t("Prepare an inquiry", "准备咨询邮件")}
                </Button>
              )
            )}
            {!r.undergraduate?.contactOptions.some(
              (option) => option.url === r.contact.url,
            ) && (
              <LinkButton href={r.contact.url} external variant="secondary">
                {websiteKind === "roster"
                  ? t("View official faculty roster", "查看官方教师名录")
                  : r.contact.route === "form"
                    ? t("Open application form", "打开申请表")
                    : r.contact.route === "program"
                      ? t("View program application", "查看项目申请")
                      : websiteKind === "research-index"
                        ? t(
                            "View university research profile",
                            "查看学校研究档案",
                          )
                        : websiteKind === "profile"
                          ? t("View faculty profile", "查看教授个人主页")
                          : t("Visit original website", "访问原始网站")}
              </LinkButton>
            )}
          </div>
        </section>
        {(!r.coverage || r.coverage.level === "profile") && (
          <section className="detail-section">
            <h3>
              {t("The question behind the research", "研究试图回答什么问题")}
            </h3>
            <p>{r.question}</p>
            <div className="explanation-box">
              <span className="tiny-label">
                {t("AN EXPLANATORY EXAMPLE", "帮助理解的类比示例")}
              </span>
              <p>{r.example}</p>
            </div>
          </section>
        )}
        {(!r.coverage || r.coverage.level === "profile") && (
          <section className="detail-section">
            <h3>{t("How the research works", "研究方法")}</h3>
            <p>{r.methods}</p>
            <p className="small muted">
              Plain-language interpretation of the sources below. No full-paper
              analysis is claimed.
            </p>
          </section>
        )}
        {!!displayedTopics.length && (
          <section className="detail-section">
            <h3>{t("Research topics", "研究主题")}</h3>
            <p>{displayedTopics.join(" · ")}</p>
          </section>
        )}
        {!!r.publications?.length && (
          <section className="detail-section">
            <h3>{t("Publications and research outputs", "论文与研究成果")}</h3>
            <p className="small muted">
              {t(
                "Titles and dates from the university research index; these are research evidence, not evidence of an open position.",
                "以下标题和年份来自学校研究平台，可用于了解研究，不代表正在招募。",
              )}
            </p>
            <ul className="publication-list">
              {r.publications.map((p) => (
                <li key={p.title}>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {p.title} ↗
                    </a>
                  ) : (
                    p.title
                  )}
                  {p.year && <small> · {p.year}</small>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="detail-section">
          <h3>{t("Sources you can check", "可核查的原始来源")}</h3>
          <div className="sources">
            {visibleSources.map((s) => (
              <div key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  <span>{s.title}</span>
                  <ArrowUpRight size={16} />
                </a>
                <p>{s.note}</p>
                {s.excerpt && <p className="small">“{s.excerpt}”</p>}
                <small>
                  Checked {new Date(s.checkedAt).toLocaleDateString()} ·
                  Public-source snapshot
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="detail-section">
          <Textarea
            id={`note-${r.id}`}
            label={t("Your own notes", "你的笔记")}
            hint={t(
              "Private to this browser. Notes are not automatically included in emails.",
              "仅保存在此浏览器，笔记不会自动写入邮件。",
            )}
            rows={3}
            value={workspace.notes[r.id] || ""}
            onChange={(e) =>
              setWorkspace((w) => ({
                ...w,
                notes: { ...w.notes, [r.id]: e.target.value },
              }))
            }
          />
        </section>
      </div>
    </Dialog>
  );
}
