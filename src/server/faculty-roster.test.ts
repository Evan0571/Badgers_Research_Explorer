import { describe, expect, it } from "vitest";
import {
  parseFacultyRoster,
  matchRoster,
  rosterResearcher,
  publicEvidence,
} from "./faculty-roster";
import {
  nameMatcher,
  profileContact,
  publicLinks,
} from "./department-evidence";
import { researcherSchema } from "@/lib/contracts";
import { researcherWebsiteKind } from "@/lib/researcher-website";
const html = (
  name: string,
  title = "Associate Professor",
  department = "History",
) =>
  '<p><span class="faculty-name">' +
  name +
  "</span><br>" +
  title +
  "<br>" +
  department +
  "<br>PhD 2010 Wisconsin</p>";
const date = "2026-09-01T00:00:00.000Z";
const one = parseFacultyRoster(html("BROWN,MATTHEW"), date)[0];
describe("official university-wide roster", () => {
  it("removes a mononym placeholder without inventing a name or changing hyphens and initials", () => {
    const entries = parseFacultyRoster(
      html("MITCH,-") +
        html("ZHU,A-XING") +
        html("CIGAN,A MARK") +
        html("SALYAPONGSE,A NEIL"),
    );
    expect(entries.map((r) => r.name)).toEqual([
      "Mitch",
      "A-Xing Zhu",
      "A Mark Cigan",
      "A Neil Salyapongse",
    ]);
    expect(rosterResearcher(entries[0]).initials).toBe("M");
    const old = { ...rosterResearcher(entries[0]), id: "previous-saved-id" };
    expect(rosterResearcher(entries[0], undefined, old).id).toBe(old.id);
    expect(() => parseFacultyRoster(html("-,-"))).toThrow();
  });
  it("identifies directory fallbacks even for old records and fragment URLs", () => {
    const record = rosterResearcher(one);
    expect(researcherWebsiteKind(record)).toBe("roster");
    record.contact.url += "#B";
    record.coverage!.profileCheckedAt = date;
    expect(researcherWebsiteKind(record)).toBe("roster");
    record.contact.url = "https://history.wisc.edu/staff/brown/";
    expect(researcherWebsiteKind(record)).toBe("profile");
    record.contact.url =
      "https://wisc.discovery.academicanalytics.com/scholar/1/Matthew-Brown";
    expect(researcherWebsiteKind(record)).toBe("research-index");
  });
  it("keeps appointments even without research or email", () => {
    const r = rosterResearcher(one);
    expect(researcherSchema.safeParse(r).success).toBe(true);
    expect(r.coverage?.level).toBe("roster");
    expect(r.contact.email).toBeUndefined();
    expect(r.recruitment).toBe("unknown");
    expect(r.participation.value).toBe("unknown");
  });
  it("distinguishes same-name professors in different departments", () => {
    const roster = parseFacultyRoster(
      html("BROWN,MATTHEW") +
        html("BROWN,MATTHEW", "Assistant Professor", "Surgery"),
    );
    expect(roster[0].key).not.toBe(roster[1].key);
    expect(rosterResearcher(roster[0]).id).not.toBe(
      rosterResearcher(roster[1]).id,
    );
    const person = { id: 1, firstName: "Matthew", lastName: "Brown" };
    expect(matchRoster(person, roster)).toBeUndefined();
    expect(
      matchRoster(person, roster, ["Department of Surgery"])?.department,
    ).toBe("Surgery");
    expect(nameMatcher(roster)("Matthew Brown")).toBeUndefined();
  });
  it("matches exact given and family names with optional middle names, not initials", () => {
    const roster = parseFacultyRoster(html("SMITH,JANE ANNA"));
    expect(
      matchRoster({ id: 1, firstName: "Jane", lastName: "Smith" }, roster)
        ?.name,
    ).toBe("Jane Anna Smith");
    expect(
      matchRoster({ id: 1, firstName: "J", lastName: "Smith" }, roster),
    ).toBeUndefined();
  });
  it("labels emeritus, teaching and clinical appointments separately", () => {
    const roster = parseFacultyRoster(
      html("A,ALICE", "Professor Emerita") +
        html("B,BOB", "Teaching Professor") +
        html("C,CAROL", "Associate Professor (CHS)"),
    );
    expect(roster.map((r) => r.category)).toEqual([
      "emeritus",
      "teaching",
      "clinical",
    ]);
  });
  it("refuses empty or changed source markup", () => {
    expect(() => parseFacultyRoster("<h1>Error page</h1>")).toThrow();
    expect(() =>
      parseFacultyRoster(
        '<p><span class="faculty-name">No comma</span><br>Professor</p>',
      ),
    ).toThrow();
  });
  it("keeps education out of the department when the official department line is missing", () => {
    const entry = parseFacultyRoster(
      '<p><span class="faculty-name">DOE,JANE</span><br>Professor<br><br>PhD 2010 Wisconsin</p>',
    )[0];
    expect(entry.department).toBe("Department not listed");
    expect(entry.education).toBe("PhD 2010 Wisconsin");
  });
});
const ev = publicEvidence(
  {
    id: 1,
    firstName: "Matthew",
    lastName: "Brown",
    title: "Associate Professor",
    researchSummary: "<p>Political history</p>",
    email: "hidden@wisc.edu",
    articles: [
      {
        title: "Recent research",
        year: 2025,
        desiredVisibility: 2,
        abstract: "Do not copy a full abstract",
      },
      { title: "Private draft", year: 2026, desiredVisibility: 1 },
      { title: "Removed", year: 2026, deprecatedDate: date },
    ],
  },
  [{ term: "History" }],
  date,
);
describe("research evidence and refresh", () => {
  it("retains public titles and terms without private fields or abstracts", () => {
    expect(ev.works.map((w) => w.title)).toEqual(["Recent research"]);
    expect(JSON.stringify(ev)).not.toMatch(
      /hidden@|abstract|Private draft|Removed/,
    );
    const r = rosterResearcher(one, ev);
    expect(r.coverage?.level).toBe("research-index");
    expect(r.contact.email).toBeUndefined();
    expect(r.recruitment).toBe("unknown");
    expect(r.publications?.[0].year).toBe(2025);
  });
  it("preserves indexed evidence and its date if a platform request fails", () => {
    const old = rosterResearcher(one, ev);
    const updated = rosterResearcher(
      { ...one, checkedAt: "2026-09-15T00:00:00.000Z" },
      undefined,
      old,
    );
    expect(updated.summary).toBe(old.summary);
    expect(updated.coverage?.researchCheckedAt).toBe(date);
    expect(
      updated.sources.find((s) => s.id === "uw-research-1")?.checkedAt,
    ).toBe(date);
  });
  it("keeps verified departmental email attribution during a research refresh", () => {
    const old = rosterResearcher(one, ev);
    old.contact = {
      route: "email",
      email: "matthew@wisc.edu",
      url: "https://history.wisc.edu/staff/brown/",
      sourceId: "dept",
      note: "Official email",
    };
    const updated = rosterResearcher(one, ev, old);
    expect(updated.contact).toEqual(old.contact);
  });
  it("replaces stale indexed keywords instead of accumulating them forever", () => {
    const old = rosterResearcher(one, ev);
    expect(
      rosterResearcher(one, { ...ev, terms: ["New subject"] }, old).keywords,
    ).toEqual(["New subject"]);
  });
});
describe("official individual contact evidence", () => {
  it("decodes explicit obfuscation and excludes footer contacts", () => {
    const doc =
      "<main><h1>Matthew Brown</h1><p>matthew[@]wisc[DOT]edu</p></main><footer>other@wisc.edu</footer>";
    expect(
      profileContact(doc, "https://history.wisc.edu/staff/brown/", one, date)
        ?.email,
    ).toBe("matthew@wisc.edu");
    expect(
      profileContact(doc, "https://history.wisc.edu/staff/brown/", one, date)
        ?.checkedAt,
    ).toBe(date);
  });
  it("does not choose between ambiguous emails or mismatch a person's heading", () => {
    expect(
      profileContact(
        "<h1>Matthew Brown</h1><p>a@wisc.edu b@wisc.edu</p>",
        "https://history.wisc.edu/brown/",
        one,
      )?.email,
    ).toBeUndefined();
    expect(
      profileContact(
        "<h1>Someone Else</h1><p>a@wisc.edu</p>",
        "https://history.wisc.edu/other/",
        one,
      ),
    ).toBeNull();
  });
  it("does not follow a bulk WhitePages lookup, external hosts or non-HTTPS URLs", () => {
    expect(
      publicLinks(
        '<a href="https://www.wisc.edu/directories/?q=faculty">People</a><a href="https://example.com/faculty">Faculty</a><a href="http://history.wisc.edu/staff">Faculty</a><a href="/staff/brown/">Matthew Brown</a>',
        "https://history.wisc.edu/",
      ),
    ).toEqual([
      { url: "https://history.wisc.edu/staff/brown/", label: "Matthew Brown" },
    ]);
  });
});
