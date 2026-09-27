import { describe, expect, it } from "vitest";
import {
  applyDraftRevision,
  captureDraftSnapshot,
  matchesDraftSnapshot,
  previewPersonalDetails,
  type DraftRevision,
} from "./draft-revisions";
import type { Draft } from "./types";

function draft(): Draft {
  return {
    id: "draft-a",
    researcherId: "researcher-a",
    to: "professor@example.edu",
    subject: "Research inquiry",
    body: "I would like to learn about your research.",
    answers: { interest: "", experience: "", request: "" },
    recipientEdited: false,
    updatedAt: "2026-09-26T00:00:00.000Z",
  };
}

function aiPreview(base: Draft): DraftRevision {
  return {
    base: captureDraftSnapshot(base),
    patch: {
      subject: "Undergraduate research inquiry",
      body: "I am interested in contributing to your research.",
    },
  };
}

describe("Draft previews preserve newer edits", () => {
  it("keeps personal details typed after AI generation when applying the AI preview", () => {
    const original = draft();
    const preview = aiPreview(original);
    const latest = {
      ...original,
      answers: {
        ...original.answers,
        experience: "I built a data analysis project.",
      },
    };
    const [applied] = applyDraftRevision([latest], preview);
    expect(applied.body).toBe(preview.patch.body);
    expect(applied.answers).toEqual(latest.answers);
  });

  it("blocks an old or late-arriving AI preview after personal details are applied", () => {
    const original = draft();
    const ai = aiPreview(original);
    const withDetails = {
      ...original,
      answers: {
        ...original.answers,
        experience: "I built a data analysis project.",
      },
    };
    const latest = applyDraftRevision(
      [withDetails],
      previewPersonalDetails(withDetails),
    );
    expect(latest[0].body).toContain("I built a data analysis project.");
    expect(matchesDraftSnapshot(latest[0], ai.base)).toBe(false);
    expect(applyDraftRevision(latest, ai)).toBe(latest);
  });

  it("adds personal details to the applied AI version and clears only the consumed inputs", () => {
    const original = draft();
    const [polished] = applyDraftRevision([original], aiPreview(original));
    const withDetails = {
      ...polished,
      answers: {
        ...polished.answers,
        experience: "I built a data analysis project.",
      },
    };
    const [applied] = applyDraftRevision(
      [withDetails],
      previewPersonalDetails(withDetails),
    );
    expect(applied.body).toContain(polished.body);
    expect(applied.body).toContain("I built a data analysis project.");
    expect(applied.subject).toBe(polished.subject);
    expect(Object.values(applied.answers)).toEqual(["", "", ""]);
  });

  it("blocks a personal-details preview when AI has replaced its base message", () => {
    const original = draft();
    original.answers.experience = "A class project";
    const personal = previewPersonalDetails(original);
    const latest = applyDraftRevision([original], aiPreview(original));
    expect(applyDraftRevision(latest, personal)).toBe(latest);
    expect(latest[0].answers.experience).toBe("A class project");
    const refreshed = applyDraftRevision(
      latest,
      previewPersonalDetails(latest[0]),
    );
    expect(refreshed[0].body).toContain(latest[0].body);
    expect(refreshed[0].body).toContain("A class project");
  });

  it.each(["interest", "experience", "request"] as const)(
    "does not clear a newer %s answer when applying an old details preview",
    (field) => {
      const original = draft();
      original.answers.experience = "Original experience";
      const preview = previewPersonalDetails(original);
      const latest = [
        {
          ...original,
          answers: { ...original.answers, [field]: "New detail" },
        },
      ];
      expect(matchesDraftSnapshot(latest[0], preview.base)).toBe(false);
      expect(applyDraftRevision(latest, preview)).toBe(latest);
      expect(latest[0].answers[field]).toBe("New detail");
    },
  );

  it.each(["subject", "body", "to", "researcherId"] as const)(
    "rejects a stale write even if %s changed after the Apply button rendered",
    (field) => {
      const original = draft();
      const preview = aiPreview(original);
      const latest = [{ ...original, [field]: "Changed since preview" }];
      expect(applyDraftRevision(latest, preview)).toBe(latest);
    },
  );

  it("cannot apply a preview to another draft or resurrect a deleted draft", () => {
    const preview = aiPreview(draft());
    const other = [{ ...draft(), id: "draft-b" }];
    expect(applyDraftRevision(other, preview)).toBe(other);
    expect(applyDraftRevision([], preview)).toEqual([]);
  });

  it("preserves newer attachments and other drafts during a valid apply", () => {
    const original = draft();
    const preview = aiPreview(original);
    const attachment = {
      id: "file-a",
      name: "resume.pdf",
      size: 100,
      type: "application/pdf",
    };
    const other = { ...draft(), id: "draft-b" };
    const latest = [
      { ...original, attachments: [attachment], updatedAt: "later" },
      other,
    ];
    const applied = applyDraftRevision(latest, preview);
    expect(applied[0].attachments).toEqual([attachment]);
    expect(applied[1]).toBe(other);
    expect(applyDraftRevision(applied, preview)).toBe(applied);
  });

  it("blocks restore after personal additions or manual edits, without losing new content", () => {
    const original = draft();
    const [polished] = applyDraftRevision([original], aiPreview(original));
    const undo: DraftRevision = {
      base: captureDraftSnapshot(polished),
      patch: { subject: original.subject, body: original.body },
    };
    const withDetails = {
      ...polished,
      answers: { ...polished.answers, experience: "New experience" },
    };
    const added = applyDraftRevision(
      [withDetails],
      previewPersonalDetails(withDetails),
    );
    expect(applyDraftRevision(added, undo)).toBe(added);
    expect(added[0].body).toContain("New experience");
    const manual = [{ ...polished, body: polished.body + " A manual edit." }];
    expect(applyDraftRevision(manual, undo)).toBe(manual);
  });

  it("restores an untouched AI revision while retaining unapplied personal details", () => {
    const original = draft();
    const [polished] = applyDraftRevision([original], aiPreview(original));
    const undo: DraftRevision = {
      base: captureDraftSnapshot(polished),
      patch: { subject: original.subject, body: original.body },
    };
    const latest = {
      ...polished,
      answers: { ...polished.answers, experience: "Pending experience" },
    };
    const [restored] = applyDraftRevision([latest], undo);
    expect(restored.subject).toBe(original.subject);
    expect(restored.body).toBe(original.body);
    expect(restored.answers.experience).toBe("Pending experience");
  });
});
