import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";
import type { FlaggedWord } from "../utils/adminApi";

const FLAGGED: FlaggedWord[] = [
  {
    word: "taco",
    flaggedAt: "2026-01-01T00:00:00.000Z",
    matches: [{ id: "1", categoryId: "food", categoryLabel: "Food", active: true }],
  },
  {
    word: "ghost word",
    flaggedAt: "2026-01-02T00:00:00.000Z",
    matches: [],
  },
];

describe("AdminFlaggedWordsQueue", () => {
  it("shows an empty state when there are no flagged words", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={[]} onDeactivate={vi.fn()} />);

    expect(screen.getByText(/no flagged words/i)).toBeInTheDocument();
  });

  it("renders each flagged word and its matching category", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={vi.fn()} />);

    expect(screen.getByText("taco")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("ghost word")).toBeInTheDocument();
    expect(screen.getByText(/not in word bank/i)).toBeInTheDocument();
  });

  it("calls onDeactivate with the matching active word ids", () => {
    const onDeactivate = vi.fn();
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={onDeactivate} />);

    fireEvent.click(screen.getAllByRole("button", { name: /deactivate/i })[0]);

    expect(onDeactivate).toHaveBeenCalledWith(["1"]);
  });

  it("disables the button when a word has no active matches", () => {
    render(<AdminFlaggedWordsQueue flaggedWords={FLAGGED} onDeactivate={vi.fn()} />);

    const buttons = screen.getAllByRole("button", { name: /deactivate/i });
    expect(buttons[1]).toBeDisabled();
  });
});
