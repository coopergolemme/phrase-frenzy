import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminReviewQueue } from "./AdminReviewQueue";
import type { PendingWord } from "../utils/adminApi";

const WORDS: PendingWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
  { id: "2", categoryId: "animals", categoryLabel: "Animals", text: "Lion" },
];

describe("AdminReviewQueue", () => {
  it("shows an empty state when there are no pending words", () => {
    render(
      <AdminReviewQueue pendingWords={[]} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={vi.fn()} />
    );

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
  });

  it("groups words by category and renders each word's text", () => {
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={vi.fn()} />
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Animals")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taco")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lion")).toBeInTheDocument();
  });

  it("calls onApprove and onReject with the word's id", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={onApprove} onReject={onReject} onEditSave={vi.fn()} />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /approve/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /reject/i })[1]);

    expect(onApprove).toHaveBeenCalledWith("1");
    expect(onReject).toHaveBeenCalledWith("2");
  });

  it("calls onEditSave with the trimmed new text when the input loses focus after a change", () => {
    const onEditSave = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={onEditSave} />
    );

    const input = screen.getByDisplayValue("Taco");
    fireEvent.change(input, { target: { value: "  Burrito  " } });
    fireEvent.blur(input);

    expect(onEditSave).toHaveBeenCalledWith("1", "Burrito");
  });

  it("does not call onEditSave when the text is blurred unchanged", () => {
    const onEditSave = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={onEditSave} />
    );

    fireEvent.blur(screen.getByDisplayValue("Taco"));

    expect(onEditSave).not.toHaveBeenCalled();
  });
});
