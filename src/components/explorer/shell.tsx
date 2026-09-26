"use client";
import { AppleHeader } from "@/components/apple-header";
import { Notice } from "@/components/ui";
import { useWorkspace } from "./provider";
export function ExplorerShell({ children }: { children: React.ReactNode }) {
  const { ready, storageError } = useWorkspace();
  return (
    <div className="apple-workspace">
      <AppleHeader />
      <main id="main" className="workspace-main">
        {storageError && <Notice tone="error">{storageError}</Notice>}
        {ready ? (
          children
        ) : (
          <div className="loading-state" aria-busy="true">
            <div className="skeleton title-skeleton" />
            <div className="skeleton block-skeleton" />
            <p>Restoring your workspace…</p>
          </div>
        )}
      </main>
      <footer className="apple-workspace-footer">
        An independent student project for UW–Madison. Source-checked starter
        collection.
      </footer>
    </div>
  );
}
