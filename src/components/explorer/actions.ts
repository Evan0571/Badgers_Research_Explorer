"use client";
import { useRouter } from "next/navigation";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import { useWorkspace } from "./provider";
import type { Researcher } from "@/lib/types";
import { useLocale } from "../locale";
export function useResearchActions() {
  const { t } = useLocale();
  const { workspace, setWorkspace, notify, jobs } = useWorkspace();
  const router = useRouter();
  const toggleSave = (id: string) =>
    setWorkspace((w) => ({
      ...w,
      saved: w.saved.includes(id)
        ? w.saved.filter((x) => x !== id)
        : [...w.saved, id],
    }));
  const toggleCompare = (id: string) => {
    setWorkspace((w) => {
      // Enforce the limit against the latest shared snapshot, including edits
      // made in another tab before its storage event arrives here.
      if (!w.comparison.includes(id) && w.comparison.length >= 3) {
        notify(
          t(
            "Compare up to 3 researchers at a time. Remove one to add another.",
            "最多同时比较 3 位教授，请先移除一位再添加。",
          ),
        );
        return w;
      }
      return {
        ...w,
        comparison: w.comparison.includes(id)
          ? w.comparison.filter((x) => x !== id)
          : [...w.comparison, id],
      };
    });
  };
  const prepareDrafts = async (ids: string[]) => {
    if (jobs.draftStage) {
      notify(
        t("Draft generation is already running.", "正在生成邮件草稿，请稍候。"),
      );
      return;
    }
    const eligible = [...new Set(ids)]
      .map((id) => researcherById(workspace, id))
      .filter((r): r is Researcher => !!r && canEmail(r));
    if (!eligible.length) {
      notify(
        t(
          "These researchers do not have a verified email route available. Check their next steps.",
          "这些教授尚无已核验的可用邮箱，请查看资料中的下一步联系建议。",
        ),
      );
      return;
    }
    const needed = eligible.filter(
      (r) => !workspace.drafts.some((d) => d.researcherId === r.id),
    );
    if (needed.length > 6) {
      notify(
        t(
          "Generate up to six individual drafts at a time.",
          "每次最多生成 6 封独立草稿。",
        ),
      );
      return;
    }
    router.push("/explore/mail");
    if (needed.length)
      await jobs.generate({
        ids: needed.map((r) => r.id),
        background: { ...workspace.background, resumeText: "" },
        query: workspace.query,
      });
  };
  return { toggleSave, toggleCompare, prepareDrafts };
}
