import { describe, expect, it, vi } from "vitest";
import { emptyWorkspace } from "./research";
import { parseWorkspace } from "./storage";
import { editWorkspace } from "./workspace-edit";

describe("edits from stale browser tabs", () => {
  it("keeps cleared interests and the new name when another tab saves a note", () => {
    const old = {
      ...structuredClone(emptyWorkspace),
      interestDraft: "Philosophy of economics",
    };
    let raw = JSON.stringify(old);
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    editWorkspace(storage, old, (w) => ({
      ...w,
      interestDraft: "",
      background: { ...w.background, name: "QA Student" },
    }));
    const secondTab = editWorkspace(storage, old, (w) => ({
      ...w,
      notes: { ...w.notes, alan: "Privacy and philosophy" },
    }));
    const reloaded = parseWorkspace(raw);
    expect(secondTab.error).toBeNull();
    expect(reloaded.interestDraft).toBe("");
    expect(reloaded.background.name).toBe("QA Student");
    expect(reloaded.notes.alan).toBe("Privacy and philosophy");
  });
  it("preserves saves from a different tab during a background-field edit", () => {
    const old = structuredClone(emptyWorkspace);
    let raw = JSON.stringify({ ...old, saved: ["newly-saved"] });
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const { workspace } = editWorkspace(storage, old, (w) => ({
      ...w,
      background: { ...w.background, major: "Economics" },
    }));
    expect(workspace.saved).toEqual(["newly-saved"]);
    expect(workspace.background.major).toBe("Economics");
  });
  it("keeps corrupt saved data untouched and retains the user's edit in memory", () => {
    const setItem = vi.fn();
    const result = editWorkspace(
      { getItem: () => "broken-json", setItem },
      emptyWorkspace,
      (w) => ({ ...w, interestDraft: "new text" }),
    );
    expect(result.error).toBe("read");
    expect(result.workspace.interestDraft).toBe("new text");
    expect(setItem).not.toHaveBeenCalled();
  });
  it("retains unsaved edits after storage fills up instead of re-reading an older saved copy", () => {
    const full = {
      getItem: () => JSON.stringify(emptyWorkspace),
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    const first = editWorkspace(full, emptyWorkspace, (w) => ({
      ...w,
      interestDraft: "unsaved interest",
    }));
    expect(first.error).toBe("write");
    const temporary = editWorkspace(null, first.workspace, (w) => ({
      ...w,
      notes: { ...w.notes, sample: "unsaved note" },
    }));
    expect(temporary.workspace.interestDraft).toBe("unsaved interest");
    expect(temporary.workspace.notes.sample).toBe("unsaved note");
  });
});
