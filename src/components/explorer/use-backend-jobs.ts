"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { APIError, requestJSON, waitForJob } from "@/lib/api";
import { searchResultSchema, draftSchema } from "@/lib/contracts";
import type { Workspace } from "@/lib/types";
import { z } from "zod";

const generatedSchema = z.object({
  drafts: z.array(draftSchema),
  errors: z.array(z.object({ researcherId: z.string(), error: z.string() })),
});
type Kind = "search" | "drafts";
const pending = {
  read(kind: Kind) {
    try {
      return localStorage.getItem(`research:pending:${kind}`);
    } catch {
      return null;
    }
  },
  save(kind: Kind, id?: string) {
    try {
      if (id) localStorage.setItem(`research:pending:${kind}`, id);
      else localStorage.removeItem(`research:pending:${kind}`);
    } catch {
      /* Polling still works if browser storage is blocked. */
    }
  },
};
export function useBackendJobs(
  ready: boolean,
  setWorkspace: Dispatch<SetStateAction<Workspace>>,
) {
  const [searchStage, setSearchStage] = useState("");
  const [draftStage, setDraftStage] = useState("");
  const [searchError, setSearchError] = useState("");
  const [draftError, setDraftError] = useState("");
  const stage = (kind: Kind, text: string) =>
    (kind === "search" ? setSearchStage : setDraftStage)(text);
  const error = (kind: Kind, text: string) =>
    (kind === "search" ? setSearchError : setDraftError)(text);
  const apply = (kind: Kind, data: unknown) => {
    if (kind === "search") {
      const result = searchResultSchema.parse(data);
      setWorkspace((w) => ({
        ...w,
        query: result.query,
        searched: true,
        search: result,
        topics: [],
        matchAll: false,
        department: "",
        recruitment: "",
        creditOnly: false,
        catalog: [
          ...new Map(
            [...(w.catalog || []), ...result.researchers].map((r) => [r.id, r]),
          ).values(),
        ],
      }));
    } else {
      const result = generatedSchema.parse(data);
      setWorkspace((w) => ({
        ...w,
        drafts: [
          ...w.drafts,
          ...result.drafts.filter(
            (d) => !w.drafts.some((old) => old.researcherId === d.researcherId),
          ),
        ],
      }));
      if (result.errors.length)
        setDraftError(result.errors.map((e) => e.error).join(" "));
    }
  };
  const follow = async (kind: Kind, id: string, signal?: AbortSignal) => {
    try {
      const data = await waitForJob(
        id,
        (text, partial) => {
          if (!signal?.aborted) {
            stage(kind, text);
            if (kind === "drafts" && partial) apply(kind, partial);
          }
        },
        signal,
      );
      if (!signal?.aborted) {
        apply(kind, data);
        pending.save(kind);
      }
    } catch (e) {
      if (signal?.aborted) return;
      error(kind, e instanceof Error ? e.message : "This request failed.");
      if (e instanceof APIError && e.terminal) pending.save(kind);
    } finally {
      if (!signal?.aborted) stage(kind, "");
    }
  };
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    for (const kind of ["search", "drafts"] as const) {
      const id = pending.read(kind);
      if (id) {
        stage(kind, "Restoring request status");
        void follow(kind, id, controller.signal);
      }
    }
    return () => controller.abort();
    // Resume only when persisted workspace restoration finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const start = async (kind: Kind, path: string, input: unknown) => {
    stage(kind, "Starting request");
    error(kind, "");
    try {
      const previous = pending.read(kind);
      if (previous) {
        await follow(kind, previous);
        return;
      }
      const { id } = await requestJSON<{ id: string }>(path, input);
      pending.save(kind, id);
      await follow(kind, id);
    } catch (e) {
      error(kind, e instanceof Error ? e.message : "This request failed.");
      stage(kind, "");
    }
  };
  return {
    searchStage,
    draftStage,
    searchError,
    draftError,
    search: (query: string) => start("search", "/api/search", { query }),
    generate: (input: unknown) =>
      start("drafts", "/api/drafts/generate", input),
  };
}
