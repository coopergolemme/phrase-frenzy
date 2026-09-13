import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCategoriesResult = {
  data: [
    { id: "food", label: "Food & Drink", emoji: "🍕", sort_order: 0 },
    { id: "animals", label: "Animals", emoji: "🐘", sort_order: 1 },
  ],
  error: null,
};

let wordsPages: { data: unknown; error: unknown }[] = [];
let wordsCall = 0;

function categoriesChain() {
  return {
    select: () => ({
      order: () => Promise.resolve(mockCategoriesResult),
    }),
  };
}

function wordsChain() {
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          range: () => Promise.resolve(wordsPages[Math.min(wordsCall++, wordsPages.length - 1)]),
        }),
      }),
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => (table === "categories" ? categoriesChain() : wordsChain()),
  }),
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

describe("fetchWordCategories", () => {
  beforeEach(() => {
    vi.resetModules();
    wordsCall = 0;
  });

  it("assembles categories with their words, in sort_order", async () => {
    wordsPages = [
      {
        data: [
          { id: "1", category_id: "food", text: "pizza", active: true },
          { id: "2", category_id: "food", text: "taco", active: true },
          { id: "3", category_id: "animals", text: "lion", active: true },
        ],
        error: null,
      },
    ];

    const { fetchWordCategories } = await import("./wordDatabase");
    const categories = await fetchWordCategories();

    expect(categories).toEqual([
      { id: "food", label: "Food & Drink", emoji: "🍕", words: ["pizza", "taco"] },
      { id: "animals", label: "Animals", emoji: "🐘", words: ["lion"] },
    ]);
  });

  it("pages through more than one page of words instead of truncating at the page size", async () => {
    const PAGE_SIZE = 1000;
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `f${i}`,
      category_id: "food",
      text: `food-word-${i}`,
      active: true,
    }));
    const secondPage = [{ id: "a1", category_id: "animals", text: "lion", active: true }];
    wordsPages = [
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ];

    const { fetchWordCategories } = await import("./wordDatabase");
    const categories = await fetchWordCategories();

    const animals = categories.find((c) => c.id === "animals");
    const food = categories.find((c) => c.id === "food");
    expect(animals?.words).toEqual(["lion"]);
    expect(food?.words).toHaveLength(PAGE_SIZE);
  });
});
