import { describe, expect, it } from "vitest";
import { buildSimilarWordsPrompt, filterValidSuggestions, type CandidateWord } from "./similarity";

describe("buildSimilarWordsPrompt", () => {
  it("includes the deactivated word, category label, and candidate list", () => {
    const candidates: CandidateWord[] = [
      { id: "1", text: "Pizza Slice" },
      { id: "2", text: "Sushi" },
    ];

    const prompt = buildSimilarWordsPrompt("Pizza", "Food", candidates);

    expect(prompt).toContain('"Pizza"');
    expect(prompt).toContain('"Food"');
    expect(prompt).toContain(JSON.stringify(["Pizza Slice", "Sushi"]));
  });

  it("tells the model to be conservative and allow an empty result", () => {
    const prompt = buildSimilarWordsPrompt("Pizza", "Food", []);

    expect(prompt).toContain("Be\nconservative");
    expect(prompt).toContain("empty list is a perfectly good answer");
  });
});

describe("filterValidSuggestions", () => {
  const candidates: CandidateWord[] = [
    { id: "1", text: "Pizza Slice" },
    { id: "2", text: "Sushi" },
  ];

  it("keeps suggestions that match a candidate's text case-insensitively", () => {
    const result = filterValidSuggestions(["pizza slice"], candidates, "Pizza");

    expect(result).toEqual([{ id: "1", text: "Pizza Slice" }]);
  });

  it("drops suggestions that don't match any candidate (hallucinated words)", () => {
    const result = filterValidSuggestions(["Tacos"], candidates, "Pizza");

    expect(result).toEqual([]);
  });

  it("drops the deactivated word itself if the model echoes it back", () => {
    const result = filterValidSuggestions(["Pizza", "Sushi"], candidates, "Pizza");

    expect(result).toEqual([{ id: "2", text: "Sushi" }]);
  });

  it("dedupes repeated suggestions", () => {
    const result = filterValidSuggestions(["Sushi", "sushi"], candidates, "Pizza");

    expect(result).toEqual([{ id: "2", text: "Sushi" }]);
  });

  it("returns an empty array when nothing is suggested", () => {
    const result = filterValidSuggestions([], candidates, "Pizza");

    expect(result).toEqual([]);
  });
});
