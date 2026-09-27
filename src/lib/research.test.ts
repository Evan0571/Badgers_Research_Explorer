import { describe, it, expect } from "vitest";
import { researchers } from "@/data/researchers";
import {
  canEmail,
  draftIssues,
  emptyWorkspace,
  findResearchers,
  inferTopics,
  makeDraft,
  normalizeRecipients,
  personalize,
} from "./research";
import { parseWorkspace } from "./storage";
import type { Researcher } from "./types";

describe("Evidence-aware discovery", () => {
  it("keeps departments open and includes unknown conditions", () => {
    const result = findResearchers(researchers, "AI agents", ["agents"]);
    expect(new Set(result.map((r) => r.department)).size).toBeGreaterThan(1);
    expect(result.some((r) => r.recruitment === "unknown")).toBe(true);
    expect(result.at(-1)?.recruitment).toBe("closed");
  });
  it("uses a union for multiple interests unless an intersection is requested", () => {
    const union = findResearchers(researchers, "", [
      "robotics",
      "machine-learning",
    ]);
    const intersection = findResearchers(
      researchers,
      "",
      ["robotics", "machine-learning"],
      true,
    );
    expect(union.map((r) => r.id)).toContain("bilge-mutlu");
    expect(union.map((r) => r.id)).toContain("sharon-li");
    expect(intersection).toHaveLength(0);
    expect(new Set(union.map((r) => r.id)).size).toBe(union.length);
  });
  it("supports Chinese keywords and exact professor lookup", () => {
    expect(inferTopics("我想研究机器人和无障碍")).toEqual([
      "robotics",
      "accessibility",
    ]);
    expect(
      findResearchers(researchers, "Yuhang Zhao", []).map((r) => r.id),
    ).toEqual(["yuhang-zhao"]);
    expect(findResearchers(researchers, "marine biology", [])).toHaveLength(0);
  });
  it("does not match short keywords inside unrelated words", () => {
    expect(inferTopics("art history")).not.toContain("accessibility");
  });
});
describe("Honest, separate email drafts", () => {
  it("blocks unavailable and form-only contact routes", () => {
    expect(canEmail(researchers.find((r) => r.id === "sharon-li")!)).toBe(
      false,
    );
    const form: Researcher = {
      ...researchers[0],
      contact: { ...researchers[0].contact, route: "form" },
    };
    expect(canEmail(form)).toBe(false);
    expect(() =>
      makeDraft(form, emptyWorkspace.background, "AI", "bad"),
    ).toThrow();
  });
  it("does not invent experiences or attach a résumé", () => {
    const d = makeDraft(
      researchers[0],
      emptyWorkspace.background,
      "AI",
      "first",
    );
    expect(d.body).toContain("[Your name]");
    expect(d.body).not.toMatch(
      /read your paper|extensive experience|attached|second-year/i,
    );
    expect(d.attachments).toBeUndefined();
    expect(draftIssues(d)).toContain("Replace the unfinished placeholders.");
  });
  it("keeps recipient and study topic tied to the correct researcher", () => {
    const a = makeDraft(
      researchers[0],
      { ...emptyWorkspace.background, name: "Taylor" },
      "AI",
      "a",
    );
    const b = makeDraft(
      researchers[1],
      { ...emptyWorkspace.background, name: "Taylor" },
      "AI",
      "b",
    );
    expect(a.to).toBe(researchers[0].contact.email);
    expect(b.to).toBe(researchers[1].contact.email);
    expect(a.body).toContain("Professor Mutlu");
    expect(b.body).toContain("Professor Zhao");
    expect(draftIssues(a)).toEqual([]);
    expect(draftIssues({ ...a, to: "a@wisc.edu,b@wisc.edu" })).toContain(
      "Add one valid recipient address.",
    );
    expect(
      draftIssues({ ...a, subject: "Subject\nBcc: other@wisc.edu" }),
    ).toContain("Add a subject on one line.");
  });
  it("deduplicates case-insensitive recipients", () => {
    const d = makeDraft(researchers[0], emptyWorkspace.background, "AI", "a");
    expect(
      normalizeRecipients([
        d,
        { ...d, id: "b", to: ` ${d.to.toUpperCase()} ` },
      ]),
    ).toHaveLength(1);
  });
  it("personalization produces a preview without mutating the original", () => {
    const d = makeDraft(researchers[0], emptyWorkspace.background, "AI", "a");
    d.answers.experience = "This is my first time exploring research.";
    const original = d.body;
    expect(personalize(d)).toContain(d.answers.experience);
    expect(d.body).toBe(original);
  });
});
describe("Workspace recovery", () => {
  it.each(["", "A new interest I have not searched yet"])(
    "persists an interest draft independently of the previous search: %j",
    (interestDraft) => {
      const restored = parseWorkspace(
        JSON.stringify({
          ...emptyWorkspace,
          query: "Previous submitted search",
          interestDraft,
          saved: ["bilge-mutlu"],
        }),
      );
      expect(restored.interestDraft).toBe(interestDraft);
      expect(restored.query).toBe("Previous submitted search");
      expect(restored.saved).toEqual(["bilge-mutlu"]);
    },
  );
  it("restores notes, selections, and manually edited draft content", () => {
    const d = makeDraft(researchers[0], emptyWorkspace.background, "AI", "a");
    d.body = "My own introduction";
    const state = {
      ...emptyWorkspace,
      query: "AI",
      saved: ["bilge-mutlu"],
      notes: { "bilge-mutlu": "My note" },
      selectedDrafts: ["a"],
      drafts: [d],
    };
    expect(parseWorkspace(JSON.stringify(state))).toEqual(state);
  });
  it("rejects damaged storage instead of silently accepting invalid records", () => {
    expect(() => parseWorkspace("{not-json")).toThrow();
    expect(() =>
      parseWorkspace(
        JSON.stringify({ ...emptyWorkspace, drafts: [{ id: 1 }] }),
      ),
    ).toThrow();
    expect(parseWorkspace(null)).toEqual(emptyWorkspace);
  });
});
