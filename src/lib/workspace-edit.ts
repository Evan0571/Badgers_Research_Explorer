import { parseWorkspace, STORAGE_KEY } from "./storage";
import type { Workspace } from "./types";

type StorageAccess = Pick<Storage, "getItem" | "setItem">;
type Edit = Workspace | ((workspace: Workspace) => Workspace);

/** Rebase a tab's edit onto the newest persisted snapshot. Never write back a
 * stale render snapshot merely because a component rendered or mounted. */
export function editWorkspace(
  storage: StorageAccess | null,
  current: Workspace,
  edit: Edit,
) {
  let base = current;
  let error: "read" | "write" | null = null;
  if (storage) {
    try {
      base = parseWorkspace(storage.getItem(STORAGE_KEY));
    } catch {
      error = "read";
    }
  }
  const workspace = typeof edit === "function" ? edit(base) : edit;
  if (storage && !error) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      error = "write";
    }
  }
  return { workspace, error };
}
