"use client";
import { useLocale } from "../locale";
import { useState } from "react";
import { Scales, X, BookmarkSimple, ArrowRight } from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  LinkButton,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import { ResearcherDialog } from "./researcher-dialog";
import {
  UndergraduateBadges,
  UndergraduateContactOptions,
} from "./undergraduate-evidence";
export function CompareView() {
  const { t, locale } = useLocale();
  const { workspace: w } = useWorkspace();
  const { toggleSave, toggleCompare, prepareDrafts } = useResearchActions();
  const [detail, setDetail] = useState<string | null>(null);
  const chosen = w.comparison
    .map((id) => researcherById(w, id))
    .filter((r) => !!r);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">
          {t(
            "Different questions. Different possibilities.",
            "不同研究方向，不同可能性。",
          )}
        </p>
        <h1>
          {t("Find your own connection.", "找到与你的兴趣相契合的研究。")}
        </h1>
        <p>
          {t(
            "Compare up to three researchers by the same questions. There is no single “best” choice.",
            "使用相同维度比较最多三位教授，帮助你做出自己的选择。",
          )}
        </p>
      </div>
      {chosen.length > 0 ? (
        <>
          <div className="row between comparison-summary">
            <span>
              {chosen.length} of 3 comparison spaces used
              {chosen.length === 1 && ". Add another researcher to compare."}
            </span>
            <LinkButton href="/explore/results" variant="secondary">
              {t("Add a researcher", "添加教授")}
            </LinkButton>
          </div>
          <div
            className="comparison-grid"
            style={{ "--compare-count": chosen.length } as React.CSSProperties}
          >
            {chosen.map((r) => (
              <article className="comparison-column" key={r.id}>
                <header>
                  <div className="row between">
                    <span className="initials">{r.initials}</span>
                    <IconButton
                      label={`Remove ${r.name} from comparison`}
                      onClick={() => toggleCompare(r.id)}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                  <h2>{r.name}</h2>
                  <p>{r.department}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetail(r.id)}
                  >
                    {t("View research", "查看研究详情")}{" "}
                    <ArrowRight size={15} />
                  </Button>
                </header>
                <section>
                  <h3>{t("The research question", "研究问题")}</h3>
                  <p>{r.question}</p>
                </section>
                <section>
                  <h3>{t("Research approach", "研究方法")}</h3>
                  <p>{r.methods}</p>
                </section>
                <section>
                  <h3>{t("Connection to your interests", "与你兴趣的联系")}</h3>
                  <p>{r.summary}</p>
                </section>
                <section>
                  <h3>{t("Undergraduate research", "本科科研状态")}</h3>
                  <div className="row wrap">
                    <UndergraduateBadges researcher={r} />
                  </div>
                  <p>
                    {t("Academic credit: ", "科研学分：")}
                    {r.undergraduate?.credit.value === "yes"
                      ? t("Confirmed", "已确认支持")
                      : r.undergraduate?.credit.value === "no"
                        ? t("Not offered", "明确不提供")
                        : t("Unknown", "未知")}
                    <br />
                    {t("Paid research: ", "科研薪酬：")}
                    {r.undergraduate?.pay.value === "yes"
                      ? t("Confirmed", "已确认支持")
                      : r.undergraduate?.pay.value === "no"
                        ? t("Not offered", "明确不提供")
                        : t("Unknown", "未知")}
                  </p>
                </section>
                <section>
                  <h3>What you still need to know</h3>
                  <p>
                    {r.recruitment === "closed"
                      ? "Whether the group opens opportunities in a future cycle."
                      : "Current availability, undergraduate requirements, time commitment, and the application process."}
                  </p>
                </section>
                <section>
                  <h3>{t("Next step", "下一步")}</h3>
                  <p>
                    {r.undergraduate
                      ? locale === "zh"
                        ? r.undergraduate.applications.detailZh
                        : r.undergraduate.applications.detail
                      : r.contact.note}
                  </p>
                  <UndergraduateContactOptions researcher={r} />
                </section>
                <footer>
                  <Button variant="secondary" onClick={() => toggleSave(r.id)}>
                    <BookmarkSimple
                      size={17}
                      weight={w.saved.includes(r.id) ? "fill" : "regular"}
                    />
                    {w.saved.includes(r.id) ? "Saved" : "Save researcher"}
                  </Button>
                  {canEmail(r) && (
                    <Button
                      variant="ghost"
                      onClick={() => prepareDrafts([r.id])}
                    >
                      Prepare inquiry <ArrowRight size={16} />
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Scales size={34} />}
          title="A little perspective helps."
          action={
            <LinkButton href="/explore/results">
              Find researchers <ArrowRight size={17} />
            </LinkButton>
          }
        >
          Use the comparison icon on a research card to bring two or three
          possibilities together.
        </EmptyState>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
