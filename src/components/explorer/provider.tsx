"use client";
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { emptyWorkspace } from "@/lib/research";
import { parseWorkspace, STORAGE_KEY } from "@/lib/storage";
import { editWorkspace } from "@/lib/workspace-edit";
import type { Workspace } from "@/lib/types";
import { useBackendJobs } from "./use-backend-jobs";
const Context = createContext<{
  workspace: Workspace;
  setWorkspace: Dispatch<SetStateAction<Workspace>>;
  ready: boolean;
  storageError: string;
  comparisonTrayDismissed: boolean;
  dismissComparisonTray: () => void;
  notify: (s: string) => void;
  jobs: ReturnType<typeof useBackendJobs>;
} | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, renderWorkspace] = useState<Workspace>(emptyWorkspace);
  const current = useRef<Workspace>(emptyWorkspace);
  const initialized = useRef(false);
  const persistenceBlocked = useRef(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState("");
  const [comparisonTrayDismissed, setComparisonTrayDismissed] = useState(false);
  // Read the latest saved value before applying a functional edit. A background
  // tab may not have received its storage event yet; its stale snapshot must not
  // restore cleared fields or remove drafts saved by another tab.
  const setWorkspace: Dispatch<SetStateAction<Workspace>> = useCallback(
    (action) => {
      const { workspace: next, error } = editWorkspace(
        initialized.current && !persistenceBlocked.current
          ? {
              getItem: (key) => localStorage.getItem(key),
              setItem: (key, value) => localStorage.setItem(key, value),
            }
          : null,
        current.current,
        action,
      );
      current.current = next;
      renderWorkspace(next);
      if (error) {
        persistenceBlocked.current = true;
        setStorageError(
          error === "read"
            ? "Saved data could not be read. Changes in this tab are temporary; export drafts before leaving."
            : "Browser storage is unavailable or full. Changes are temporary; export your drafts before leaving.",
        );
      }
    },
    [],
  );
  const jobs = useBackendJobs(ready, setWorkspace);
  const comparisonKey = workspace.comparison.join("\u0000");
  useEffect(() => {
    setComparisonTrayDismissed(false);
  }, [comparisonKey]);
  useEffect(() => {
    try {
      current.current = parseWorkspace(localStorage.getItem(STORAGE_KEY));
      renderWorkspace(current.current);
    } catch {
      persistenceBlocked.current = true;
      setStorageError(
        "Saved data could not be read. Your previous data has not been overwritten. New work is temporary; export drafts before leaving.",
      );
    }
    initialized.current = true;
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || persistenceBlocked.current) return;
      try {
        // Read storage, not event.newValue: a delayed event can be older than
        // an edit already made in this tab.
        current.current = parseWorkspace(localStorage.getItem(STORAGE_KEY));
        renderWorkspace(current.current);
      } catch {
        persistenceBlocked.current = true;
        setStorageError(
          "Saved data could not be read. Changes in this tab are temporary; export drafts before leaving.",
        );
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <Context.Provider
      value={{
        workspace,
        setWorkspace,
        ready,
        storageError,
        comparisonTrayDismissed,
        dismissComparisonTray: () => setComparisonTrayDismissed(true),
        notify: setToast,
        jobs,
      }}
    >
      {children}
      <div
        className={toast ? "toast visible" : "toast"}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
