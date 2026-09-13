import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminReviewQueue } from "./AdminReviewQueue";
import type { PendingWord } from "../utils/adminApi";

const WORDS: PendingWord[] = [
  {
    id: "1",
    categoryId: "food",
    categoryLabel: "Food",
    categoryEmoji: "🍕",
    isNewCategory: false,
    text: "Taco",
  },
  {
    id: "2",
    categoryId: "animals",
    categoryLabel: "Animals",
    categoryEmoji: "🐘",
    isNewCategory: false,
    text: "Lion",
  },
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

  it("marks a brand-new (not-yet-created) category as New", () => {
    renderQueue({
      pendingWords: [
        {
          id: "3",
          categoryId: "new:80s-action-movies",
          categoryLabel: "80s Action Movies",
          categoryEmoji: "🎬",
          isNewCategory: true,
          text: "Rambo",
        },
      ],
    });

    expect(screen.getByText("80s Action Movies")).toBeInTheDocument();
    expect(screen.getByText(/new/i)).toBeInTheDocument();
  });

  it("does not mark an existing category as New", () => {
    renderQueue();

    expect(screen.queryByText(/^new$/i)).not.toBeInTheDocument();
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

  describe("swipe gestures", () => {
    function swipe(row: HTMLElement, distance: number) {
      fireEvent.pointerDown(row, { pointerId: 1, clientX: 0 });
      fireEvent.pointerMove(row, { pointerId: 1, clientX: distance });
      fireEvent.pointerUp(row, { pointerId: 1, clientX: distance });
    }

    it("approves the word when swiped right past the threshold", () => {
      const onApprove = vi.fn();
      renderQueue({ onApprove });

      swipe(screen.getByDisplayValue("Taco").closest("div")!, 120);

      expect(onApprove).toHaveBeenCalledWith("1");
    });

    it("rejects the word when swiped left past the threshold", () => {
      const onReject = vi.fn();
      renderQueue({ onReject });

      swipe(screen.getByDisplayValue("Lion").closest("div")!, -120);

      expect(onReject).toHaveBeenCalledWith("2");
    });

    it("does not trigger an action for a short swipe below the threshold", () => {
      const onApprove = vi.fn();
      const onReject = vi.fn();
      renderQueue({ onApprove, onReject });

      swipe(screen.getByDisplayValue("Taco").closest("div")!, 30);

      expect(onApprove).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });

    it("ignores drags that start on the text input", () => {
      const onApprove = vi.fn();
      renderQueue({ onApprove });

      const input = screen.getByDisplayValue("Taco");
      fireEvent.pointerDown(input, { pointerId: 1, clientX: 0 });
      fireEvent.pointerMove(input.closest("div")!, { pointerId: 1, clientX: 120 });
      fireEvent.pointerUp(input.closest("div")!, { pointerId: 1, clientX: 120 });

      expect(onApprove).not.toHaveBeenCalled();
    });
  });
});
