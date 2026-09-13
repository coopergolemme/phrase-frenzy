import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminCategoryHealth } from "./AdminCategoryHealth";
import type { CategoryHealth, CategoryWordsState } from "../utils/adminApi";

const CATEGORIES: CategoryHealth[] = [
  {
    categoryId: "food",
    categoryLabel: "Food",
    categoryEmoji: "🍕",
    totalWords: 20,
    activeWords: 18,
    flaggedWords: 1,
    correct: 30,
    skipped: 10,
    guidance: null,
    decisionsSinceGuidance: 0,
  },
  {
    categoryId: "obscure",
    categoryLabel: "Obscure Stuff",
    categoryEmoji: "🎩",
    totalWords: 8,
    activeWords: 5,
    flaggedWords: 3,
    correct: 0,
    skipped: 0,
    guidance: null,
    decisionsSinceGuidance: 0,
  },
];

function renderHealth(overrides: Partial<Parameters<typeof AdminCategoryHealth>[0]> = {}) {
  return render(
    <AdminCategoryHealth
      categories={CATEGORIES}
      isLoading={false}
      expandedCategoryId={null}
      categoryWordsById={{}}
      onToggleCategory={vi.fn()}
      refiningCategoryId={null}
      onRefineGuidance={vi.fn()}
      {...overrides}
    />
  );
}

describe("AdminCategoryHealth", () => {
  it("shows a bare spinner while loading, with no other content", () => {
    renderHealth({ isLoading: true });

    expect(screen.getByRole("status", { name: /loading category health/i })).toBeInTheDocument();
    expect(screen.queryByText(/food/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no categories", () => {
    renderHealth({ categories: [] });

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("renders each category with its active word count and correct rate", () => {
    renderHealth();

    expect(screen.getByText(/food/i)).toBeInTheDocument();
    expect(screen.getByText("18 active")).toBeInTheDocument();
    expect(screen.getByText("75% correct rate")).toBeInTheDocument();
  });

  it("shows a dash for correct rate when a category has no gameplay data yet", () => {
    renderHealth();

    expect(screen.getByText("— correct rate")).toBeInTheDocument();
  });

  it("flags a low-active-word category as needing more words", () => {
    renderHealth();

    expect(screen.getByText(/needs words/i)).toBeInTheDocument();
  });

  it("flags a high-flag-rate category as needing re-curation", () => {
    renderHealth();

    expect(screen.getByText(/needs re-curation/i)).toBeInTheDocument();
  });

  it("calls onToggleCategory when a category row is clicked", () => {
    const onToggleCategory = vi.fn();
    renderHealth({ onToggleCategory });

    fireEvent.click(screen.getByRole("button", { name: /food/i }));

    expect(onToggleCategory).toHaveBeenCalledWith("food");
  });

  it("does not show a word list until the category is expanded", () => {
    const categoryWordsById: Record<string, CategoryWordsState> = {
      food: { status: "done", items: [{ id: "1", text: "Pizza", active: true }] },
    };
    renderHealth({ categoryWordsById, expandedCategoryId: null });

    expect(screen.queryByText("Pizza")).not.toBeInTheDocument();
  });

  it("shows a loading message while fetching a category's words", () => {
    const categoryWordsById: Record<string, CategoryWordsState> = {
      food: { status: "loading", items: [] },
    };
    renderHealth({ categoryWordsById, expandedCategoryId: "food" });

    expect(screen.getByText(/loading words/i)).toBeInTheDocument();
  });

  it("shows an error message when fetching a category's words fails", () => {
    const categoryWordsById: Record<string, CategoryWordsState> = {
      food: { status: "error", items: [] },
    };
    renderHealth({ categoryWordsById, expandedCategoryId: "food" });

    expect(screen.getByText(/couldn't load words/i)).toBeInTheDocument();
  });

  it("lists a category's words once expanded, marking inactive ones", () => {
    const categoryWordsById: Record<string, CategoryWordsState> = {
      food: {
        status: "done",
        items: [
          { id: "1", text: "Pizza", active: true },
          { id: "2", text: "Old Joke", active: false },
        ],
      },
    };
    renderHealth({ categoryWordsById, expandedCategoryId: "food" });

    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("Old Joke")).toBeInTheDocument();
    expect(screen.getByText("Old Joke")).toHaveClass("line-through");
  });

  it("shows a placeholder and zero-decision hint when a category has no guidance yet", () => {
    renderHealth({ expandedCategoryId: "food" });

    expect(screen.getByText(/no guidance yet/i)).toBeInTheDocument();
    expect(screen.getByText("0 decisions since last refine")).toBeInTheDocument();
  });

  it("shows existing guidance text and the decision count since it was last refined", () => {
    const categories: CategoryHealth[] = [
      { ...CATEGORIES[0], guidance: "Prefer concrete, single-item foods.", decisionsSinceGuidance: 4 },
      CATEGORIES[1],
    ];
    renderHealth({ categories, expandedCategoryId: "food" });

    expect(screen.getByText("Prefer concrete, single-item foods.")).toBeInTheDocument();
    expect(screen.getByText("4 decisions since last refine")).toBeInTheDocument();
  });

  it("calls onRefineGuidance with the category id when Refine Guidance is clicked", () => {
    const onRefineGuidance = vi.fn();
    renderHealth({ expandedCategoryId: "food", onRefineGuidance });

    fireEvent.click(screen.getByRole("button", { name: /refine guidance/i }));

    expect(onRefineGuidance).toHaveBeenCalledWith("food");
  });

  it("disables and relabels the Refine Guidance button while refining that category", () => {
    renderHealth({ expandedCategoryId: "food", refiningCategoryId: "food" });

    expect(screen.getByRole("button", { name: /refining/i })).toBeDisabled();
  });
});
