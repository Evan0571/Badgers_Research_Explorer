"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogCoverage } from "@/lib/catalog-coverage";
import { useLocale } from "../locale";
export function CoverageSummary({ coverage }: { coverage: CatalogCoverage }) {
  const { t } = useLocale();
  return (
    <div className="catalog-coverage">
      <strong>{t("Campus catalog", "全校教授资料库")}</strong>
      <p>
        {t(
          `${coverage.total.toLocaleString()} people collected · ${coverage.researchIndexed.toLocaleString()} with research evidence · ${coverage.rosterOnly.toLocaleString()} awaiting research details`,
          `已收录 ${coverage.total.toLocaleString()} 位 · ${coverage.researchIndexed.toLocaleString()} 位有研究证据 · ${coverage.rosterOnly.toLocaleString()} 位研究资料待补充`,
        )}
      </p>
      <p className="small muted">
        {coverage.undergraduate &&
          t(
            `Undergraduate review: ${coverage.undergraduate.reviewed} with verified findings · ${coverage.undergraduate.partial} partial · ${coverage.undergraduate.pending} pending · ${coverage.undergraduate.failed} failed attempts. ${coverage.undergraduate.supervision} with mentoring evidence · ${coverage.undergraduate.applications} accept inquiries/applications · ${coverage.undergraduate.openings} report openings · ${coverage.undergraduate.forms} provide forms.`,
            `本科科研核查：${coverage.undergraduate.reviewed} 位已有核实结果（${coverage.undergraduate.partial} 位覆盖不完整）· ${coverage.undergraduate.pending} 位待查 · ${coverage.undergraduate.failed} 位最近核查失败。${coverage.undergraduate.supervision} 位有指导证据 · ${coverage.undergraduate.applications} 位接受咨询或申请 · ${coverage.undergraduate.openings} 位明确有名额 · ${coverage.undergraduate.forms} 位提供表格。`,
          )}
      </p>
      <p className="small muted">
        {t(
          "Research evidence, verified email and current openings are separate checks. An incomplete profile does not mean a person has no research.",
          "研究信息、邮箱和当前招募状态分别核验。资料尚未补齐，不代表这位教授没有研究。",
        )}
      </p>
    </div>
  );
}
export function CatalogCoverageBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [coverage, setCoverage] = useState<CatalogCoverage | null>(null);
  const { t } = useLocale();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog?summary=1", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.coverage) setCoverage(d.coverage);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return coverage ? (
    <div
      className={
        compact ? "catalog-banner catalog-banner-compact" : "catalog-banner"
      }
    >
      {compact ? (
        <p>
          {t(
            `${coverage.total.toLocaleString()} people in the campus catalog`,
            `全校资料库已收录 ${coverage.total.toLocaleString()} 位教授`,
          )}
        </p>
      ) : (
        <CoverageSummary coverage={coverage} />
      )}
      <Link href="/explore/faculty" className="quiet-link">
        {compact
          ? t("Browse the catalog →", "查看教授名录 →")
          : t("Browse every collected professor →", "查看全部教授与院系覆盖 →")}
      </Link>
    </div>
  ) : null;
}
