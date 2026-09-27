import { describe, expect, it } from "vitest";
import { isSelfAddressed } from "./mail-recipient";

describe("Server-verified self-addressed messages", () => {
  it("compares a normalized exact mailbox", () => {
    expect(
      isSelfAddressed({ to: " Student@WISC.EDU " }, "student@wisc.edu"),
    ).toBe(true);
  });
  it.each([
    "student+test@wisc.edu",
    "other@wisc.edu",
    "student@wisc.edu.example.com",
    "student@cs.wisc.edu",
    "student@wisc.edu, other@wisc.edu",
  ])("does not infer ownership of %s", (to) => {
    expect(isSelfAddressed({ to }, "student@wisc.edu")).toBe(false);
  });
  it("does not accept empty ownership", () => {
    expect(isSelfAddressed({ to: "" }, "")).toBe(false);
  });
});
