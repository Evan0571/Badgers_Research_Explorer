"use client";
import { useEffect, useState } from "react";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { useLocale } from "../locale";
export function SearchProgress({
  stage,
  startedAt,
}: {
  stage: string;
  startedAt: number | null;
}) {
  const { t } = useLocale();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const kind = /Checking your research question/.test(stage)
    ? "intent"
    : /Preparing all|Complete/i.test(stage)
      ? "prepare"
      : /Matching/i.test(stage)
        ? "match"
        : /Explaining|Extracting/i.test(stage)
          ? "verify"
          : /Searching|Reading|Finding/i.test(stage)
            ? "web"
            : "catalog";
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    setHistory((previous) =>
      previous.at(-1) === kind ? previous : [...previous, kind],
    );
  }, [kind]);
  const labels = history.map((k) =>
    k === "intent"
      ? t("Understand your question", "确认研究意图")
      : k === "catalog"
        ? t("Check the catalog", "查询教授资料库")
        : k === "web"
          ? t("Read public sources", "阅读公开来源")
          : k === "verify"
            ? t("Verify evidence", "核对来源证据")
            : k === "match"
              ? t("Match your interests", "匹配研究兴趣")
              : t("Prepare results", "整理全部结果"),
  );
  const current = labels.length - 1;
  const seconds = startedAt
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0;
  const translated = /Checking your research question/.test(stage)
    ? t(stage, "正在确认输入是否包含研究兴趣或教授姓名")
    : /Checking the research catalog/.test(stage)
      ? t(stage, "正在查询已收集的教授信息")
      : /Matching interests/.test(stage)
        ? t(stage, "正在对资料库中的教授逐一匹配兴趣")
        : /Reading|Extracting/.test(stage)
          ? t(stage, "正在阅读个人主页并核对公开信息")
          : /Searching|Finding/.test(stage)
            ? t(stage, "正在查找更多大学与实验室来源")
            : /Explaining/.test(stage)
              ? t(stage, "正在整理研究方向并验证证据")
              : /Preparing all/.test(stage)
                ? t(stage, "正在整理全部匹配结果")
                : t(stage, "正在连接搜索服务");
  const batch = stage.match(/(\d+[–-]\d+) of (\d+)/);
  const profileCount = stage.match(/across (\d+) researcher/);
  const detail = batch
    ? t("", `（${batch[1]} / ${batch[2]}）`)
    : profileCount
      ? t("", `（共 ${profileCount[1]} 位）`)
      : "";
  const webLookup =
    /Searching UW|Reading and checking|Explaining research|Extracting evidence/.test(
      stage,
    );
  return (
    <section className="search-progress" aria-busy="true">
      <div className="row between">
        <div className="row">
          <CircleNotch className="search-spinner" size={28} />
          <h2>{t("Your search is in motion", "正在搜索中")}</h2>
        </div>
        <span className="elapsed">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <p role="status" aria-live="polite">
        {translated}
        {detail}
      </p>
      <ol>
        {labels.map((label, i) => (
          <li
            key={i}
            className={i === current ? "active" : i < current ? "done" : ""}
          >
            {i < current ? <Check size={18} /> : <span>{i + 1}</span>}
            {label}
          </li>
        ))}
      </ol>
      <p className="small muted">
        {webLookup
          ? t(
              "This web lookup runs for up to 60 seconds. Available catalog results stay below; you can stop the lookup at any time.",
              "本次网页搜索最多等待 60 秒。下方仍可查看已有资料库结果，你也可以随时停止搜索。",
            )
          : t(
              "You can review previous results below or leave this page and return while the search continues.",
              "你可以先查看下方已有结果，或离开此页后再返回查看进度。",
            )}
      </p>
      {seconds >= 25 && (
        <p className="search-wait-note" role="status">
          {t(
            "This is taking longer than usual. You can keep browsing the catalog or stop here and adjust your question.",
            "等待时间比平时稍长。你可以先浏览教授名录，或停止搜索后调整问题。",
          )}
        </p>
      )}
      <div className="search-activity-track" aria-hidden="true">
        <span className="search-pulse" />
      </div>
    </section>
  );
}
