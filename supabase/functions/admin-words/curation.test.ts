import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  dedupeAgainstExisting,
  MAX_INSTRUCTIONS_LENGTH,
  type CategoryRow,
  type GeneratedBatch,
} from "./curation";

describe("buildPrompt", () => {
  it("includes each category's id, label, and existing words as JSON", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];
    const existing = new Map([["food", ["pizza", "taco"]]]);

    const prompt = buildPrompt(categories, existing, 10);

    expect(prompt).toContain('id: "food"');
    expect(prompt).toContain('label: "Food"');
    expect(prompt).toContain(JSON.stringify(["pizza", "taco"]));
    expect(prompt).toContain("Generate 10 additional");
  });

  it("uses an empty existing-words array for categories with no words yet", () => {
    const categories: CategoryRow[] = [
      { id: "animals", label: "Animals", emoji: "🐘", sort_order: 0 },
    ];

    const prompt = buildPrompt(categories, new Map(), 5);

    expect(prompt).toContain("existing words: []");
  });

  it("omits the guidance block when no instructions are given", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];

    const prompt = buildPrompt(categories, new Map(), 5);

    expect(prompt).not.toContain("Additional guidance");
  });

  it("appends trimmed admin instructions as a subordinate guidance block", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];

    const prompt = buildPrompt(categories, new Map(), 5, "  lean toward 90s references  ");

    expect(prompt).toContain("Additional guidance from the admin");
    expect(prompt).toContain('"lean toward 90s references"');
    expect(prompt).not.toContain("  lean toward 90s references  ");
  });

  it("ignores blank instructions", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];

    const prompt = buildPrompt(categories, new Map(), 5, "   ");

    expect(prompt).not.toContain("Additional guidance");
  });

  it("clamps instructions to MAX_INSTRUCTIONS_LENGTH characters", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];
    const long = "a".repeat(MAX_INSTRUCTIONS_LENGTH + 50);

    const prompt = buildPrompt(categories, new Map(), 5, long);

    expect(prompt).toContain("a".repeat(MAX_INSTRUCTIONS_LENGTH));
    expect(prompt).not.toContain("a".repeat(MAX_INSTRUCTIONS_LENGTH + 1));
  });
});

describe("dedupeAgainstExisting", () => {
  const categoryIds = new Set(["food", "animals"]);

  it("drops words that already exist in that category, case-insensitively", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["Pizza", "Sushi"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, categoryIds, existing);

    expect(result.get("food")).toEqual(["Sushi"]);
  });

  it("drops duplicate words within the same generated run", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: "food", words: ["Sushi", "sushi", "Ramen"] },
    ];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.get("food")).toEqual(["Sushi", "Ramen"]);
  });

  it("ignores batches for unknown category ids", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "not-real", words: ["Ghost"] }];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.has("not-real")).toBe(false);
  });

  it("trims whitespace and drops empty entries", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["  Tacos  ", "   ", ""] }];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.get("food")).toEqual(["Tacos"]);
  });

  it("omits categories with no accepted words", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["pizza"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, categoryIds, existing);

    expect(result.has("food")).toBe(false);
  });
});
