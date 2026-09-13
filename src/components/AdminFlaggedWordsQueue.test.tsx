import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";
import type { FlaggedWord, SimilarWordSuggestions } from "../utils/adminApi";

const FLAGGED: FlaggedWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 3 },
  { id: "2", categoryId: "food", categoryLabel: "Food", text: "Old One", active: false, flaggedCount: 1 },
];

function renderQueue(overrides: Partial<Parameters<typeof AdminFlaggedWordsQueue>[0]> = {}) {
  return render(
    <AdminFlaggedWordsQueue
      flaggedWords={FLAGGED}
      onDeactivate={vi.fn()}
      similarSuggestions={{}}
      onDeactivateSuggestion={vi.fn()}
      onDismissSuggestion={vi.fn()}
      {...overrides}
    />
  );
}

describe("AdminFlaggedWordsQueue", () => {
  it("shows an empty state when there are no flagged words", () => {
    renderQueue({ flaggedWords: [] });

    expect(screen.getByText(/no flagged words/i)).toBeInTheDocument();
  });

  it("renders each flagged word with its category and flag count", () => {
    renderQueue();

    expect(screen.getByText("Taco")).toBeInTheDocument();
    expect(screen.getByText(/flagged 3x/i)).toBeInTheDocument();
    expect(screen.getByText("Old One")).toBeInTheDocument();
    expect(screen.getByText(/already inactive/i)).toBeInTheDocument();
  });

  it("calls onDeactivate with the word's id", () => {
    const onDeactivate = vi.fn();
    renderQueue({ onDeactivate });

    fireEvent.click(screen.getAllByRole("button", { name: /deactivate/i })[0]);

    expect(onDeactivate).toHaveBeenCalledWith(["1"]);
  });

  it("disables the button for a word that's already inactive", () => {
    renderQueue();

    const buttons = screen.getAllByRole("button", { name: /deactivate/i });
    expect(buttons[1]).toBeDisabled();
  });

  it("shows a loading message while fetching similar-word suggestions", () => {
    const similarSuggestions: Record<string, SimilarWordSuggestions> = {
      "1": { status: "loading", items: [] },
    };
    renderQueue({ similarSuggestions });

    expect(screen.getByText(/checking for similar words/i)).toBeInTheDocument();
  });

  it("shows an error message when fetching suggestions fails", () => {
    const similarSuggestions: Record<string, SimilarWordSuggestions> = {
      "1": { status: "error", items: [] },
    };
    renderQueue({ similarSuggestions });

    expect(screen.getByText(/couldn't check for similar words/i)).toBeInTheDocument();
  });

  it("lists similar-word suggestions with deactivate and dismiss actions", () => {
    const similarSuggestions: Record<string, SimilarWordSuggestions> = {
      "1": { status: "done", items: [{ id: "5", text: "Burrito" }] },
    };
    const onDeactivateSuggestion = vi.fn();
    const onDismissSuggestion = vi.fn();
    renderQueue({ similarSuggestions, onDeactivateSuggestion, onDismissSuggestion });

    expect(screen.getByText("Burrito")).toBeInTheDocument();

    const deactivateButtons = screen.getAllByRole("button", { name: "Deactivate" });
    fireEvent.click(deactivateButtons[1]);
    expect(onDeactivateSuggestion).toHaveBeenCalledWith("1", { id: "5", text: "Burrito" });

    fireEvent.click(screen.getByRole("button", { name: /dismiss suggestion: burrito/i }));
    expect(onDismissSuggestion).toHaveBeenCalledWith("1", "5");
  });

  it("renders nothing extra when suggestions finished loading with no matches", () => {
    const similarSuggestions: Record<string, SimilarWordSuggestions> = {
      "1": { status: "done", items: [] },
    };
    renderQueue({ similarSuggestions });

    expect(screen.queryByText(/similar words still active/i)).not.toBeInTheDocument();
  });
});
