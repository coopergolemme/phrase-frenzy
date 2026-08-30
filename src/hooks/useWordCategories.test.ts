import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const fetchWordCategoriesMock = vi.fn();

vi.mock("../data/wordDatabase", () => ({
  fetchWordCategories: fetchWordCategoriesMock,
}));

const FETCHED = [{ id: "food", label: "Food", emoji: "🍕", words: ["pizza"] }];
const CACHED = [{ id: "animals", label: "Animals", emoji: "🐘", words: ["lion"] }];

describe("useWordCategories", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchWordCategoriesMock.mockReset();
  });

  it("uses cached categories immediately, then refreshes from the fetch", async () => {
    localStorage.setItem("phrase-frenzy:word-categories", JSON.stringify(CACHED));
    fetchWordCategoriesMock.mockResolvedValue(FETCHED);

    const { useWordCategories } = await import("./useWordCategories");
    const { result } = renderHook(() => useWordCategories());

    expect(result.current.categories).toEqual(CACHED);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => expect(result.current.categories).toEqual(FETCHED));
    expect(JSON.parse(localStorage.getItem("phrase-frenzy:word-categories")!)).toEqual(FETCHED);
  });

  it("falls back to the seed list when there is no cache and the fetch fails", async () => {
    fetchWordCategoriesMock.mockRejectedValue(new Error("network down"));

    const { useWordCategories } = await import("./useWordCategories");
    const { SEED_WORD_CATEGORIES } = await import("../data/seedWords");
    const { result } = renderHook(() => useWordCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual(SEED_WORD_CATEGORIES);
  });

  it("keeps showing cached categories if the background fetch fails", async () => {
    localStorage.setItem("phrase-frenzy:word-categories", JSON.stringify(CACHED));
    fetchWordCategoriesMock.mockRejectedValue(new Error("network down"));

    const { useWordCategories } = await import("./useWordCategories");
    const { result } = renderHook(() => useWordCategories());

    expect(result.current.categories).toEqual(CACHED);
    await waitFor(() => expect(fetchWordCategoriesMock).toHaveBeenCalled());
    expect(result.current.categories).toEqual(CACHED);
  });
});
