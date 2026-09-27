"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Paperclip, X } from "@phosphor-icons/react";
import { Button, Field, Select, Textarea, Notice } from "@/components/ui";
import { useWorkspace } from "./provider";
import { useLocale } from "../locale";
import { errorCopy } from "@/lib/error-copy";
import { ResumeReview } from "./resume-review";
import { CatalogCoverageBanner } from "./catalog-coverage";
export function SearchView() {
  const { workspace: w, setWorkspace, notify, jobs } = useWorkspace();
  const { t, locale } = useLocale();
  const router = useRouter();
  // Keep the editable draft separate from the last submitted search. In
  // particular, an intentionally empty draft must not fall back to that query.
  const input = w.interestDraft ?? w.query;
  const setInput = (value: string) =>
    setWorkspace((p) => ({ ...p, interestDraft: value }));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const interestRef = useRef<HTMLTextAreaElement>(null);
  const background = (key: keyof typeof w.background, value: string) =>
    setWorkspace((p) => ({
      ...p,
      background: { ...p.background, [key]: value },
    }));
  const submit = (query: string) => {
    if (
      query.trim().length < 2 ||
      query.trim().length > 3000 ||
      jobs.searchStage ||
      uploading
    )
      return;
    setWorkspace((p) => ({
      ...p,
      query: query.trim(),
      interestDraft: query.trim(),
    }));
    void jobs.search(query);
    router.push("/explore/results");
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(
        t("Choose a file smaller than 10 MB.", "请选择小于 10 MB 的文件。"),
      );
      return;
    }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/resume", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      background("resumeText", data.text);
      notify(
        t("Résumé text is ready for your review.", "简历文字已提取，请确认。"),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? errorCopy(e.message, locale)
          : t("Could not read the file.", "无法读取文件。"),
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className="intake-page">
      <div className="explore-heading">
        <h1>{t("What are you curious about?", "你对什么研究感兴趣？")}</h1>
        <p>
          {t(
            "Describe a topic, a question, or a researcher. We’ll explore the connections.",
            "输入研究方向、具体问题或教授姓名，探索适合你的研究。",
          )}
        </p>
      </div>
      {jobs.searchStage && (
        <Notice>
          <Link href="/explore/results">
            {t(
              "A search is running. View its progress →",
              "搜索正在进行，查看进度 →",
            )}
          </Link>
        </Notice>
      )}
      <form
        className="search-intake"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="search-primary">
          <section className="search-composer" aria-labelledby="interest-label">
            <div className="section-heading">
              <label htmlFor="interest" id="interest-label">
                {t("Your research interests", "你的研究兴趣")}
              </label>
              <p className="interest-hint" id="interest-hint">
                {t(
                  "Write in English or Chinese. A sentence is enough to start.",
                  "支持中文或英文，从一句话开始就好。",
                )}
              </p>
            </div>
            <div className="interest-editor">
              <textarea
                ref={interestRef}
                id="interest"
                value={input}
                maxLength={3000}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(
                  "I’m interested in AI agents and how people learn…",
                  "例如：我对 AI 智能体和教育方向感兴趣……",
                )}
                rows={6}
                aria-describedby="interest-hint"
                aria-invalid={input.trim().length > 3000 || undefined}
              />
              <Button
                variant="ghost"
                className="interest-clear"
                disabled={!input.length}
                aria-label={t("Clear research interests", "清空研究兴趣")}
                onClick={() => {
                  setInput("");
                  interestRef.current?.focus();
                }}
              >
                <X size={15} aria-hidden />
                {t("Clear", "一键清除")}
              </Button>
            </div>
            {input.trim().length > 3000 && (
              <p role="alert">
                {t(
                  "Keep your interests within 3,000 characters before searching.",
                  "请将研究兴趣缩减到 3,000 个字符以内后再搜索。",
                )}
              </p>
            )}
          </section>
          <div className="intake-submit">
            <Button
              type="submit"
              disabled={
                input.trim().length < 2 ||
                input.trim().length > 3000 ||
                !!jobs.searchStage ||
                uploading
              }
            >
              {t("Explore research", "开始探索研究")}
              <ArrowRight size={20} />
            </Button>
          </div>
          {w.search && (
            <Link className="quiet-link" href="/explore/results">
              {t("Return to your last results", "返回上次搜索结果")} →
            </Link>
          )}
        </div>
        <section
          className="background-panel"
          aria-labelledby="background-heading"
        >
          <div className="section-heading">
            <h2 id="background-heading">
              {t("A little about you", "补充一点你的背景")}
            </h2>
            <span>
              {t(
                "Optional · helps personalize your emails",
                "选填 · 帮你准备更贴合自身的邮件",
              )}
            </span>
          </div>
          <div className="background-fields">
            <Field
              id="student-name"
              label={t("Your name", "姓名")}
              value={w.background.name}
              onChange={(e) => background("name", e.target.value)}
            />
            <Field
              id="major"
              label={t("Major or area of study", "专业或学习领域")}
              value={w.background.major}
              onChange={(e) => background("major", e.target.value)}
            />
            <Select
              id="year"
              label={t("Year", "年级")}
              value={w.background.year}
              onChange={(e) => background("year", e.target.value)}
            >
              <option value="">{t("Not specified", "暂不填写")}</option>
              {[
                ["first-year", "大一"],
                ["second-year", "大二"],
                ["third-year", "大三"],
                ["fourth-year", "大四"],
                ["graduate", "研究生"],
              ].map(([en, zh]) => (
                <option key={en} value={en}>
                  {t(en, zh)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            id="confirmed-experience"
            label={t("Experience you want to mention", "想提及的经历")}
            rows={2}
            placeholder={t(
              "A course, project, skill, or your first research experience.",
              "课程、项目、技能，或说明这是你第一次尝试研究。",
            )}
            value={w.background.experience}
            onChange={(e) => background("experience", e.target.value)}
          />
          <div className="resume-upload-row">
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={21} />
              {uploading
                ? t("Reading résumé…", "正在读取简历…")
                : t("Upload résumé", "上传简历")}
            </Button>
            <span>
              {t(
                "PDF, DOCX or TXT · up to 10 MB",
                "PDF、DOCX 或 TXT · 最大 10 MB",
              )}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="sr-only"
            tabIndex={-1}
            aria-label={t("Upload résumé", "上传简历")}
            onChange={(e) => upload(e.target.files?.[0])}
          />
          {error && <Notice tone="error">{error}</Notice>}
          {w.background.resumeText && (
            <>
              <Textarea
                id="resume-text"
                label={t("Review extracted résumé text", "核对简历文字")}
                rows={4}
                value={w.background.resumeText}
                onChange={(e) => background("resumeText", e.target.value)}
              />
              <ResumeReview onInterest={setInput} />
              <Button
                variant="ghost"
                onClick={() => background("resumeText", "")}
              >
                {t("Remove résumé text", "移除简历文字")}
              </Button>
            </>
          )}
          <p className="background-privacy">
            {t(
              "Your major won’t limit the search. Background stays in this browser until you choose to use AI.",
              "专业不会限制搜索范围。背景保存在当前浏览器中，使用 AI 功能时才会提交所需信息。",
            )}
          </p>
        </section>
      </form>
      <CatalogCoverageBanner compact />
    </div>
  );
}
