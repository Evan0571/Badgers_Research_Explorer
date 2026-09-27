"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  const active = useRef<Partial<Record<Kind, AbortController>>>({});
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
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
        undergraduateFilters: {},
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
        (text, partial, startedAt) => {
          if (!signal?.aborted) {
            stage(kind, text);
            if (kind === "search" && startedAt) setSearchStartedAt(startedAt);
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
    for (const kind of ["search", "drafts"] as const) {
      const id = pending.read(kind);
      if (id) {
        const controller = new AbortController();
        active.current[kind] = controller;
        stage(kind, "Restoring request status");
        if (kind === "search") setSearchStartedAt(Date.now());
        void follow(kind, id, controller.signal).finally(() => {
          if (active.current[kind] === controller) delete active.current[kind];
        });
      }
    }
    const current = active.current;
    return () => {
      Object.values(current).forEach((controller) => controller?.abort());
    };
    // Resume only when persisted workspace restoration finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const start = async (kind: Kind, path: string, input: unknown) => {
    if (active.current[kind] && !active.current[kind]?.signal.aborted) return;
    const controller = new AbortController();
    active.current[kind] = controller;
    stage(kind, "Starting request");
    if (kind === "search") setSearchStartedAt(Date.now());
    error(kind, "");
    try {
      const previous = pending.read(kind);
      if (previous) {
        if (kind === "drafts") {
          await follow(kind, previous, controller.signal);
          return;
        }
        // A retry is a NEW search, never silently replay the previous query.
        try {
          await requestJSON(
            `/api/jobs/${encodeURIComponent(previous)}`,
            undefined,
            "DELETE",
            controller.signal,
            12000,
          );
        } catch (e) {
          // A missing old job must not prevent submitting the new query.
          if (!(e instanceof APIError && e.status === 404)) throw e;
        }
        pending.save(kind);
      }
      const { id } = await requestJSON<{ id: string }>(
        path,
        input,
        "POST",
        controller.signal,
        15000,
      );
      pending.save(kind, id);
      await follow(kind, id, controller.signal);
    } catch (e) {
      if (!controller.signal.aborted)
        error(kind, e instanceof Error ? e.message : "This request failed.");
    } finally {
      if (active.current[kind] === controller) {
        delete active.current[kind];
        stage(kind, "");
      }
    }
  };
  const stopSearch = async () => {
    const id = pending.read("search");
    if (!id) return;
    try {
      await requestJSON(
        `/api/jobs/${encodeURIComponent(id)}`,
        undefined,
        "DELETE",
        undefined,
        12000,
      );
      active.current.search?.abort();
      delete active.current.search;
      pending.save("search");
      setSearchStage("");
      setSearchError("This task was cancelled.");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "This request failed.");
    }
  };
  return {
    dismissDraftError: () => setDraftError(""),
    stopSearch,
    searchStage,
    searchStartedAt,
    draftStage,
    searchError,
    draftError,
    search: (query: string, expand = false, refresh = false) =>
      start("search", "/api/search", { query, expand, refresh }),
    generate: (input: unknown) =>
      start("drafts", "/api/drafts/generate", input),
  };
}
