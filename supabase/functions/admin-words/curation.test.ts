import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  dedupeAgainstExisting,
  MAX_INSTRUCTIONS_LENGTH,
  type GeneratedBatch,
  type KnownCategory,
} from "./curation";

const FOOD: KnownCategory = { id: "food", label: "Food", emoji: "🍕", isNewCategory: false };
const ANIMALS: KnownCategory = { id: "animals", label: "Animals", emoji: "🐘", isNewCategory: false };

describe("buildPrompt", () => {
  it("includes each category's id, label, and existing words as JSON", () => {
    const existing = new Map([["food", ["pizza", "taco"]]]);

    const prompt = buildPrompt([FOOD], existing, 10);

    expect(prompt).toContain('id: "food"');
    expect(prompt).toContain('label: "Food"');
    expect(prompt).toContain(JSON.stringify(["pizza", "taco"]));
    expect(prompt).toContain("Generate 10 original");
  });

  it("uses an empty existing-words array for categories with no words yet", () => {
    const prompt = buildPrompt([ANIMALS], new Map(), 5);

    expect(prompt).toContain("existing words: []");
  });

  it("instructs the model to reuse an existing category or propose a new one", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5);

    expect(prompt).toContain("propose ONE new category");
    expect(prompt).toContain("newCategoryLabel");
    expect(prompt).toContain("newCategoryEmoji");
  });

  it("omits the request block when no instructions are given", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5);

    expect(prompt).not.toContain("admin's request");
  });

  it("includes trimmed admin instructions as the driving request", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5, "  80s action movies  ");

    expect(prompt.toLowerCase()).toContain("admin's request");
    expect(prompt).toContain('"80s action movies"');
    expect(prompt).not.toContain("  80s action movies  ");
  });

  it("ignores blank instructions", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5, "   ");

    expect(prompt).not.toContain("admin's request");
  });

  it("tells the model not to drift onto a related-but-different topic", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5, "famous places");

    expect(prompt).toContain("Do NOT drift onto a related-but-different topic");
    expect(prompt).toContain("famous people");
    expect(prompt).toContain("not merely adjacent or a superset");
  });

  it("makes the admin's request an override, not just filing context", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5, "famous places");

    expect(prompt).toContain("THIS IS YOUR ASSIGNMENT, NOT A SUGGESTION");
    expect(prompt).toContain("not a menu of\ntopics to pick from or a source of inspiration");
    expect(prompt).toContain("re-read the request above and check every word against\nit one more time");
  });

  it("tells the model to pick from existing categories when no request is given", () => {
    const prompt = buildPrompt([FOOD], new Map(), 5);

    expect(prompt).toContain("No specific topic was requested");
    expect(prompt).not.toContain("YOUR ASSIGNMENT");
  });

  it("clamps instructions to MAX_INSTRUCTIONS_LENGTH characters", () => {
    const long = "a".repeat(MAX_INSTRUCTIONS_LENGTH + 50);

    const prompt = buildPrompt([FOOD], new Map(), 5, long);

    expect(prompt).toContain("a".repeat(MAX_INSTRUCTIONS_LENGTH));
    expect(prompt).not.toContain("a".repeat(MAX_INSTRUCTIONS_LENGTH + 1));
  });
});

describe("dedupeAgainstExisting", () => {
  const known = [FOOD, ANIMALS];

  it("accepts words for an existing category by id", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["Pizza", "Sushi"] }];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([
      { categoryId: "food", label: "Food", emoji: "🍕", isNewCategory: false, words: ["Pizza", "Sushi"] },
    ]);
  });

  it("drops words that already exist in that category, case-insensitively", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["Pizza", "Sushi"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, known, existing);

    expect(result[0].words).toEqual(["Sushi"]);
  });

  it("drops duplicate words within the same generated run", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["Sushi", "sushi", "Ramen"] }];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result[0].words).toEqual(["Sushi", "Ramen"]);
  });

  it("trims whitespace and drops empty entries", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["  Tacos  ", "   ", ""] }];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result[0].words).toEqual(["Tacos"]);
  });

  it("drops a batch with an unknown categoryId and no new-category proposal", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "not-real", words: ["Ghost"] }];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([]);
  });

  it("omits categories with no accepted words after dedup", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["pizza"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, known, existing);

    expect(result).toEqual([]);
  });

  it("creates a new category when categoryId is null and a label+emoji are proposed", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: null, newCategoryLabel: "80s Action Movies", newCategoryEmoji: "🎬", words: ["Rambo"] },
    ];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([
      {
        categoryId: "new:80s-action-movies",
        label: "80s Action Movies",
        emoji: "🎬",
        isNewCategory: true,
        words: ["Rambo"],
      },
    ]);
  });

  it("drops an invalid new-category proposal missing a label or emoji", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: null, newCategoryEmoji: "🎬", words: ["Rambo"] },
      { categoryId: null, newCategoryLabel: "80s Action Movies", words: ["Rocky"] },
    ];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([]);
  });

  it("merges multiple proposals for the same new category label (case-insensitive), deduping words", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: null, newCategoryLabel: "80s Action Movies", newCategoryEmoji: "🎬", words: ["Rambo"] },
      { categoryId: null, newCategoryLabel: "80s action movies", newCategoryEmoji: "🎬", words: ["rambo", "Rocky"] },
    ];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([
      {
        categoryId: "new:80s-action-movies",
        label: "80s Action Movies",
        emoji: "🎬",
        isNewCategory: true,
        words: ["Rambo", "Rocky"],
      },
    ]);
  });

  it("resolves a new-category proposal to an existing known category with a matching label instead of duplicating it", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: null, newCategoryLabel: "food", newCategoryEmoji: "🍔", words: ["Nachos"] },
    ];

    const result = dedupeAgainstExisting(batches, known, new Map());

    expect(result).toEqual([
      { categoryId: "food", label: "Food", emoji: "🍕", isNewCategory: false, words: ["Nachos"] },
    ]);
  });

  it("keeps adding to an already-pending (unpublished) new category passed in as known", () => {
    const pending: KnownCategory = {
      id: "new:80s-action-movies",
      label: "80s Action Movies",
      emoji: "🎬",
      isNewCategory: true,
    };
    const batches: GeneratedBatch[] = [{ categoryId: "new:80s-action-movies", words: ["Predator"] }];
    const existing = new Map([["new:80s-action-movies", new Set(["rambo"])]]);

    const result = dedupeAgainstExisting(batches, [...known, pending], existing);

    expect(result).toEqual([
      {
        categoryId: "new:80s-action-movies",
        label: "80s Action Movies",
        emoji: "🎬",
        isNewCategory: true,
        words: ["Predator"],
      },
    ]);
  });
});
