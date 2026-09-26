import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkContactBeforeSending } from "./contact-check";
import { storedResearcher } from "./discovery";
import { readSource } from "./sources";
import { structured } from "./openai";
import type { Draft, Researcher } from "@/lib/types";
vi.mock("./discovery", () => ({ storedResearcher: vi.fn() }));
vi.mock("./openai", () => ({ structured: vi.fn() }));
vi.mock("./sources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sources")>()),
  readSource: vi.fn(),
}));
const profile = {
  id: "profile",
  url: "https://example.wisc.edu/alex",
  title: "Alex Chen",
  text: "Alex Chen is a professor at the University of Wisconsin-Madison. Contact alex@wisc.edu.",
  links: [],
  checkedAt: new Date().toISOString(),
};
const researcher = {
  id: "alex",
  name: "Alex Chen",
  contact: {
    route: "email",
    sourceId: "profile",
    url: profile.url,
    email: "alex@wisc.edu",
  },
  sources: [{ id: "profile", url: profile.url }],
} as Researcher;
const draft = { researcherId: "alex", to: "alex@wisc.edu" } as Draft;
beforeEach(() => {
  vi.mocked(storedResearcher).mockReset().mockReturnValue(researcher);
  vi.mocked(readSource).mockReset().mockResolvedValue(profile);
  vi.mocked(structured)
    .mockReset()
    .mockResolvedValue({
      eligible: true,
      affiliationSourceId: "profile",
      affiliationQuote:
        "Alex Chen is a professor at the University of Wisconsin-Madison.",
      reason: "Current affiliation and contact route.",
    });
});
describe("Pre-send source recheck", () => {
  it("requires a fresh fetched address and an exact university affiliation quote", async () => {
    await expect(checkContactBeforeSending(draft)).resolves.toBeUndefined();
    expect(readSource).toHaveBeenCalledWith(
      profile.url,
      new Set(["example.wisc.edu"]),
    );
  });
  it("does not proceed when the source is unreadable or the email disappeared", async () => {
    vi.mocked(readSource).mockRejectedValueOnce(new Error("offline"));
    await expect(checkContactBeforeSending(draft)).rejects.toThrow(
      /could not be rechecked/,
    );
    vi.mocked(readSource).mockResolvedValue({
      ...profile,
      text: "Alex Chen works at UW. A form is now required.",
    });
    await expect(checkContactBeforeSending(draft)).rejects.toThrow(
      /no longer appears/,
    );
    expect(structured).not.toHaveBeenCalled();
  });
  it("blocks a newly closed or ineligible contact route", async () => {
    vi.mocked(structured).mockResolvedValue({
      eligible: false,
      affiliationSourceId: "profile",
      affiliationQuote: profile.text,
      reason: "Closed",
    });
    await expect(checkContactBeforeSending(draft)).rejects.toThrow(
      /does not establish/,
    );
  });
  it("rejects unsupported model evidence even when the model says eligible", async () => {
    vi.mocked(structured).mockResolvedValue({
      eligible: true,
      affiliationSourceId: "invented",
      affiliationQuote: profile.text,
      reason: "Invented",
    });
    await expect(checkContactBeforeSending(draft)).rejects.toThrow(
      /does not establish/,
    );
  });
});
