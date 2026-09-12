import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminReviewQueue } from "./AdminReviewQueue";
import type { PendingWord } from "../utils/adminApi";

const WORDS: PendingWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
  { id: "2", categoryId: "animals", categoryLabel: "Animals", text: "Lion" },
];

function renderQueue(overrides: Partial<Parameters<typeof AdminReviewQueue>[0]> = {}) {
  return render(
    <AdminReviewQueue
      pendingWords={WORDS}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onRejectAll={vi.fn()}
      onEditSave={vi.fn()}
      {...overrides}
    />
  );
}

describe("AdminReviewQueue", () => {
  it("shows an empty state when there are no pending words", () => {
    renderQueue({ pendingWords: [] });

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
  });

  it("groups words by category and renders each word's text", () => {
    renderQueue();

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Animals")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taco")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lion")).toBeInTheDocument();
  });

  it("calls onApprove and onReject with the word's id", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderQueue({ onApprove, onReject });

    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[1]);

    expect(onApprove).toHaveBeenCalledWith("1");
    expect(onReject).toHaveBeenCalledWith("2");
  });

  it("calls onRejectAll when the bulk reject button is clicked", () => {
    const onRejectAll = vi.fn();
    renderQueue({ onRejectAll });

    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));

    expect(onRejectAll).toHaveBeenCalled();
  });

  it("calls onEditSave with the trimmed new text when the input loses focus after a change", () => {
    const onEditSave = vi.fn();
    renderQueue({ onEditSave });

    const input = screen.getByDisplayValue("Taco");
    fireEvent.change(input, { target: { value: "  Burrito  " } });
    fireEvent.blur(input);

    expect(onEditSave).toHaveBeenCalledWith("1", "Burrito");
  });

  it("does not call onEditSave when the text is blurred unchanged", () => {
    const onEditSave = vi.fn();
    renderQueue({ onEditSave });

    fireEvent.blur(screen.getByDisplayValue("Taco"));

    expect(onEditSave).not.toHaveBeenCalled();
  });
});
