import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminCategoryHealth } from "./AdminCategoryHealth";
import type { CategoryHealth } from "../utils/adminApi";

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
  },
];

describe("AdminCategoryHealth", () => {
  it("shows a loading state", () => {
    render(<AdminCategoryHealth categories={[]} isLoading />);

    expect(screen.getByText(/loading category health/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no categories", () => {
    render(<AdminCategoryHealth categories={[]} isLoading={false} />);

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("renders each category with its active word count and correct rate", () => {
    render(<AdminCategoryHealth categories={CATEGORIES} isLoading={false} />);

    expect(screen.getByText(/food/i)).toBeInTheDocument();
    expect(screen.getByText("18 active")).toBeInTheDocument();
    expect(screen.getByText("75% correct rate")).toBeInTheDocument();
  });

  it("shows a dash for correct rate when a category has no gameplay data yet", () => {
    render(<AdminCategoryHealth categories={CATEGORIES} isLoading={false} />);

    expect(screen.getByText("— correct rate")).toBeInTheDocument();
  });

  it("flags a low-active-word category as needing more words", () => {
    render(<AdminCategoryHealth categories={CATEGORIES} isLoading={false} />);

    expect(screen.getByText(/needs words/i)).toBeInTheDocument();
  });

  it("flags a high-flag-rate category as needing re-curation", () => {
    render(<AdminCategoryHealth categories={CATEGORIES} isLoading={false} />);

    expect(screen.getByText(/needs re-curation/i)).toBeInTheDocument();
  });
});
