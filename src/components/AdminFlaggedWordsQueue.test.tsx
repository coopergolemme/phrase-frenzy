import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";
import type { FlaggedWord } from "../utils/adminApi";

const FLAGGED: FlaggedWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 3 },
  { id: "2", categoryId: "food", categoryLabel: "Food", text: "Old One", active: false, flaggedCount: 1 },
];

describe("AdminFlaggedWordsQueue", () => {
  it("shows an empty state when there are no flagged words", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={[]} onDeactivate={vi.fn()} />);

    expect(screen.getByText(/no flagged words/i)).toBeInTheDocument();
  });

  it("renders each flagged word with its category and flag count", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={vi.fn()} />);

    expect(screen.getByText("Taco")).toBeInTheDocument();
    expect(screen.getByText(/flagged 3x/i)).toBeInTheDocument();
    expect(screen.getByText("Old One")).toBeInTheDocument();
    expect(screen.getByText(/already inactive/i)).toBeInTheDocument();
  });

  it("calls onDeactivate with the word's id", () => {
    const onDeactivate = vi.fn();
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={onDeactivate} />);

    fireEvent.click(screen.getAllByRole("button", { name: /deactivate/i })[0]);

    expect(onDeactivate).toHaveBeenCalledWith(["1"]);
  });

  it("disables the button for a word that's already inactive", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={vi.fn()} />);

    const buttons = screen.getAllByRole("button", { name: /deactivate/i });
    expect(buttons[1]).toBeDisabled();
  });
});
