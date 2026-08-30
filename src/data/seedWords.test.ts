import { describe, expect, it } from "vitest";
import { SEED_WORD_CATEGORIES } from "./seedWords";

describe("SEED_WORD_CATEGORIES", () => {
  it("has at least one category with at least one word", () => {
    expect(SEED_WORD_CATEGORIES.length).toBeGreaterThan(0);
    for (const category of SEED_WORD_CATEGORIES) {
      expect(category.id.length).toBeGreaterThan(0);
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.words.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate category ids", () => {
    const ids = SEED_WORD_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate words within a category", () => {
    for (const category of SEED_WORD_CATEGORIES) {
      expect(new Set(category.words).size).toBe(category.words.length);
    }
  });
});
