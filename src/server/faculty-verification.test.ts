import { describe, expect, it } from "vitest";
import { researchers } from "@/data/researchers";
import { unknownOpportunity, type OpportunityFact } from "@/lib/undergraduate";
import {
  buildFacultyReview,
  followableLink,
  validateFact,
  nameMatches,
  type CollectedPages,
  type VerificationExtraction,
} from "./faculty-verification";
import type { SourceDocument } from "./sources";

const person = { ...researchers[0], name: "Jane Smith" };
const doc: SourceDocument = {
  id: "home",
  url: "https://pages.cs.wisc.edu/~jane/",
  title: "Jane Smith",
  text: "Jane Smith is a professor at UW-Madison. Undergraduate researchers: Alex Jones. Our lab is currently at full capacity; no undergraduate openings. Prospective undergraduate researchers should complete this application form before emailing.",
  links: ["https://forms.gle/example"],
  checkedAt: "2026-09-27T00:00:00Z",
};
const fact = (
  value: "yes" | "no",
  quote: string,
  period: "current" | "historical" | "unspecified" = "current",
): OpportunityFact => ({
  value,
  detail: quote,
  detailZh: quote,
  evidence: [{ sourceId: doc.id, quote, audience: "undergraduate", period }],
});
const pages: CollectedPages = {
  documents: [doc],
  attempts: [
    { url: doc.url, status: "read", reason: "", checkedAt: doc.checkedAt },
  ],
  websites: [{ url: doc.url, kind: "personal" }],
  limitations: [],
};
function extraction(): VerificationExtraction {
  return {
    identity: {
      verified: true,
      sourceId: "home",
      quote: "Jane Smith is a professor at UW-Madison.",
    },
    supervision: fact("yes", "Undergraduate researchers: Alex Jones."),
    applications: fact(
      "yes",
      "Prospective undergraduate researchers should complete this application form before emailing.",
    ),
    openings: fact(
      "no",
      "Our lab is currently at full capacity; no undergraduate openings.",
    ),
    credit: unknownOpportunity(),
    pay: unknownOpportunity(),
    contactOptions: [
      {
        kind: "form",
        url: "https://forms.gle/example",
        label: "Application form",
        labelZh: "申请表",
        required: true,
        sourceId: "home",
        quote:
          "Prospective undergraduate researchers should complete this application form before emailing.",
      },
    ],
    profile: {
      academicTitle: "",
      title: "",
      summary: "",
      summaryZh: "",
      keywords: [],
      sourceId: "",
      quote: "",
    },
  };
}

describe("independent undergraduate findings", () => {
  it("preserves mentorship and application routes even when current openings are closed", () => {
    const r = buildFacultyReview(person, pages, extraction(), true);
    expect(r.participation.value).toBe("supported");
    expect(r.recruitment).toBe("closed");
    expect(r.undergraduate?.applications.value).toBe("yes");
    expect(r.contact.route).toBe("form");
    expect(r.undergraduate?.contactOptions[0].url).toBe(
      "https://forms.gle/example",
    );
  });
  it("does not turn full capacity into never supervising undergraduates", () => {
    expect(
      validateFact(
        fact(
          "no",
          "Our lab is currently at full capacity; no undergraduate openings.",
        ),
        "supervision",
        [doc],
      ).value,
    ).toBe("unknown");
  });
  it("rejects fabricated evidence and graduate-only scope", () => {
    expect(
      validateFact(
        fact("yes", "There are many funded undergraduate jobs here."),
        "openings",
        [doc],
      ).value,
    ).toBe("unknown");
    const f = fact("yes", "Undergraduate researchers: Alex Jones.");
    f.evidence[0].audience = "unknown";
    expect(validateFact(f, "supervision", [doc]).value).toBe("unknown");
  });
  it("does not use former undergraduate members as current openings", () => {
    const f = fact(
      "yes",
      "Undergraduate researchers: Alex Jones.",
      "historical",
    );
    expect(validateFact(f, "supervision", [doc]).value).toBe("yes");
    expect(validateFact(f, "openings", [doc]).value).toBe("unknown");
  });
  it("does not turn a named summer program's deadline into the professor's overall availability", () => {
    const program = {
      ...doc,
      title: "Applying to the summer research program",
      text: "The undergraduate summer program application process is now closed.",
    };
    const f = fact("no", program.text);
    expect(validateFact(f, "openings", [program]).value).toBe("unknown");
    expect(
      validateFact({ ...f, value: "yes" }, "applications", [program]).value,
    ).toBe("unknown");
  });
  it("rejects a form URL that was never linked on the evidence page", () => {
    const raw = extraction();
    raw.contactOptions[0].url = "https://forms.gle/invented";
    expect(
      buildFacultyReview(person, pages, raw, true).undergraduate
        ?.contactOptions,
    ).toEqual([]);
  });
  it("accepts an exact HTML title as identity evidence when the name was in the page header", () => {
    const raw = extraction();
    raw.identity.quote = "Jane Smith";
    expect(
      buildFacultyReview(person, pages, raw, true).undergraduate?.status,
    ).toBe("checked");
  });
  it("supports roster names written with initials", () => {
    expect(
      nameMatches(
        "Professor Bahadir Balantekin UW-Madison",
        "A. B. Balantekin",
      ),
    ).toBe(true);
    expect(nameMatches("A different professor", "A. B. Balantekin")).toBe(
      false,
    );
  });
  it("requires more than an invitation for a mentoring-history finding", () => {
    expect(
      validateFact(
        fact(
          "yes",
          "Prospective undergraduate researchers should complete this application form before emailing.",
        ),
        "supervision",
        [doc],
      ).value,
    ).toBe("unknown");
  });
  it("keeps old evidence and its date after an unsuccessful refresh", () => {
    const old = buildFacultyReview(person, pages, extraction(), true);
    const failed = buildFacultyReview(
      old,
      { ...pages, documents: [] },
      null,
      false,
    );
    expect(failed.undergraduate?.status).toBe("failed");
    expect(failed.undergraduate?.checkedAt).toBe(old.undergraduate?.checkedAt);
    expect(failed.undergraduate?.supervision.value).toBe("yes");
  });
  it("never accepts another person's page as identity evidence", () => {
    const raw = extraction();
    raw.identity.quote = "Jane Smith is a professor at UW-Madison.";
    expect(
      buildFacultyReview(
        { ...person, name: "Another Person" },
        pages,
        raw,
        true,
      ).undergraduate?.status,
    ).toBe("failed");
  });
  it("follows recruitment and team pages but not another faculty account", () => {
    expect(
      followableLink(doc, {
        url: doc.url + "join.html",
        label: "Join our group",
      }),
    ).toBe(true);
    expect(
      followableLink(doc, {
        url: "https://pages.cs.wisc.edu/~other/people.html",
        label: "People",
      }),
    ).toBe(false);
    expect(
      followableLink(doc, { url: "https://forms.gle/example", label: "Apply" }),
    ).toBe(false);
  });
});
