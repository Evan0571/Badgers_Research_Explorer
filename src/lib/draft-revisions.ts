import { personalize } from "./research";
import type { Draft } from "./types";

export type DraftSnapshot = Pick<
  Draft,
  "id" | "researcherId" | "to" | "subject" | "body"
> & { answers?: Draft["answers"] };

export interface DraftRevision {
  base: DraftSnapshot;
  patch: Partial<Pick<Draft, "subject" | "body" | "answers">>;
}

export function captureDraftSnapshot(
  draft: Draft,
  includeAnswers = false,
): DraftSnapshot {
  return {
    id: draft.id,
    researcherId: draft.researcherId,
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
    ...(includeAnswers ? { answers: { ...draft.answers } } : {}),
  };
}

export function matchesDraftSnapshot(
  draft: Draft | undefined,
  base: DraftSnapshot,
) {
  return (
    !!draft &&
    draft.id === base.id &&
    draft.researcherId === base.researcherId &&
    draft.to === base.to &&
    draft.subject === base.subject &&
    draft.body === base.body &&
    (!base.answers ||
      (draft.answers.interest === base.answers.interest &&
        draft.answers.experience === base.answers.experience &&
        draft.answers.request === base.answers.request))
  );
}

export function previewPersonalDetails(draft: Draft): DraftRevision {
  return {
    base: captureDraftSnapshot(draft, true),
    patch: {
      body: personalize(draft),
      answers: { interest: "", experience: "", request: "" },
    },
  };
}

// Check the latest state at the write boundary, not only when rendering Apply.
// Keep unrelated fields (attachments, pending details, etc.) from that state.
export function applyDraftRevision(drafts: Draft[], revision: DraftRevision) {
  const current = drafts.find((draft) => draft.id === revision.base.id);
  if (!matchesDraftSnapshot(current, revision.base)) return drafts;
  return drafts.map((draft) =>
    draft.id === revision.base.id
      ? { ...draft, ...revision.patch, updatedAt: new Date().toISOString() }
      : draft,
  );
}
