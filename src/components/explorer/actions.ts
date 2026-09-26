"use client";
import { useRouter } from "next/navigation";
import { byId } from "@/data/researchers";
import { canEmail, makeDraft } from "@/lib/research";
import { useWorkspace } from "./provider";
import type { Researcher } from "@/lib/types";
export function useResearchActions() {
  const { workspace, setWorkspace, notify } = useWorkspace();
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
  const prepareDrafts = (ids: string[]) => {
    const eligible = [...new Set(ids)]
      .map(byId)
      .filter((r): r is Researcher => !!r && canEmail(r));
    if (!eligible.length) {
      notify(
        "These researchers do not have a verified email route available. Check their next steps.",
      );
      return;
    }
    setWorkspace((w) => ({
      ...w,
      drafts: [
        ...w.drafts,
        ...eligible
          .filter((r) => !w.drafts.some((d) => d.researcherId === r.id))
          .map((r) => makeDraft(r, w.background, w.query, crypto.randomUUID())),
      ],
    }));
    router.push("/explore/mail");
  };
  return { toggleSave, toggleCompare, prepareDrafts };
}
