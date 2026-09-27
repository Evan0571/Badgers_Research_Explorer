"use client";
import { useLocale } from "../locale";
import { useState } from "react";
import {
  BookmarkSimple,
  ArrowRight,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import { Button, EmptyState, LinkButton, Notice } from "@/components/ui";
import { useWorkspace } from "./provider";
import { useResearchActions } from "./actions";
import { ResearchCard } from "./research-card";
import { ResearcherDialog } from "./researcher-dialog";
export function SavedView() {
  const { t, locale } = useLocale();
  const { workspace: w } = useWorkspace();
  const { prepareDrafts } = useResearchActions();
  const [detail, setDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const saved = w.saved.map((id) => researcherById(w, id)).filter((r) => !!r);
  const eligible = saved.filter(canEmail);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">
          {t("A collection of possibilities", "收藏你感兴趣的研究")}
        </p>
        <h1>{t("Your shortlist.", "我的教授收藏。")}</h1>
        <p>
          {t(
            "Keep the research that makes you pause. Decide what comes next when you are ready.",
            "保留让你感兴趣的研究，准备好后再决定下一步。",
          )}
        </p>
      </div>
      {saved.length ? (
        <>
          <div className="selection-toolbar">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={
                  eligible.length > 0 &&
                  eligible.every((r) => selected.includes(r.id))
                }
                onChange={(e) =>
                  setSelected(e.target.checked ? eligible.map((r) => r.id) : [])
                }
              />
              {t(
                "Select email-eligible researchers",
                "选择可通过邮件联系的教授",
              )}
            </label>
            <Button
              disabled={
                !selected.some((id) => eligible.some((r) => r.id === id))
              }
              onClick={() =>
                prepareDrafts(
                  selected.filter((id) => eligible.some((r) => r.id === id)),
                )
              }
            >
              <EnvelopeSimple size={18} />
              {t("Prepare", "准备")}{" "}
              {selected.filter((id) => eligible.some((r) => r.id === id))
                .length || ""}{" "}
              {t("drafts", "封草稿")}
            </Button>
          </div>
          <Notice>
            {t(
              "Saving is separate from contacting. Public email addresses allow you to ask about the process; they do not establish an opening.",
              "收藏不会发出邮件。公开邮箱可以用于询问参与方式，但不代表当前有空位。",
            )}
          </Notice>
          <div className="research-grid">
            {saved.map((r) => (
              <div className="saved-item" key={r.id}>
                {canEmail(r) && (
                  <label className="checkbox-label saved-check">
                    <input
                      type="checkbox"
                      aria-label={t(
                        `Select ${r.name} for email`,
                        `选择 ${r.name} 准备邮件`,
                      )}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, r.id]
                            : s.filter((id) => id !== r.id),
                        )
                      }
                    />
                    {t("Prepare email", "准备邮件")}
                  </label>
                )}
                <ResearchCard researcher={r} onOpen={setDetail} />
                {w.notes[r.id] && (
                  <p className="saved-note">
                    <strong>{t("Your note:", "我的笔记：")}</strong>{" "}
                    {w.notes[r.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<BookmarkSimple size={34} />}
          title={t(
            "Make room for a possibility.",
            "收藏你想进一步了解的教授。",
          )}
          action={
            <LinkButton href="/explore">
              {t("Explore research", "探索研究")} <ArrowRight size={17} />
            </LinkButton>
          }
        >
          {t(
            "Save a researcher while exploring. Your shortlist and personal notes will stay together here.",
            "在浏览时收藏教授，收藏和个人笔记都会保存在这里。",
          )}
        </EmptyState>
      )}
      <ResearcherDialog id={detail} onClose={() => setDetail(null)} />
    </>
  );
}
