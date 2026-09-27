"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MagnifyingGlass,
  ArrowRight,
  Scales,
  X,
} from "@phosphor-icons/react";
import {
  Button,
  IconButton,
  Select,
  Notice,
  EmptyState,
} from "@/components/ui";
import { useWorkspace } from "./provider";
import { useLocale } from "../locale";
import { ResearchCard } from "./research-card";
import { ResearcherDialog } from "./researcher-dialog";
import { SearchProgress } from "./search-progress";
import { CatalogCoverageBanner } from "./catalog-coverage";
import { errorCopy, isAIQuotaError } from "@/lib/error-copy";
import {
  matchesUndergraduateFilters,
  workspaceUndergraduateFilters,
} from "@/lib/undergraduate";
import {
  UndergraduateFilters,
  UndergraduateFilterHelp,
} from "./undergraduate-filters";
import {
  departments,
  matchesDirection,
  directionsWithMatches,
} from "@/lib/research-metadata";
export function ResultsView() {
  const {
    workspace: w,
    setWorkspace,
    jobs,
    comparisonTrayDismissed,
    dismissComparisonTray,
  } = useWorkspace();
  const { t, locale } = useLocale();
  const params = useSearchParams();
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    if (params.get("researcher")) setDetail(params.get("researcher"));
  }, [params]);
  const researchers = (w.search?.researchers || []).map((r) => {
    const latest = w.catalog?.find((p) => p.id === r.id);
    return latest?.undergraduate &&
      (!r.undergraduate ||
        latest.undergraduate.attemptedAt >= r.undergraduate.attemptedAt)
      ? { ...r, ...latest, relevance: r.relevance, topics: r.topics }
      : r;
  });
  // Also filter old saved results, whose generated concepts may have no matches.
  const directionMatches = directionsWithMatches(
    researchers,
    w.search?.directions || [],
  );
  const directions = directionMatches.map(({ direction }) => direction);
  const selected = directions.filter((d) => w.topics.includes(d.id));
  const webQuery = selected.length
    ? selected.map((d) => d.title).join("; ")
    : w.search?.query || w.query;
  const incompleteWeb =
    w.search?.webSearchStatus === "timed-out" ||
    w.search?.webSearchStatus === "unavailable";
  const searchWeb = () => {
    setWorkspace((p) => ({ ...p, query: webQuery }));
    void jobs.search(webQuery, true);
  };
  const undergraduateFilters = workspaceUndergraduateFilters(w);
  const filtered = researchers.filter(
    (r) =>
      (!selected.length ||
        (w.matchAll
          ? selected.every((d) => matchesDirection(r, d))
          : selected.some((d) => matchesDirection(r, d)))) &&
      (!w.department || departments(r.department).includes(w.department)) &&
      matchesUndergraduateFilters(r.undergraduate, undergraduateFilters) &&
      (!w.creditOnly || r.credit.value === "supported"),
  );
  const clear = () =>
    setWorkspace((p) => ({
      ...p,
      topics: [],
      department: "",
      recruitment: "",
      undergraduateFilters: {},
      creditOnly: false,
      matchAll: false,
    }));
  return (
    <>
      <Link href="/explore" className="quiet-link">
        <ArrowLeft size={18} />
        {t("Edit interests & background", "修改兴趣与背景")}
      </Link>
      <div className="page-heading results-page-heading">
        <p className="eyebrow">{t("Research discovery", "研究探索")}</p>
        <h1>
          {jobs.searchStage
            ? t("Following your curiosity.", "正在探索你的兴趣。")
            : jobs.searchError
              ? t("This search could not finish.", "本次搜索未能完成。")
              : w.search?.outcome === "needs-clarification"
                ? t("A clearer question to begin.", "从一个明确的问题开始。")
                : w.search && !researchers.length
                  ? t("Let's try another angle.", "换一个角度继续探索。")
                  : t("Your research connections.", "与你兴趣相关的研究。")}
        </h1>
        <p className="query-summary">{w.query}</p>
      </div>
      {jobs.searchStage && (
        <SearchProgress
          stage={jobs.searchStage}
          startedAt={jobs.searchStartedAt}
        />
      )}
      {jobs.searchStage && (
        <div className="search-actions">
          <Button variant="secondary" onClick={() => jobs.stopSearch()}>
            {t("Stop search · keep results", "停止搜索，保留结果")}
          </Button>
          {w.search && w.search.outcome !== "needs-clarification" && (
            <a href="#collected-results" className="quiet-link">
              {t("View available results ↓", "先查看已有结果 ↓")}
            </a>
          )}
          <Link href="/explore/faculty" className="quiet-link">
            {t("Browse faculty catalog", "浏览教授名录")}
          </Link>
        </div>
      )}
      {jobs.searchError && (
        <Notice tone={/cancelled/i.test(jobs.searchError) ? "info" : "error"}>
          {errorCopy(jobs.searchError, locale)}
          <div className="row wrap">
            <Link href="/explore/faculty" className="button button-secondary">
              {t("Browse faculty catalog", "浏览教授名录")}
            </Link>
            <Link href="/explore" className="quiet-link">
              {t("Adjust my interests", "调整研究兴趣")}
            </Link>
            {!isAIQuotaError(jobs.searchError) &&
              !/^Too many requests\./.test(jobs.searchError) && (
                <Button
                  variant="secondary"
                  disabled={!!jobs.searchStage}
                  onClick={() => jobs.search(w.query)}
                >
                  {t("Retry search", "重试搜索")}
                </Button>
              )}
          </div>
        </Notice>
      )}
      {w.search?.outcome === "needs-clarification" &&
        !jobs.searchStage &&
        !jobs.searchError && (
          <EmptyState
            icon={<MagnifyingGlass size={32} />}
            title={t(
              "Tell us a little more about the research",
              "请补充你想探索的研究问题",
            )}
            action={
              <Link href="/explore" className="button button-primary">
                {t("Edit my question", "修改研究兴趣")}
              </Link>
            }
          >
            {w.search.interpretation && <p>{w.search.interpretation}</p>}
            {t(
              "We couldn't identify a clear research interest in this input, so no directions or professor matches were generated. Try a topic, a professor's name, or a question you want to investigate—for example, how air pressure affects taste.",
              "这段输入还不能明确对应到研究兴趣，因此没有生成方向或教授匹配。可以填写研究领域、教授姓名，或想深入探究的问题，例如：气压如何影响味觉。",
            )}
          </EmptyState>
        )}
      {w.search && w.search.outcome !== "needs-clarification" && (
        <section id="collected-results">
          {researchers.length > 0 && !jobs.searchStage && (
            <CatalogCoverageBanner />
          )}
          {(jobs.searchStage ||
            (jobs.searchError && w.search.query !== w.query)) && (
            <Notice>
              {t(
                "Your previous completed results remain available below. They belong to the earlier query shown here.",
                "下方保留上一次完成的结果，对应以下旧查询。",
              )}
              <p>{w.search.query}</p>
            </Notice>
          )}
          <div className="collection-notice">
            {w.search.interpretation && (
              <p>
                <strong>
                  {t(
                    "How we understood your request:",
                    "本次对你的需求的理解：",
                  )}
                </strong>{" "}
                {w.search.interpretation}
              </p>
            )}
            <p>
              <strong>
                {w.search.cached
                  ? t("From the research catalog", "来自教授资料库")
                  : t("Catalog + newly checked sources", "资料库与新核验来源")}
              </strong>{" "}
              · {t("Search completed", "搜索完成于")}{" "}
              {new Date(w.search.checkedAt).toLocaleString()}
              <br />
              {t(
                "All matching collected profiles are shown. This is not a complete UW faculty census. Each profile shows its own source dates.",
                "展示已收录资料中的全部匹配项，不代表已覆盖全校教授。各教授资料保留独立的来源核查日期。",
              )}
            </p>
          </div>
          {incompleteWeb && !jobs.searchStage && (
            <div className="search-result-warning">
              <Notice>
                <strong>
                  {w.search.webSearchStatus === "timed-out"
                    ? t(
                        "Web lookup stopped at its time limit",
                        "网页搜索已到时间上限，已停止等待",
                      )
                    : t(
                        "Web sources could not be verified this time",
                        "本次暂时无法完成网页核验",
                      )}
                </strong>
                <p>
                  {t(
                    "These are the available catalog matches. The web lookup was incomplete; this does not mean there are no relevant professors. You can adjust your question, browse the catalog, or try the web again later.",
                    "下方是资料库中已有的匹配。网页搜索尚未完成，不代表没有相关教授。你可以修改问题、浏览教授名录，或稍后重试网页搜索。",
                  )}
                </p>
              </Notice>
            </div>
          )}
          {researchers.length > 0 && (
            <Button
              variant="ghost"
              disabled={!!jobs.searchStage}
              onClick={() => jobs.search(w.search!.query, false, true)}
            >
              {t("Refresh these source pages", "重新核查这些教授的来源")}
            </Button>
          )}
          {w.search.warnings.map((s, i) => (
            <Notice key={i}>
              {s ===
              "Using the server's saved public-source catalog. Supabase is not connected yet."
                ? t(
                    s,
                    "当前使用服务器上已保存的公开教授资料，Supabase 尚待连接。",
                  )
                : errorCopy(s, locale)}
            </Notice>
          ))}
          {directions.length > 0 && (
            <section className="directions-section">
              <div className="row between">
                <h2>{t("Explore a direction", "按研究方向探索")}</h2>
                <Button variant="ghost" onClick={clear}>
                  {t("Show all matches", "显示全部匹配")}
                </Button>
              </div>
              <p className="small muted">
                {t(
                  "Grouped around your interests. Only directions with matching professor profiles are shown.",
                  "按你的兴趣归类，仅展示本次已匹配到教授的方向。",
                )}
              </p>
              <div className="direction-grid">
                {directionMatches.map(({ direction: d, count }) => {
                  return (
                    <button
                      key={d.id}
                      className={
                        w.topics.includes(d.id)
                          ? "direction-card selected"
                          : "direction-card"
                      }
                      aria-pressed={w.topics.includes(d.id)}
                      disabled={!!jobs.searchStage}
                      onClick={() => {
                        setWorkspace((p) => ({
                          ...p,
                          topics: p.topics.includes(d.id)
                            ? p.topics.filter((v) => v !== d.id)
                            : [...p.topics, d.id],
                          department: "",
                          recruitment: "",
                          undergraduateFilters: {},
                          creditOnly: false,
                        }));
                      }}
                    >
                      <span>{d.title}</span>
                      <p>{d.question}</p>
                      <strong>
                        {t(count + " researchers", count + " 位教授")}
                      </strong>
                    </button>
                  );
                })}
              </div>
              {selected.length > 1 && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={w.matchAll}
                    onChange={(e) =>
                      setWorkspace((p) => ({
                        ...p,
                        matchAll: e.target.checked,
                      }))
                    }
                  />
                  {t(
                    "Must connect to every selected direction",
                    "必须同时符合所有已选方向",
                  )}
                </label>
              )}
            </section>
          )}
          <section className="results-section" id="results-matches">
            {researchers.length > 0 && (
              <>
                <div className="results-title row between">
                  <div>
                    <h2>{t("Researchers to explore", "值得了解的教授")}</h2>
                    <p>
                      {t("Showing", "当前显示")}{" "}
                      <strong>{filtered.length}</strong> / {researchers.length}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!!jobs.searchStage}
                    onClick={searchWeb}
                  >
                    {t("Search the web", "搜索公开网页")}
                  </Button>
                </div>
                <div className="filter-bar">
                  <Select
                    id="department"
                    label={t("Department", "院系")}
                    value={w.department}
                    onChange={(e) =>
                      setWorkspace((p) => ({
                        ...p,
                        department: e.target.value,
                      }))
                    }
                  >
                    <option value="">{t("All departments", "全部院系")}</option>
                    {[
                      ...new Set(
                        researchers.flatMap((r) => departments(r.department)),
                      ),
                    ]
                      .sort()
                      .map((d) => (
                        <option value={d} key={d}>
                          {d}
                        </option>
                      ))}
                  </Select>
                  <UndergraduateFilters
                    prefix="results"
                    value={undergraduateFilters}
                    onChange={(value) =>
                      setWorkspace((p) => ({
                        ...p,
                        recruitment: "",
                        undergraduateFilters: value,
                      }))
                    }
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={w.creditOnly}
                      onChange={(e) =>
                        setWorkspace((p) => ({
                          ...p,
                          creditOnly: e.target.checked,
                        }))
                      }
                    />
                    {t("Credit explicitly supported", "明确支持学分")}
                  </label>
                  {(selected.length > 0 ||
                    w.department ||
                    Object.values(undergraduateFilters).some(Boolean) ||
                    w.creditOnly) && (
                    <Button variant="ghost" onClick={clear}>
                      {t("Clear filters", "清除筛选")}
                    </Button>
                  )}
                </div>
                <UndergraduateFilterHelp />
              </>
            )}
            {filtered.length ? (
              <div className="research-grid">
                {filtered.map((r) => (
                  <ResearchCard key={r.id} researcher={r} onOpen={setDetail} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MagnifyingGlass size={32} />}
                title={t(
                  incompleteWeb
                    ? "No catalog match yet; web lookup is incomplete"
                    : researchers.length
                      ? "No matches for these filters"
                      : "No collected profiles match yet",
                  incompleteWeb
                    ? "资料库暂无匹配，网页搜索尚未完成"
                    : researchers.length
                      ? "当前筛选没有匹配结果"
                      : "资料库暂未找到匹配教授",
                )}
                action={
                  <div className="empty-search-actions">
                    {researchers.length > 0 ? (
                      <Button variant="secondary" onClick={clear}>
                        {t("Show all collected matches", "显示本次全部匹配")}
                      </Button>
                    ) : null}
                    <Link
                      href="/explore"
                      className={
                        researchers.length
                          ? "quiet-link"
                          : "button button-primary"
                      }
                    >
                      {t("Adjust my interests", "调整研究兴趣")}
                    </Link>
                    <Link
                      href="/explore/faculty"
                      className="button button-secondary"
                    >
                      {t("Browse faculty catalog", "浏览教授名录")}
                    </Link>
                    {!incompleteWeb && (
                      <Button
                        variant="ghost"
                        disabled={!!jobs.searchStage}
                        onClick={searchWeb}
                      >
                        {t(
                          "Search public sources (optional)",
                          "搜索公开网页（可选）",
                        )}
                      </Button>
                    )}
                  </div>
                }
              >
                {t(
                  researchers.length
                    ? "Try fewer filters or return to all matches. Your saved results are still available."
                    : "We have no matching professor profiles for this question yet, so no research directions are shown. This does not mean the university has no related research. Try a broader interest or browse the faculty catalog; your major does not restrict the search.",
                  researchers.length
                    ? "可以减少筛选条件，或返回本次全部匹配；已有结果仍然保留。"
                    : "当前资料暂未匹配到教授，因此不展示研究方向。这不代表学校没有相关研究。可以尝试更宽泛的兴趣，或直接浏览教授名录；你的专业不会限制搜索范围。",
                )}
              </EmptyState>
            )}
          </section>
        </section>
      )}
      {!w.search && !jobs.searchStage && !jobs.searchError && (
        <EmptyState
          icon={<MagnifyingGlass size={32} />}
          title={t("Start with an interest", "先输入一个兴趣方向")}
          action={
            <Link href="/explore" className="button button-primary">
              {t("Start a search", "开始搜索")}
            </Link>
          }
        >
          {t("Your results will appear here.", "搜索过程和结果会显示在这里。")}
        </EmptyState>
      )}
      {w.comparison.length > 0 && !comparisonTrayDismissed && (
        <div className="compare-tray">
          <Scales size={22} />
          <span>
            {w.comparison.length} {t("selected for comparison", "位教授待比较")}
          </span>
          <Link className="button button-primary" href="/explore/compare">
            {t("Compare", "比较")}
            <ArrowRight size={17} />
          </Link>
          <IconButton
            label={t("Hide comparison bar", "收起比较提示")}
            onClick={dismissComparisonTray}
          >
            <X size={18} />
          </IconButton>
        </div>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
