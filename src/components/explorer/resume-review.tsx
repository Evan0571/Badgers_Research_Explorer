"use client";
import { useLocale } from "../locale";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Field, Notice, Textarea } from "@/components/ui";
import { errorCopy } from "@/lib/error-copy";
import { requestJSON } from "@/lib/api";
import { useWorkspace } from "./provider";
interface Proposal {
  name: string;
  major: string;
  year: string;
  experience: string;
  interests: string[];
  evidence: { field: string; quote: string }[];
}
export function ResumeReview({
  onInterest,
}: {
  onInterest: (query: string) => void;
}) {
  const { t, locale } = useLocale();
  const { workspace, setWorkspace } = useWorkspace();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const latestText = useRef(workspace.background.resumeText);
  latestText.current = workspace.background.resumeText;
  useEffect(() => {
    setProposal(null);
    setError("");
  }, [workspace.background.resumeText]);
  if (!workspace.background.resumeText) return null;
  return (
    <>
      <p className="small muted">
        {t(
          "Optional AI review sends the résumé text to the configured AI service. Suggestions only become your background after you confirm them.",
          "可选的 AI 分析会将简历文字发送至 AI 服务，只有经你确认后才会写入背景信息。",
        )}
      </p>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const reviewedText = workspace.background.resumeText;
            const suggestion = await requestJSON<Proposal>(
              "/api/resume/analyze",
              {
                text: workspace.background.resumeText,
              },
            );
            if (latestText.current === reviewedText) setProposal(suggestion);
          } catch (e) {
            setError(
              e instanceof Error
                ? errorCopy(e.message, locale)
                : "The résumé could not be reviewed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? t("Reviewing résumé…", "正在分析简历…")
          : t("Suggest background from résumé", "让 AI 从简历提取背景建议")}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
      <Dialog
        open={!!proposal}
        onOpenChange={(open) => !open && setProposal(null)}
        title={t("Confirm your background", "确认你的背景信息")}
        description={t(
          "Correct these suggestions before using them. Your interests can differ from your past experience.",
          "使用前请核对并修正建议。你的研究兴趣可以与过往经历不同。",
        )}
      >
        {proposal && (
          <div className="preview-body">
            {(["name", "major", "year"] as const).map((field) => (
              <Field
                key={field}
                id={`proposal-${field}`}
                label={t(
                  field,
                  { name: "姓名", major: "专业", year: "年级" }[field],
                )}
                value={proposal[field]}
                onChange={(e) =>
                  setProposal({ ...proposal, [field]: e.target.value })
                }
              />
            ))}
            <Textarea
              id="proposal-experience"
              label={t("Experience", "经历")}
              rows={4}
              value={proposal.experience}
              onChange={(e) =>
                setProposal({ ...proposal, experience: e.target.value })
              }
            />
            <details>
              <summary>
                {t("Supporting résumé text", "简历中的对应依据")}
              </summary>
              {proposal.evidence.map((e, i) => (
                <p key={i} className="small">
                  {e.field}: {e.quote}
                </p>
              ))}
            </details>
            <p>
              {t(
                "Possible interests, only if you want to explore them:",
                "以下为可选的兴趣方向：",
              )}
            </p>
            <div className="row wrap">
              {proposal.interests.map((interest) => (
                <Button
                  variant="ghost"
                  key={interest}
                  onClick={() => onInterest(interest)}
                >
                  {interest}
                </Button>
              ))}
            </div>
            <div className="preview-actions">
              <Button variant="secondary" onClick={() => setProposal(null)}>
                {t("Keep current background", "保留当前背景")}
              </Button>
              <Button
                onClick={() => {
                  setWorkspace((w) => ({
                    ...w,
                    background: {
                      ...w.background,
                      name: proposal.name,
                      major: proposal.major,
                      year: proposal.year,
                      experience: proposal.experience,
                    },
                  }));
                  setProposal(null);
                }}
              >
                {t("Use reviewed background", "使用已确认的背景")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
