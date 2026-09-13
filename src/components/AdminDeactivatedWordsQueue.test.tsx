import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminDeactivatedWordsQueue } from "./AdminDeactivatedWordsQueue";
import type { DeactivatedWord } from "../utils/adminApi";

const DEACTIVATED: DeactivatedWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", flaggedCount: 3 },
  { id: "2", categoryId: "animals", categoryLabel: "Animals", text: "Lion", flaggedCount: 0 },
];

describe("AdminDeactivatedWordsQueue", () => {
  it("shows an empty state when there are no deactivated words", () => {
    render(<AdminDeactivatedWordsQueue deactivatedWords={[]} onReactivate={vi.fn()} />);

    expect(screen.getByText(/no deactivated words/i)).toBeInTheDocument();
  });

  it("renders each deactivated word with its category and flag count", () => {
    render(<AdminDeactivatedWordsQueue deactivatedWords={DEACTIVATED} onReactivate={vi.fn()} />);

    expect(screen.getByText("Taco")).toBeInTheDocument();
    expect(screen.getByText(/flagged 3x/i)).toBeInTheDocument();
    expect(screen.getByText("Lion")).toBeInTheDocument();
  });

  it("does not show a flag count for a word that was never flagged", () => {
    render(<AdminDeactivatedWordsQueue deactivatedWords={DEACTIVATED} onReactivate={vi.fn()} />);

    expect(screen.queryByText(/flagged 0x/i)).not.toBeInTheDocument();
  });

  it("calls onReactivate with the word's id", () => {
    const onReactivate = vi.fn();
    render(<AdminDeactivatedWordsQueue deactivatedWords={DEACTIVATED} onReactivate={onReactivate} />);

    fireEvent.click(screen.getAllByRole("button", { name: /reactivate/i })[1]);

    expect(onReactivate).toHaveBeenCalledWith(["2"]);
  });
});
