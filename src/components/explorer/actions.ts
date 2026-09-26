"use client";
import { useRouter } from "next/navigation";
import { researcherById } from "@/lib/catalog";
import { canEmail } from "@/lib/research";
import { useWorkspace } from "./provider";
import type { Researcher } from "@/lib/types";
export function useResearchActions() {
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
    if (
      !workspace.comparison.includes(id) &&
      workspace.comparison.length >= 3
    ) {
      notify(
        "Compare up to 3 researchers at a time. Remove one to add another.",
      );
      return;
    }
    setWorkspace((w) => ({
      ...w,
      comparison: w.comparison.includes(id)
        ? w.comparison.filter((x) => x !== id)
        : [...w.comparison, id],
    }));
  };
  const prepareDrafts = async (ids: string[]) => {
    if (jobs.draftStage) {
      notify("Draft generation is already running.");
      return;
    }
    const eligible = [...new Set(ids)]
      .map((id) => researcherById(workspace, id))
      .filter((r): r is Researcher => !!r && canEmail(r));
    if (!eligible.length) {
      notify(
        "These researchers do not have a verified email route available. Check their next steps.",
      );
      return;
    }
    const needed = eligible.filter(
      (r) => !workspace.drafts.some((d) => d.researcherId === r.id),
    );
    if (needed.length > 6) {
      notify("Generate up to six individual drafts at a time.");
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
