import { describe, expect, it } from "vitest";
import { researchers } from "@/data/researchers";
import { literalCatalogTerms, rankCatalogMatches } from "./catalog-matching";

describe("catalog matches remain useful when semantic search is unavailable", () => {
  it("uses whole-topic bilingual aliases instead of incidental nouns", () => {
    expect(
      literalCatalogTerms("AI", researchers).map((term) => term.toLowerCase()),
    ).toContain("artificial intelligence");
    expect(literalCatalogTerms("哲学", researchers)).toContain("Philosophy");
    expect(
      literalCatalogTerms("I like apple juice on flights", researchers),
    ).toEqual([]);
    expect(
      literalCatalogTerms("AI except machine learning", researchers),
    ).toEqual([]);
    expect(
      literalCatalogTerms("<img src=x onerror=alert(1)>", researchers),
    ).toEqual([]);
  });
  it("ranks direct department evidence before keyword and publication mentions without dropping matches", () => {
    const base = {
      ...researchers[0],
      keywords: [],
      department: "Engineering",
      title: "Professor",
      summary: "",
      summaryZh: "",
    };
    const incidental = {
      ...base,
      id: "incidental",
      name: "A Person",
      publications: [{ title: "Philosophy of systems", year: 2026 }],
    };
    const department = {
      ...base,
      id: "department",
      name: "Z Person",
      department: "Information School; Philosophy",
    };
    const topic = {
      ...base,
      id: "topic",
      name: "B Person",
      keywords: ["philosophy"],
    };
    const input = [incidental, topic, department];
    expect(rankCatalogMatches(input, ["philosophy"]).map((r) => r.id)).toEqual([
      "department",
      "topic",
      "incidental",
    ]);
    expect(input.map((r) => r.id)).toEqual([
      "incidental",
      "topic",
      "department",
    ]);
  });
});
