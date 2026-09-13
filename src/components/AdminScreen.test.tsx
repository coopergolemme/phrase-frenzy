import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const listFlaggedWordsMock = vi.fn();
const listDeactivatedWordsMock = vi.fn();
const generateWordsMock = vi.fn();
const publishWordsMock = vi.fn();
const deactivateWordsMock = vi.fn();
const reactivateWordsMock = vi.fn();
const getCategoryHealthMock = vi.fn();
const suggestSimilarWordsMock = vi.fn();
const listCategoryWordsMock = vi.fn();

vi.mock("../utils/adminApi", () => ({
  listFlaggedWords: (...args: unknown[]) => listFlaggedWordsMock(...args),
  listDeactivatedWords: (...args: unknown[]) => listDeactivatedWordsMock(...args),
  generateWords: (...args: unknown[]) => generateWordsMock(...args),
  publishWords: (...args: unknown[]) => publishWordsMock(...args),
  deactivateWords: (...args: unknown[]) => deactivateWordsMock(...args),
  reactivateWords: (...args: unknown[]) => reactivateWordsMock(...args),
  getCategoryHealth: (...args: unknown[]) => getCategoryHealthMock(...args),
  suggestSimilarWords: (...args: unknown[]) => suggestSimilarWordsMock(...args),
  listCategoryWords: (...args: unknown[]) => listCategoryWordsMock(...args),
}));

async function renderAdmin() {
  const { AdminScreen } = await import("./AdminScreen");
  const view = render(<AdminScreen />);
  await waitFor(() => expect(screen.getByRole("heading", { name: /generate/i })).toBeInTheDocument());
  return view;
}

const TACO = {
  id: "1",
  categoryId: "food",
  categoryLabel: "Food",
  categoryEmoji: "🍕",
  isNewCategory: false,
  text: "Taco",
};

const RAMBO = {
  id: "2",
  categoryId: "new:80s-action-movies",
  categoryLabel: "80s Action Movies",
  categoryEmoji: "🎬",
  isNewCategory: true,
  text: "Rambo",
};

describe("AdminScreen", () => {
  beforeEach(() => {
    listFlaggedWordsMock.mockReset();
    listFlaggedWordsMock.mockResolvedValue([]);
    listDeactivatedWordsMock.mockReset();
    listDeactivatedWordsMock.mockResolvedValue([]);
    generateWordsMock.mockReset();
    publishWordsMock.mockReset();
    deactivateWordsMock.mockReset();
    reactivateWordsMock.mockReset();
    getCategoryHealthMock.mockReset();
    getCategoryHealthMock.mockResolvedValue([]);
    listCategoryWordsMock.mockReset();
    listCategoryWordsMock.mockResolvedValue([]);
    suggestSimilarWordsMock.mockReset();
    suggestSimilarWordsMock.mockResolvedValue([]);
  });

  it("shows a loading state and does not reveal the queue up front", async () => {
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    expect(screen.getByRole("status", { name: /loading admin data/i })).toBeInTheDocument();
    expect(screen.queryByText(/no pending words/i)).not.toBeInTheDocument();
  });

  it("loads straight into the admin screen with no password gate", async () => {
    await renderAdmin();

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
    expect(publishWordsMock).not.toHaveBeenCalled();
  });

  it("adds generated candidates to the local review queue without persisting them", async () => {
    generateWordsMock.mockResolvedValue([TACO]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
    expect(publishWordsMock).not.toHaveBeenCalled();
  });

  it("shows a proposed brand-new category alongside its words", async () => {
    generateWordsMock.mockResolvedValue([RAMBO]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Rambo")).toBeInTheDocument());
    expect(screen.getByText(/80s action movies/i)).toBeInTheDocument();
  });

  it("clears the queue when Reject All is clicked", async () => {
    generateWordsMock.mockResolvedValue([TACO, { ...TACO, id: "3", text: "Pizza" }]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
  });

  it("publishes only approved words (including their category info) when the screen unmounts", async () => {
    generateWordsMock.mockResolvedValue([RAMBO]);
    const { unmount } = await renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Rambo")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    unmount();

    expect(publishWordsMock).toHaveBeenCalledWith([
      {
        categoryId: "new:80s-action-movies",
        categoryLabel: "80s Action Movies",
        categoryEmoji: "🎬",
        isNewCategory: true,
        text: "Rambo",
      },
    ]);
  });

  it("sends previously rejected words back to generate so they aren't re-suggested", async () => {
    generateWordsMock.mockResolvedValue([TACO]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();

    generateWordsMock.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() =>
      expect(generateWordsMock).toHaveBeenLastCalledWith(
        undefined,
        expect.arrayContaining([
          expect.objectContaining({ text: "Taco", categoryId: "food" }),
        ])
      )
    );
  });

  it("clears a word's earlier rejection once it's approved on a later generate", async () => {
    generateWordsMock.mockResolvedValue([TACO]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    generateWordsMock.mockResolvedValue([{ ...TACO, id: "4" }]);
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    generateWordsMock.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() =>
      expect(generateWordsMock).toHaveBeenLastCalledWith(
        undefined,
        expect.arrayContaining([expect.objectContaining({ text: "Taco", categoryId: "food" })])
      )
    );
    const lastCallLocalWords = generateWordsMock.mock.calls.at(-1)?.[1] as { text: string }[];
    expect(lastCallLocalWords.filter((w) => w.text === "Taco")).toHaveLength(1);
  });

  it("does not publish anything when nothing was approved on unmount", async () => {
    generateWordsMock.mockResolvedValue([TACO]);
    const { unmount } = await renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    unmount();

    expect(publishWordsMock).not.toHaveBeenCalled();
  });

  it("defaults to the Word Curation tab", async () => {
    await renderAdmin();

    expect(screen.getByRole("tab", { name: "Word Curation" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /generate/i })).toBeInTheDocument();
  });

  it("switches to the Flagged Words tab and shows flagged words fetched on load", async () => {
    listFlaggedWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 2 },
    ]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("tab", { name: "Flagged Words" }));

    expect(screen.getByText("Taco")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /generate/i })).not.toBeInTheDocument();
  });

  it("switches to the Deactivated Words tab and reactivates a word", async () => {
    listDeactivatedWordsMock.mockResolvedValue([
      { id: "9", categoryId: "food", categoryLabel: "Food", text: "Pretzel", flaggedCount: 1 },
    ]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("tab", { name: "Deactivated Words" }));
    expect(screen.getByText("Pretzel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reactivate/i }));

    await waitFor(() => expect(reactivateWordsMock).toHaveBeenCalledWith(["9"]));
    expect(screen.getByText(/no deactivated words/i)).toBeInTheDocument();
  });

  it("moves a word deactivated from the Flagged tab into the Deactivated tab", async () => {
    listFlaggedWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 2 },
    ]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("tab", { name: "Flagged Words" }));

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm deactivation/i }));
    await waitFor(() => expect(deactivateWordsMock).toHaveBeenCalledWith(["1"]));

    fireEvent.click(screen.getByRole("tab", { name: "Deactivated Words" }));
    expect(screen.getByText("Taco")).toBeInTheDocument();
  });

  it("fetches and shows similar-word suggestions after deactivating a flagged word", async () => {
    listFlaggedWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 2 },
    ]);
    suggestSimilarWordsMock.mockResolvedValue([{ id: "5", text: "Burrito" }]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("tab", { name: "Flagged Words" }));

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm deactivation/i }));

    await waitFor(() => expect(suggestSimilarWordsMock).toHaveBeenCalledWith("1", undefined));
    await waitFor(() => expect(screen.getByText("Burrito")).toBeInTheDocument());
  });

  it("passes the admin's typed reason along to the similar-words request", async () => {
    listFlaggedWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 2 },
    ]);
    suggestSimilarWordsMock.mockResolvedValue([]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("tab", { name: "Flagged Words" }));

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    fireEvent.change(screen.getByLabelText(/why was this word bad/i), {
      target: { value: "too obscure" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm deactivation/i }));

    await waitFor(() => expect(suggestSimilarWordsMock).toHaveBeenCalledWith("1", "too obscure"));
  });

  it("deactivates an accepted similar-word suggestion and moves it into the Deactivated tab", async () => {
    listFlaggedWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco", active: true, flaggedCount: 2 },
    ]);
    suggestSimilarWordsMock.mockResolvedValue([{ id: "5", text: "Burrito" }]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("tab", { name: "Flagged Words" }));
    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm deactivation/i }));
    await waitFor(() => expect(screen.getByText("Burrito")).toBeInTheDocument());

    const deactivateButtons = screen.getAllByRole("button", { name: "Deactivate" });
    fireEvent.click(deactivateButtons[deactivateButtons.length - 1]);

    await waitFor(() => expect(deactivateWordsMock).toHaveBeenCalledWith(["5"]));
    expect(screen.queryByText("Burrito")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Deactivated Words" }));
    expect(screen.getByText("Burrito")).toBeInTheDocument();
  });

  it("lazily fetches category health only when that tab is opened", async () => {
    await renderAdmin();

    expect(getCategoryHealthMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "Category Health" }));

    await waitFor(() => expect(getCategoryHealthMock).toHaveBeenCalledWith());
  });

  it("renders fetched category health data", async () => {
    getCategoryHealthMock.mockResolvedValue([
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
    ]);
    await renderAdmin();

    fireEvent.click(screen.getByRole("tab", { name: "Category Health" }));

    await waitFor(() => expect(screen.getByText(/food/i)).toBeInTheDocument());
    expect(screen.getByText("75% correct rate")).toBeInTheDocument();
  });

  it("fetches and shows a category's word list when it's clicked", async () => {
    getCategoryHealthMock.mockResolvedValue([
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
    ]);
    listCategoryWordsMock.mockResolvedValue([
      { id: "1", text: "Pizza", active: true },
      { id: "2", text: "Old Joke", active: false },
    ]);
    await renderAdmin();
    fireEvent.click(screen.getByRole("tab", { name: "Category Health" }));
    await waitFor(() => expect(screen.getByText(/food/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /food/i }));

    await waitFor(() => expect(listCategoryWordsMock).toHaveBeenCalledWith("food"));
    await waitFor(() => expect(screen.getByText("Pizza")).toBeInTheDocument());
    expect(screen.getByText("Old Joke")).toBeInTheDocument();
  });
});
