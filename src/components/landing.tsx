"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowsOut,
  ArrowUpRight,
  BookOpen,
  Check,
  EnvelopeSimple,
  List,
  MagnifyingGlass,
  Scales,
  X,
} from "@phosphor-icons/react";
import { Badge, Brand, IconButton, LinkButton, ThemeToggle } from "./ui";
import { LanguageToggle, useLocale } from "./locale";
import { ResearcherDialog } from "./explorer/researcher-dialog";
import { BrandMark } from "./ui/brand-mark";

export default function Landing() {
  const { t } = useLocale();
  const [exampleOpen, setExampleOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenu(false);
        }}
      >
        <div className="container header-inner">
          <Brand />
          <nav
            id="landing-navigation"
            className={menu ? "landing-nav is-open" : "landing-nav"}
            aria-label={t("Main navigation", "主导航")}
          >
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              {t("How it works", "如何使用")}
            </a>
            <a href="#questions" onClick={() => setMenu(false)}>
              {t("Questions", "常见问题")}
            </a>
            <a href="#research-example" onClick={() => setMenu(false)}>
              {t("Research example", "研究示例")}
            </a>
          </nav>
          <div className="header-actions">
            <LanguageToggle />
            <ThemeToggle />
            <LinkButton href="/explore">
              {t("Get Started", "开始使用")} <ArrowRight size={17} />
            </LinkButton>
            <IconButton
              label={
                menu
                  ? t("Close navigation", "关闭导航")
                  : t("Open navigation", "打开导航")
              }
              className="mobile-menu"
              aria-expanded={menu}
              aria-controls="landing-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <List size={22} />}
            </IconButton>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="container hero">
          <div className="hero-copy">
            <p className="eyebrow">
              {t(
                "A starting point for UW-Madison students",
                "为威斯康星大学麦迪逊分校学生提供一个起点",
              )}
            </p>
            <h1>
              {t("Your curiosity.", "从你的好奇心，")}
              <br />
              {t("A place to begin.", "找到研究的起点。")}
            </h1>
            <p className="hero-description">
              {t(
                "Find research that interests you, understand the work, and take your first step. No research experience required.",
                "发现感兴趣的研究，理解教授在做什么，迈出第一步。无需已有研究经验。",
              )}
            </p>
            <div className="hero-actions">
              <LinkButton href="/explore">
                {t("Get Started", "开始使用")} <ArrowRight size={18} />
              </LinkButton>
              <a className="quiet-link" href="#how-it-works">
                {t("See how it works", "了解使用流程")} <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <div className="hero-preview" id="research-example">
            <div className="preview-heading">
              <BrandMark size={24} />
              <span>
                {t(
                  "A little curiosity goes a long way.",
                  "一点好奇心，开启更多可能。",
                )}
              </span>
            </div>
            <div className="preview-query">
              <MagnifyingGlass size={19} />
              <span>
                {t(
                  "“How can AI help people in everyday life?”",
                  "“AI 能如何帮助人们的日常生活？”",
                )}
              </span>
            </div>
            <div className="preview-research">
              <div className="row between">
                <Badge>{t("Research preview", "研究预览")}</Badge>
                <BookOpen size={20} />
              </div>
              <p className="preview-dept">
                {t("COMPUTER SCIENCES", "计算机科学")}
              </p>
              <h2>
                {t("Making the world", "让这个世界，")}
                <br />
                {t("more accessible.", "更少一些障碍。")}
              </h2>
              <p>
                {t(
                  "Yuhang Zhao studies AI-powered systems that support people with diverse abilities.",
                  "Yuhang Zhao 研究由 AI 驱动的系统，为具有不同能力的人提供支持。",
                )}
              </p>
              <div className="preview-connection">
                <span className="tiny-label">
                  {t("WHY EXPLORE THIS?", "为什么值得了解？")}
                </span>
                <p>
                  {t(
                    "A connection between your interest in AI and real needs in people’s lives.",
                    "将你对 AI 的兴趣，与人们生活中的真实需求联系起来。",
                  )}
                </p>
              </div>
              <div className="row between preview-footer">
                <span>
                  <Check size={15} />{" "}
                  {t("Public source included", "附有公开资料来源")}
                </span>
                <IconButton
                  label={t("Expand research example", "展开研究示例")}
                  onClick={() => setExampleOpen(true)}
                  aria-haspopup="dialog"
                >
                  <ArrowsOut size={22} />
                </IconButton>
              </div>
            </div>
            <p className="preview-caption">
              {t(
                "A real research example. Openings may not be listed.",
                "真实研究示例，不代表实验室目前开放招募。",
              )}
            </p>
          </div>
        </section>
        <div className="principles-strip container">
          <span>
            <BrandMark size={24} />{" "}
            {t("Curiosity before credentials", "从好奇心出发")}
          </span>
          <span>
            <BookOpen size={18} />{" "}
            {t("Understand before you reach out", "先理解研究，再建立联系")}
          </span>
          <span>
            <Scales size={18} />{" "}
            {t("Your choice, informed by sources", "依据来源，自主选择")}
          </span>
        </div>
        <section id="how-it-works" className="how-section container">
          <div className="how-heading">
            <h2>
              {t("You do not need a plan.", "不必一开始就有计划。")}
              <br />
              {t("Just a starting point.", "先找到一个起点。")}
            </h2>
            <p>
              {t(
                "Research begins with a question. We help you find where yours could lead.",
                "研究从一个问题开始。我们帮你找到它可能通向的方向。",
              )}
            </p>
            <div
              className="research-illustration"
              role="img"
              aria-label={t(
                "Illustration of a notebook, microscope, and scientific instruments",
                "笔记本、显微镜和科学仪器插画",
              )}
            />
          </div>
          <ol className="steps">
            <li>
              <span className="step-icon">
                <MagnifyingGlass size={24} />
              </span>
              <div>
                <h3>
                  {t("Start with what interests you.", "从你感兴趣的事开始。")}
                </h3>
                <p>
                  {t(
                    "A topic, a question, or a professor’s name. Add a résumé if you want to; your interests lead the way.",
                    "一个研究领域、一个问题，或一位教授的名字。简历可以选填，探索由你的兴趣决定。",
                  )}
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <BookOpen size={24} />
              </span>
              <div>
                <h3>
                  {t("Make sense of the research.", "读懂研究在做什么。")}
                </h3>
                <p>
                  {t(
                    "Read plain-language explanations, follow original sources, and compare the questions different researchers ask.",
                    "阅读通俗解释、查看原始来源，并比较不同教授关注的问题。",
                  )}
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <EnvelopeSimple size={24} />
              </span>
              <div>
                <h3>{t("Find your next step.", "找到下一步。")}</h3>
                <p>
                  {t(
                    "Keep a shortlist and prepare individual email drafts. Check the public contact route before reaching out.",
                    "收藏感兴趣的教授，准备有针对性的邮件草稿，并在联系前确认公开的联系方式。",
                  )}
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="trust-section">
          <div className="container trust-inner">
            <div>
              <p className="eyebrow">
                {t("Built around your judgment", "帮助你自己作出判断")}
              </p>
              <h2>
                {t("A promising connection.", "发现可能的联系。")}
                <br />
                {t("An honest explanation.", "提供有依据的解释。")}
              </h2>
            </div>
            <div className="trust-copy">
              <p>
                {t(
                  "A research interest is not an open position. You will see what the sources support, what is unknown, and where to learn more.",
                  "研究方向匹配不等于有开放名额。我们会标出来源明确支持的信息、尚不确定的内容，以及进一步了解的入口。",
                )}
              </p>
              <div className="row wrap">
                <Badge tone="positive">
                  {t("Explicitly supported", "明确支持")}
                </Badge>
                <Badge tone="negative">
                  {t("Not supported", "明确不支持")}
                </Badge>
                <Badge>{t("Not stated", "未公开说明")}</Badge>
              </div>
              <p className="small">
                {t(
                  "Search the cross-department faculty catalog, then expand to public web sources when needed. Each profile keeps its own evidence dates.",
                  "先搜索跨院系教授资料库，需要时再扩展到公开网页。每位教授的资料均保留独立的来源日期。",
                )}
              </p>
            </div>
          </div>
        </section>
        <section id="questions" className="container faq-section">
          <h2>
            {t("A few things you might be wondering.", "你可能想了解的问题。")}
          </h2>
          <div className="faq-list">
            {[
              [
                t(
                  "Do I need a r\u00e9sum\u00e9 or research experience?",
                  "需要简历或研究经验吗？",
                ),
                t(
                  "No. A research topic, a question, or a researcher\u2019s name is enough to start. Your background is optional.",
                  "不需要。一个研究领域、一个问题或教授姓名就可以开始，背景信息可以选填。",
                ),
              ],
              [
                t(
                  "Can I explore outside my major?",
                  "可以探索专业以外的研究吗？",
                ),
                t(
                  "Yes. The catalog covers multiple departments and shows all collected matches. Coverage and research evidence can still be incomplete; you can search more public sources.",
                  "可以。资料库覆盖多个院系，并展示已收录的全部匹配项。资料覆盖与研究证据仍可能有缺失，你可以继续搜索公开来源。",
                ),
              ],
              [
                t(
                  "Does a match mean a lab is hiring?",
                  "匹配到教授就意味着实验室在招人吗？",
                ),
                t(
                  "No. It means the research could be worth understanding. Missing recruitment information stays marked as unknown.",
                  "不是。它说明这项研究值得了解，未找到的招募信息会明确标为未知。",
                ),
              ],
              [
                t(
                  "Can I review emails before sending?",
                  "发送前可以检查邮件吗？",
                ),
                t(
                  "Yes. You can edit and preview each draft. Sending requires a configured mail service and a connected or verified account; the sending screen shows the actual sender.",
                  "可以。每封草稿都可以编辑和预览。发送需要已配置的邮件服务及已连接或验证的账户，发送页面会显示实际发件人。",
                ),
              ],
              [
                t("Where is my work saved?", "我的内容保存在哪里？"),
                t(
                  "Your workspace stays in this browser and is not synced across devices. Clearing browser data removes it. Uploaded r\u00e9sum\u00e9 files are not retained or automatically attached; AI review of the extracted text is optional.",
                  "工作区保存在当前浏览器，不会跨设备同步；清除浏览器数据会移除它。上传的简历文件不会被保留或自动添加为邮件附件，提取文字后的 AI 分析由你选择。",
                ),
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="faq-plus">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="container final-cta">
          <h2>
            {t("There is a question", "总有一个问题，")}
            <br />
            {t("with your name on it.", "值得你去探索。")}
          </h2>
          <LinkButton href="/explore" variant="secondary">
            {t("Get Started", "开始使用")} <ArrowRight size={18} />
          </LinkButton>
        </section>
      </main>
      <ResearcherDialog
        id={exampleOpen ? "yuhang-zhao" : null}
        onClose={() => setExampleOpen(false)}
        landingPreview
      />
      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <p>
            {t(
              "An independent student project for UW-Madison.",
              "面向 UW-Madison 的独立学生项目。",
            )}
            <br />
            {t("Not an official university service.", "非学校官方服务。")}
          </p>
          <div>
            <a
              href="https://wiscience.wisc.edu/resources/undergrad-resources/finding-a-mentor/"
              target="_blank"
              rel="noreferrer"
            >
              {t("UW research guide", "UW 研究入门指南")}{" "}
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
