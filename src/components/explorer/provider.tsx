"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { emptyWorkspace } from "@/lib/research";
import { parseWorkspace, STORAGE_KEY } from "@/lib/storage";
import type { Workspace } from "@/lib/types";
import { useBackendJobs } from "./use-backend-jobs";
const Context = createContext<{
  workspace: Workspace;
  setWorkspace: Dispatch<SetStateAction<Workspace>>;
  ready: boolean;
  storageError: string;
  notify: (s: string) => void;
  jobs: ReturnType<typeof useBackendJobs>;
} | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [toast, setToast] = useState("");
  const jobs = useBackendJobs(ready && !blocked, setWorkspace);
  useEffect(() => {
    try {
      setWorkspace(parseWorkspace(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setBlocked(true);
      setStorageError(
        "Saved data could not be read. Your previous data has not been overwritten. New work is temporary; export drafts before leaving.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || blocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable or full. Changes are temporary; export your drafts before leaving.",
      );
    }
  }, [workspace, ready, blocked]);
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
