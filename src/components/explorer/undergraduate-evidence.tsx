"use client";
import type { Researcher } from "@/lib/types";
import { Badge, LinkButton, Notice } from "@/components/ui";
import { useLocale } from "../locale";

export function UndergraduateBadges({
  researcher: r,
}: {
  researcher: Researcher;
}) {
  const { t } = useLocale();
  const v = r.undergraduate;
  if (!v)
    return (
      <Badge>
        {t("Undergraduate research not yet reviewed", "本科科研待专项核查")}
      </Badge>
    );
  return (
    <>
      {v.supervision.value === "yes" && (
        <Badge tone="positive">
          {t("Undergraduate mentoring evidence", "有本科科研指导证据")}
        </Badge>
      )}
      {v.applications.value === "yes" && (
        <Badge>
          {t("Accepts research inquiries / applications", "接受科研咨询或申请")}
        </Badge>
      )}
      <Badge
        tone={
          v.openings.value === "no"
            ? "negative"
            : v.openings.value === "yes"
              ? "positive"
              : "neutral"
        }
      >
        {v.openings.value === "yes"
          ? t("Current openings reported", "明确有当前名额")
          : v.openings.value === "no"
            ? t("No current openings", "当前无名额")
            : t("Current openings unknown", "当前名额未知")}
      </Badge>
      {v.status === "failed" && (
        <Badge tone="negative">
          {t("Latest review incomplete", "最新核查未完成")}
        </Badge>
      )}
    </>
  );
}

export function UndergraduateEvidence({
  researcher: r,
}: {
  researcher: Researcher;
}) {
  const { t, locale } = useLocale();
  const v = r.undergraduate;
  return (
    <section className="detail-section">
      <h3>
        {t("Undergraduate research: separate findings", "本科科研：分项核实")}
      </h3>
      <p className="small muted">
        {t(
          "Mentoring experience, accepting applications and available places are different. Unknown means no conclusive evidence in the pages checked.",
          "带过本科生、接受申请和当前有空位是三个不同结论。未知表示已查页面不足以确认。",
        )}
      </p>
      {!v ? (
        <Notice>
          {t(
            "This professor has not completed the expanded website review yet. Earlier catalog information cannot confirm current undergraduate openings.",
            "这位教授尚未完成个人网站与实验室页面的扩展核查，旧资料不能确认当前本科生名额。",
          )}
        </Notice>
      ) : (
        <>
          <p className="small muted">
            {v.checkedAt
              ? t("Evidence checked", "证据核查于") +
                " " +
                new Date(v.checkedAt).toLocaleString()
              : t("No verified findings yet", "尚无已核实结论")}{" "}
            ·{" "}
            {v.status === "checked"
              ? t("Discovered pages checked", "已检查本轮发现的页面")
              : v.status === "partial"
                ? t("Partial website coverage", "网页覆盖尚不完整")
                : t(
                    "Latest attempt incomplete; previous evidence may be shown",
                    "最新核查未完成；可能显示此前证据",
                  )}
          </p>
          <div className="condition-list">
            {(
              [
                [
                  "supervision",
                  "Undergraduate research mentoring",
                  "本科科研指导经历",
                ],
                [
                  "applications",
                  "Accepting inquiries / applications",
                  "是否接受咨询或申请",
                ],
                [
                  "openings",
                  "Current undergraduate openings",
                  "当前是否有本科生名额",
                ],
                ["credit", "Research for credit", "科研学分"],
                ["pay", "Paid undergraduate research", "本科科研薪酬"],
              ] as const
            ).map(([key, en, zh]) => {
              const fact = v[key];
              return (
                <div key={key}>
                  <div className="row between">
                    <strong>{t(en, zh)}</strong>
                    <Badge
                      tone={
                        fact.value === "yes"
                          ? "positive"
                          : fact.value === "no"
                            ? "negative"
                            : "neutral"
                      }
                    >
                      {fact.value === "yes"
                        ? t("Confirmed yes", "已确认有")
                        : fact.value === "no"
                          ? t("Explicitly no", "明确没有")
                          : t("Unknown", "未知")}
                    </Badge>
                  </div>
                  <p>{locale === "zh" ? fact.detailZh : fact.detail}</p>
                  {fact.evidence.map((e, i) => {
                    const source = r.sources.find((s) => s.id === e.sourceId);
                    return (
                      <p className="small" key={e.sourceId + ":" + i}>
                        “{e.quote}”{" "}
                        {source && (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {t("Source ↗", "原文 ↗")}
                          </a>
                        )}
                        {e.period === "historical"
                          ? t(" · Historical evidence", " · 历史证据")
                          : ""}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <details className="verification-details">
            <summary>
              {t("Pages checked and coverage limits", "检查过的页面与核查限制")}{" "}
              ({v.attempts.filter((a) => a.status === "read").length}/
              {v.attempts.length})
            </summary>
            <p className="small muted">
              {t(
                "This is a dated review of discovered public pages, not a guarantee that every page on the internet was found. Forms are linked, never submitted.",
                "这是对已发现公开网页的定期核查，不能保证找到了互联网上的每一页。申请表仅提供链接，不会自动提交。",
              )}
            </p>
            <ul>
              {v.attempts.map((a, i) => (
                <li key={a.url + ":" + i}>
                  <a href={a.url} target="_blank" rel="noreferrer">
                    {a.url}
                  </a>{" "}
                  ·{" "}
                  {a.status === "read"
                    ? t("Read", "已读取")
                    : a.status === "failed"
                      ? t("Read failed", "读取失败")
                      : t("Not verified", "尚未核实")}
                  {a.status !== "read" && (
                    <p className="small muted">{a.reason}</p>
                  )}
                </li>
              ))}
            </ul>
            {v.limitations.map((limit, i) => (
              <p key={i} className="small muted">
                {limit}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}

export function UndergraduateContactOptions({
  researcher: r,
}: {
  researcher: Researcher;
}) {
  const { t, locale } = useLocale();
  const v = r.undergraduate;
  if (!v) return null;
  const options = [...v.contactOptions].sort(
    (a, b) =>
      Number(b.required) - Number(a.required) ||
      Number(a.kind === "email") - Number(b.kind === "email"),
  );
  return (
    <>
      {!!options.length && (
        <div className="condition-list">
          {options.map((option, i) => {
            const source = r.sources.find((s) => s.id === option.sourceId);
            return (
              <div key={option.url + ":" + i}>
                <div className="row wrap">
                  <LinkButton
                    href={option.url}
                    external
                    variant={option.required ? "primary" : "secondary"}
                  >
                    {option.status === "closed"
                      ? t("View the application portal", "查看申请入口")
                      : option.kind === "form"
                        ? t("Open application form", "填写申请表")
                        : option.kind === "instructions"
                          ? t("Read application instructions", "查看申请说明")
                          : t("Email the professor", "邮件联系教授")}
                  </LinkButton>
                  {option.status === "closed" && (
                    <Badge tone="negative">
                      {t(
                        "This application cycle is closed",
                        "当前申请轮次已关闭",
                      )}
                    </Badge>
                  )}
                  {option.required && (
                    <Badge>{t("Use this route first", "按要求优先使用")}</Badge>
                  )}
                </div>
                <p>{locale === "zh" ? option.labelZh : option.label}</p>
                <p className="small">
                  “{option.quote}”{" "}
                  {source && (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {t("Instructions source ↗", "要求来源 ↗")}
                    </a>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {!!v.websites.length && (
        <div className="row wrap detail-cta">
          {v.websites
            .filter(
              (s, i, all) => all.findIndex((x) => x.kind === s.kind) === i,
            )
            .map((s) => (
              <a
                className="quiet-link"
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.kind === "personal"
                  ? t("Personal website ↗", "个人网站 ↗")
                  : s.kind === "lab"
                    ? t("Lab website ↗", "实验室网站 ↗")
                    : s.kind === "opportunities"
                      ? t("Opportunities / instructions ↗", "机会与申请说明 ↗")
                      : s.kind === "team"
                        ? t("Research team ↗", "研究团队 ↗")
                        : t("University profile ↗", "学校主页 ↗")}
              </a>
            ))}
        </div>
      )}
    </>
  );
}
