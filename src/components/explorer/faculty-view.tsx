"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Select, Notice } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLocale } from "../locale";
import { CoverageSummary } from "./catalog-coverage";
import type { CatalogCoverage } from "@/lib/catalog-coverage";
import type { Researcher } from "@/lib/types";
import { useWorkspace } from "./provider";
import { ResearcherDialog } from "./researcher-dialog";
import { UndergraduateBadges } from "./undergraduate-evidence";
import {
  UndergraduateFilters,
  UndergraduateFilterHelp,
} from "./undergraduate-filters";
import type { UndergraduateFilters as Filters } from "@/lib/undergraduate";
type Listing = {
  coverage: CatalogCoverage;
  departments: string[];
  total: number;
  page: number;
  pageSize: number;
  records: Researcher[];
  warning: string;
};
export function FacultyView() {
  const { t } = useLocale();
  const { setWorkspace } = useWorkspace();
  const [undergraduateFilters, setUndergraduateFilters] = useState<Filters>({});
  const [q, setQ] = useState(""),
    [department, setDepartment] = useState(""),
    [level, setLevel] = useState(""),
    [category, setCategory] = useState(""),
    [undergraduate, setUndergraduate] = useState(""),
    [refreshVersion, setRefreshVersion] = useState(0),
    [page, setPage] = useState(1),
    [pageInput, setPageInput] = useState("1"),
    [pageError, setPageError] = useState(""),
    [data, setData] = useState<Listing | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [detail, setDetail] = useState<string | null>(null);
  const resultsHeading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        setRefreshVersion((v) => v + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const totalPages = Math.max(
    1,
    Math.ceil((data?.total || 0) / (data?.pageSize || 50)),
  );
  const goToPage = (next: number) => {
    setPage(next);
    setPageInput(String(next));
    setPageError("");
    resultsHeading.current?.scrollIntoView({ block: "start" });
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPageError("");
    const timer = setTimeout(() => {
      const p = new URLSearchParams({
        q,
        department,
        level,
        category,
        undergraduate,
        supervision: undergraduateFilters.supervision || "",
        openings: undergraduateFilters.openings || "",
        applications: undergraduateFilters.applications || "",
        page: String(page),
      });
      fetch("/api/catalog?" + p, { signal: controller.signal })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Catalog unavailable");
          return d;
        })
        .then((result: Listing) => {
          if (!controller.signal.aborted) {
            setData(result);
            setPageInput(String(result.page));
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    q,
    department,
    level,
    category,
    undergraduate,
    undergraduateFilters,
    page,
    refreshVersion,
  ]);
  const open = (r: Researcher) => {
    setWorkspace((w) => ({
      ...w,
      catalog: [...(w.catalog || []).filter((p) => p.id !== r.id), r],
    }));
    setDetail(r.id);
  };
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">UW–Madison</p>
        <h1>{t("Across every field.", "跨院系教授名录。")}</h1>
        <p>
          {t(
            "Built from the official faculty roster and the university-linked research platform. Explore the coverage, including profiles still being completed.",
            "以官方教师名录和学校研究平台为基础。已收录人员都会保留，包括研究信息仍待补充的教授。",
          )}
        </p>
      </div>
      {data && <CoverageSummary coverage={data.coverage} />}
      <div className="faculty-filters">
        <UndergraduateFilters
          prefix="faculty"
          value={undergraduateFilters}
          onChange={(value) => {
            setUndergraduateFilters(value);
            setPage(1);
          }}
        />
        <Select
          id="faculty-undergraduate"
          label={t("Source review coverage", "来源核查进度")}
          value={undergraduate}
          onChange={(e) => {
            setUndergraduate(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("All findings", "全部核查结果")}</option>
          <option value="checked">
            {t("Collected pages reviewed", "已核查所收集页面")}
          </option>
          <option value="partial">
            {t("Partial coverage", "网页覆盖尚不完整")}
          </option>
          <option value="pending">
            {t("Review pending / failed", "待核查或核查失败")}
          </option>
        </Select>
        <Field
          id="faculty-query"
          label={t("Professor name", "教授姓名")}
          placeholder={t("First or last name", "输入名字或姓氏")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <SearchableSelect
          id="faculty-department"
          label={t("Department", "院系")}
          value={department}
          placeholder={t("Type to find a department…", "输入院系名称筛选…")}
          emptyText={t("No matching departments", "没有匹配的院系")}
          onChange={(value) => {
            setDepartment(value);
            setPage(1);
          }}
          options={[
            { value: "", label: t("All departments", "全部院系") },
            ...(data?.departments || []).map((d) => ({ value: d, label: d })),
          ]}
        />
        <Select
          id="faculty-level"
          label={t("Information available", "资料完整度")}
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("All profiles", "全部人员")}</option>
          <option value="research">
            {t("Research evidence indexed", "已有研究证据")}
          </option>
          <option value="roster">
            {t("Research details pending", "研究资料待补充")}
          </option>
          <option value="email">
            {t("Verified public email", "已有核验邮箱")}
          </option>
        </Select>
        <Select
          id="faculty-category"
          label={t("Appointment type", "任职类别")}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("All appointment types", "全部任职类别")}</option>
          {(
            [
              [
                "faculty",
                "Professor / Associate / Assistant",
                "教授 / 副教授 / 助理教授",
              ],
              ["clinical", "Clinical / CHS", "临床 / CHS"],
              ["teaching", "Teaching professor", "教学教授"],
              ["adjunct", "Adjunct", "兼职"],
              ["visiting", "Visiting", "访问"],
              ["emeritus", "Emeritus", "荣休"],
            ] as const
          ).map(([v, en, zh]) => (
            <option key={v} value={v}>
              {t(en, zh)}
            </option>
          ))}
        </Select>
      </div>
      <UndergraduateFilterHelp />
      {error && <Notice tone="error">{error}</Notice>}
      <div
        ref={resultsHeading}
        className="row between faculty-count"
        aria-live="polite"
      >
        <p>
          {loading
            ? t("Loading faculty…", "正在读取教授名录…")
            : t(
                `${data?.total.toLocaleString()} matching people`,
                `${data?.total.toLocaleString()} 位符合条件`,
              )}
        </p>
        <Button
          variant="ghost"
          disabled={loading}
          onClick={() => setRefreshVersion((v) => v + 1)}
        >
          {t("Refresh findings", "刷新核查结果")}
        </Button>
        <a
          href="https://guide.wisc.edu/faculty/"
          target="_blank"
          rel="noreferrer"
        >
          {t("Official source ↗", "官方名录 ↗")}
        </a>
      </div>
      {data?.warning && (
        <Notice>
          {t(
            "Cloud connection unavailable; showing preserved records.",
            "暂时无法连接云端，当前展示本地保留的记录。",
          )}
        </Notice>
      )}
      <div className="faculty-list" aria-busy={loading}>
        {!loading && !error && data?.total === 0 && (
          <p className="faculty-empty">
            {t(
              "No faculty match these filters. Try another name or department.",
              "没有符合这些条件的教授，请尝试其他姓名或院系。",
            )}
          </p>
        )}
        {data?.records.map((r) => (
          <article key={r.id}>
            <div>
              <button className="faculty-name" onClick={() => open(r)}>
                {r.name}
              </button>
              <p>
                {r.academicTitle || r.title} · {r.department}
              </p>
              <small>
                {r.coverage?.level === "roster"
                  ? t(
                      "Official roster verified · research details pending",
                      "已核对官方名录 · 研究资料待补充",
                    )
                  : t("Research evidence indexed", "已有研究证据")}
                {r.contact.email
                  ? " · " + t("Email verified", "邮箱已核验")
                  : ""}
              </small>
              <div className="row wrap conditions">
                <UndergraduateBadges researcher={r} />
              </div>
            </div>
            <Button variant="ghost" onClick={() => open(r)}>
              {t("View profile", "查看资料")}
            </Button>
          </article>
        ))}
      </div>
      {data && (
        <div className="row between faculty-pagination">
          <Button
            variant="secondary"
            disabled={loading || data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
          >
            {t("Previous", "上一页")}
          </Button>
          <div className="faculty-page-controls">
            <span aria-live="polite">
              {t(
                `Page ${data.page} of ${totalPages}`,
                `第 ${data.page} / ${totalPages} 页`,
              )}{" "}
              ·{" "}
              {t(
                "50 per page, every match accessible",
                "每页 50 位，可浏览全部匹配人员",
              )}
            </span>
            <form
              className="faculty-page-jump"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (loading) return;
                const next = Number(pageInput);
                if (
                  !/^\d+$/.test(pageInput.trim()) ||
                  !Number.isSafeInteger(next) ||
                  next < 1 ||
                  next > totalPages
                ) {
                  setPageError(
                    t(
                      `Enter a whole page number from 1 to ${totalPages}.`,
                      `请输入 1 到 ${totalPages} 之间的整数页码。`,
                    ),
                  );
                  return;
                }
                goToPage(next);
              }}
            >
              <label htmlFor="faculty-page-number">
                {t("Go to page", "跳转到")}
              </label>
              <input
                id="faculty-page-number"
                type="number"
                inputMode="numeric"
                min={1}
                max={totalPages}
                step={1}
                value={pageInput}
                disabled={loading || data.total === 0}
                aria-invalid={!!pageError}
                aria-describedby={pageError ? "faculty-page-error" : undefined}
                onChange={(event) => {
                  setPageInput(event.target.value);
                  setPageError("");
                }}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={loading || data.total === 0}
              >
                {t("Go", "跳转")}
              </Button>
            </form>
            {pageError && (
              <p className="error-text" id="faculty-page-error" role="alert">
                {pageError}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            disabled={loading || data.page * data.pageSize >= data.total}
            onClick={() => goToPage(data.page + 1)}
          >
            {t("Next", "下一页")}
          </Button>
        </div>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
