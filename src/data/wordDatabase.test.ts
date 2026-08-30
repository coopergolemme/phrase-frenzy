import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCategoriesResult = {
  data: [
    { id: "food", label: "Food & Drink", emoji: "🍕", sort_order: 0 },
    { id: "animals", label: "Animals", emoji: "🐘", sort_order: 1 },
  ],
  error: null,
};

const mockWordsResult = {
  data: [
    { id: "1", category_id: "food", text: "pizza", active: true },
    { id: "2", category_id: "food", text: "taco", active: true },
    { id: "3", category_id: "animals", text: "lion", active: true },
  ],
  error: null,
};

function buildQueryChain(result: { data: unknown; error: unknown }) {
  return {
    select: () => ({
      order: () => Promise.resolve(result),
      eq: () => ({
        order: () => Promise.resolve(result),
      }),
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) =>
      table === "categories"
        ? buildQueryChain(mockCategoriesResult)
        : buildQueryChain(mockWordsResult),
  }),
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

describe("fetchWordCategories", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("assembles categories with their words, in sort_order", async () => {
    const { fetchWordCategories } = await import("./wordDatabase");
    const categories = await fetchWordCategories();

    expect(categories).toEqual([
      { id: "food", label: "Food & Drink", emoji: "🍕", words: ["pizza", "taco"] },
      { id: "animals", label: "Animals", emoji: "🐘", words: ["lion"] },
    ]);
  });
});
