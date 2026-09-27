import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "./research";
import { parseWorkspace } from "./storage";
import {
  matchesUndergraduateFilters,
  unknownOpportunity,
  workspaceUndergraduateFilters,
  type UndergraduateReview,
} from "./undergraduate";

export function reviewWith(
  supervision: "yes" | "no" | "unknown",
  openings: "yes" | "no" | "unknown",
  applications: "yes" | "no" | "unknown" = "unknown",
): UndergraduateReview {
  return {
    version: 1,
    attemptedAt: "2026-09-27T00:00:00Z",
    checkedAt: "2026-09-27T00:00:00Z",
    status: "checked",
    discovery: "searched",
    supervision: { ...unknownOpportunity(), value: supervision },
    openings: { ...unknownOpportunity(), value: openings },
    applications: { ...unknownOpportunity(), value: applications },
    credit: unknownOpportunity(),
    pay: unknownOpportunity(),
    applicationUrl: null,
    contactOptions: [],
    websites: [],
    attempts: [],
    limitations: [],
  };
}
describe("independent undergraduate filters", () => {
  it("can find a past mentor whose lab is currently full", () => {
    const review = reviewWith("yes", "no", "no");
    expect(
      matchesUndergraduateFilters(review, {
        supervision: "yes",
        openings: "no",
      }),
    ).toBe(true);
    expect(
      matchesUndergraduateFilters(review, {
        supervision: "yes",
        openings: "yes",
      }),
    ).toBe(false);
  });
  it("does not equate accepting applications or unknown capacity with openings", () => {
    const review = reviewWith("yes", "unknown", "yes");
    expect(
      matchesUndergraduateFilters(review, {
        supervision: "yes",
        applications: "yes",
      }),
    ).toBe(true);
    expect(
      matchesUndergraduateFilters(review, {
        supervision: "yes",
        applications: "yes",
        openings: "yes",
      }),
    ).toBe(false);
    expect(matchesUndergraduateFilters(review, { openings: "no" })).toBe(false);
    expect(matchesUndergraduateFilters(review, { openings: "unknown" })).toBe(
      true,
    );
    expect(
      matchesUndergraduateFilters(undefined, { openings: "unknown" }),
    ).toBe(true);
    expect(matchesUndergraduateFilters(undefined, { supervision: "no" })).toBe(
      false,
    );
    expect(
      matchesUndergraduateFilters(reviewWith("unknown", "yes"), {
        supervision: "yes",
      }),
    ).toBe(false);
  });
  it("preserves old saved filters and persists combined selections", () => {
    for (const [recruitment, key, value] of [
      ["supervision", "supervision", "yes"],
      ["applications", "applications", "yes"],
      ["open", "openings", "yes"],
      ["closed", "openings", "no"],
      ["unknown", "openings", "unknown"],
    ] as const) {
      const restored = parseWorkspace(
        JSON.stringify({ ...emptyWorkspace, recruitment }),
      );
      expect(workspaceUndergraduateFilters(restored)[key]).toBe(value);
    }
    const selection = {
      supervision: "yes",
      openings: "no",
      applications: "unknown",
    } as const;
    const restored = parseWorkspace(
      JSON.stringify({
        ...emptyWorkspace,
        recruitment: "open",
        undergraduateFilters: selection,
      }),
    );
    expect(workspaceUndergraduateFilters(restored)).toEqual(selection);
    expect(
      workspaceUndergraduateFilters({
        recruitment: "open",
        undergraduateFilters: {},
      }),
    ).toEqual({});
  });
});
