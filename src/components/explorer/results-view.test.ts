import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultsView } from "./results-view";
import { useWorkspace } from "./provider";
import { researchers } from "@/data/researchers";
import {
  unknownOpportunity,
  type UndergraduateReview,
} from "@/lib/undergraduate";

vi.mock("./provider", () => ({ useWorkspace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../locale", () => ({
  useLocale: () => ({ locale: "en", t: (en: string) => en }),
}));
vi.mock("./catalog-coverage", () => ({ CatalogCoverageBanner: () => null }));
vi.mock("./researcher-dialog", () => ({ ResearcherDialog: () => null }));
vi.mock("./research-card", () => ({
  ResearchCard: ({ researcher }: { researcher: { name: string } }) =>
    createElement("p", {}, researcher.name),
}));

const savedSearch = {
  id: "saved-result",
  query: "philosophy",
  outcome: "matches",
  cached: true,
  checkedAt: new Date().toISOString(),
  warnings: [],
  directions: [
    {
      id: "zero",
      title: "An uncovered direction",
      question: "A specific question",
      keywords: ["uncovered-topic"],
    },
  ],
  researchers: [researchers[0]],
};
let state: {
  workspace: object;
  jobs: object;
  setWorkspace: ReturnType<typeof vi.fn>;
  comparisonTrayDismissed: boolean;
  dismissComparisonTray: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  state = {
    workspace: {
      query: "philosophy",
      search: savedSearch,
      topics: [],
      comparison: [],
    },
    jobs: {
      searchStage: "",
      searchError: "",
      search: vi.fn(),
      stopSearch: vi.fn(),
    },
    setWorkspace: vi.fn(),
    comparisonTrayDismissed: true,
    dismissComparisonTray: vi.fn(),
  };
  vi.mocked(useWorkspace).mockImplementation(
    () => state as unknown as ReturnType<typeof useWorkspace>,
  );
});
it("keeps previous researchers visible during another search", () => {
  state.jobs = {
    ...state.jobs,
    searchStage: "Searching UW public sources",
    searchStartedAt: Date.now(),
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).toContain(researchers[0].name);
  expect(html).toContain("previous completed results remain available");
  expect(html).toContain("View available results");
  expect(html).toContain("Stop search");
});
it("renders independent filters and applies their intersection to saved results", () => {
  const review: UndergraduateReview = {
    version: 1,
    attemptedAt: "2026-09-27",
    checkedAt: "2026-09-27",
    status: "checked",
    discovery: "searched",
    supervision: { ...unknownOpportunity(), value: "yes" },
    openings: { ...unknownOpportunity(), value: "no" },
    applications: unknownOpportunity(),
    credit: unknownOpportunity(),
    pay: unknownOpportunity(),
    applicationUrl: null,
    contactOptions: [],
    websites: [],
    attempts: [],
    limitations: [],
  };
  state.workspace = {
    ...state.workspace,
    undergraduateFilters: { supervision: "yes", openings: "no" },
    search: {
      ...savedSearch,
      researchers: [{ ...researchers[0], undergraduate: review }],
    },
  };
  const shown = renderToStaticMarkup(createElement(ResultsView));
  expect(shown).toContain("Undergraduate mentoring");
  expect(shown).toContain("Current undergraduate openings");
  expect(shown).toContain("Undergraduate applications");
  expect(shown).toContain(researchers[0].name);
  state.workspace = {
    ...state.workspace,
    undergraduateFilters: { supervision: "yes", openings: "yes" },
  };
  const hidden = renderToStaticMarkup(createElement(ResultsView));
  expect(hidden).not.toContain(researchers[0].name);
  expect(hidden).toContain("No matches for these filters");
});
it("keeps saved researchers visible after an error or cancellation", () => {
  state.jobs = { ...state.jobs, searchError: "This task was cancelled." };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).toContain(researchers[0].name);
  expect(html).toContain("This task was cancelled.");
});
it("hides old empty directions and ignores their saved selection without hiding professors", () => {
  state.workspace = { ...state.workspace, topics: ["zero"] };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).not.toContain("An uncovered direction");
  expect(html).not.toContain("Explore a direction");
  expect(html).toContain(researchers[0].name);
  expect(html).not.toContain("No matches for these filters");
});
it("shows only matched directions and their actual count even with stale match-all selections", () => {
  state.workspace = {
    ...state.workspace,
    topics: ["zero", "matched"],
    matchAll: true,
    search: {
      ...savedSearch,
      directions: [
        ...savedSearch.directions,
        {
          id: "matched",
          title: "A matched direction",
          question: "Supported by a profile",
          keywords: [researchers[0].name],
        },
      ],
    },
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).not.toContain("An uncovered direction");
  expect(html).toContain("A matched direction");
  expect(html).toContain("1 researchers");
  expect(html).toContain(researchers[0].name);
  expect(html).not.toContain("No matches for these filters");
});
it("replaces entirely unmatched saved directions with an honest empty result and useful actions", () => {
  state.workspace = {
    ...state.workspace,
    topics: ["zero"],
    search: { ...savedSearch, researchers: [] },
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).not.toContain("An uncovered direction");
  expect(html).not.toContain("Explore a direction");
  expect(html).not.toContain('role="combobox"');
  expect(html).toContain("no research directions are shown");
  expect(html).toContain("Adjust my interests");
  expect(html).toContain("Browse faculty catalog");
});
it("labels an unfinished web lookup distinctly from a completed empty result", () => {
  state.workspace = {
    ...state.workspace,
    search: { ...savedSearch, researchers: [], webSearchStatus: "timed-out" },
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).toContain("Web lookup stopped at its time limit");
  expect(html).toContain("web lookup is incomplete");
  expect(html).not.toContain("An uncovered direction");
  expect(html).not.toContain("Search this direction on the web");
  expect(html).not.toContain("Search public sources (optional)");
});

it("offers a usable catalog path instead of a futile retry when AI credit is exhausted", () => {
  state.workspace = {
    ...state.workspace,
    query: "new request",
    search: { ...savedSearch, outcome: "needs-clarification", researchers: [] },
  };
  state.jobs = {
    ...state.jobs,
    searchError:
      "The AI service reached its usage limit (credit_balance_exhausted). Try again later.",
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).toContain("This search could not finish.");
  expect(html).toContain("Browse faculty catalog");
  expect(html).toContain("no remaining credit");
  expect(html).not.toContain("Retry search");
  expect(html).not.toContain("A clearer question to begin.");
});
it("explains strict conditions even when no profile has confirmed evidence", () => {
  state.workspace = {
    ...state.workspace,
    search: {
      ...savedSearch,
      outcome: "empty",
      researchers: [],
      interpretation: "Gut microbiome with paid undergraduate openings",
      warnings: [
        "Required source evidence: openings, pay. 42 topic-related profiles were excluded because these conditions are not confirmed. Unknown is not evidence of no opportunity.",
      ],
    },
  };
  const html = renderToStaticMarkup(createElement(ResultsView));
  expect(html).toContain("How we understood your request");
  expect(html).toContain("42 topic-related profiles");
  expect(html).toContain("Unknown is not evidence of no opportunity");
});
