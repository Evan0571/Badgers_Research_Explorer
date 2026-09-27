import { describe, expect, it } from "vitest";
import { researchers } from "@/data/researchers";
import {
  cleanQueryPlan,
  planSchema,
  researcherIndex,
  satisfiesRequiredConcepts,
  satisfiesOpportunityRequirements,
} from "./query-plan";
import { containsNormalizedTerm, normalizeTopic } from "./research-metadata";
import type { UndergraduateReview } from "./undergraduate";

const plan = (extra = {}) =>
  planSchema.parse({
    intent: "research",
    interpretation: "",
    groups: [{ title: "Philosophy", terms: ["philosophy"] }],
    excluded: [],
    ...extra,
  });
const person = (summary: string) => ({
  ...researchers[0],
  name: "Test Person",
  department: "Test department",
  title: "Professor",
  summary,
  summaryZh: "",
  keywords: [],
  topics: [],
  publications: [],
});

describe("research query meaning and mandatory conditions", () => {
  it("does not match chemistry prose merely containing being, identity or rights", () => {
    const cleaned = cleanQueryPlan(
      plan({
        groups: [
          {
            title: "Metaphysics and political philosophy",
            terms: [
              "being",
              "existence",
              "identity",
              "rights",
              "political philosophy",
              "metaphysics",
            ],
          },
        ],
      }),
      "philosophy",
    );
    const index = researcherIndex(
      person(
        "Being interested in molecular identity does not establish philosophy. Protecting rights.",
      ),
    );
    expect(cleaned.groups[0].terms).toEqual([
      "political philosophy",
      "metaphysics",
    ]);
    expect(
      cleaned.groups[0].terms.some((term) =>
        containsNormalizedTerm(index, normalizeTopic(term)),
      ),
    ).toBe(false);
  });
  it("requires gut microbiome evidence even when a profile matches the human health group", () => {
    const query = plan({
      requiredConcepts: [
        {
          title: "Gut microbiome",
          terms: ["gut microbiome", "gut microbiota"],
        },
      ],
    });
    expect(
      satisfiesRequiredConcepts(
        researcherIndex(person("Human health and social work")),
        query,
      ),
    ).toBe(false);
    expect(
      satisfiesRequiredConcepts(
        researcherIndex(person("Gut microbiota and nutrition")),
        query,
      ),
    ).toBe(true);
  });
  it("intersects distinct required concepts but leaves independent alternatives unrestricted", () => {
    const query = plan({
      requiredConcepts: [
        { title: "AI", terms: ["artificial intelligence", "machine learning"] },
        { title: "Mental health", terms: ["mental health", "depression"] },
      ],
    });
    expect(
      satisfiesRequiredConcepts(
        researcherIndex(person("Machine learning for depression")),
        query,
      ),
    ).toBe(true);
    expect(
      satisfiesRequiredConcepts(
        researcherIndex(person("Machine learning for robotics")),
        query,
      ),
    ).toBe(false);
    expect(
      satisfiesRequiredConcepts(researcherIndex(person("economics")), plan()),
    ).toBe(true);
  });
  it("does not drop an essential concept if all of its unsafe aliases were removed", () => {
    const cleaned = cleanQueryPlan(
      plan({ requiredConcepts: [{ title: "Philosophy", terms: ["being"] }] }),
      "philosophy",
    );
    expect(
      satisfiesRequiredConcepts(researcherIndex(person("being")), cleaned),
    ).toBe(false);
  });
  it("does not count unknown paid work or open positions as confirmed", () => {
    const query = plan({ requirements: ["openings", "pay"] });
    const base = person("gut microbiome");
    expect(satisfiesOpportunityRequirements(base, query)).toBe(false);
    const undergraduate = {
      openings: { value: "yes" },
      pay: { value: "unknown" },
    } as UndergraduateReview;
    expect(
      satisfiesOpportunityRequirements({ ...base, undergraduate }, query),
    ).toBe(false);
    expect(
      satisfiesOpportunityRequirements(
        {
          ...base,
          undergraduate: {
            ...undergraduate,
            pay: { ...undergraduate.pay, value: "yes" },
          },
        },
        query,
      ),
    ).toBe(true);
    expect(satisfiesOpportunityRequirements(base, plan())).toBe(true);
  });
  it("only displays unverified conditions actually quoted by the user", () => {
    const query = "只能每周投入5小时。我是大一学生。";
    expect(
      cleanQueryPlan(
        plan({ unverifiedConstraints: ["每周投入5小时", "博士", "必须有薪"] }),
        query,
      ).unverifiedConstraints,
    ).toEqual(["每周投入5小时"]);
  });
});
