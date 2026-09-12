import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const listFlaggedWordsMock = vi.fn();
const generateWordsMock = vi.fn();
const publishWordsMock = vi.fn();
const fetchWordCategoriesMock = vi.fn();

vi.mock("../utils/adminApi", () => ({
  listFlaggedWords: (...args: unknown[]) => listFlaggedWordsMock(...args),
  generateWords: (...args: unknown[]) => generateWordsMock(...args),
  publishWords: (...args: unknown[]) => publishWordsMock(...args),
  deactivateWords: vi.fn(),
}));

vi.mock("../data/wordDatabase", () => ({
  fetchWordCategories: (...args: unknown[]) => fetchWordCategoriesMock(...args),
}));

async function unlock() {
  const { AdminScreen } = await import("./AdminScreen");
  const view = render(<AdminScreen />);
  fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "right" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /generate/i })).toBeInTheDocument());
  return view;
}

describe("AdminScreen", () => {
  beforeEach(() => {
    listFlaggedWordsMock.mockReset();
    listFlaggedWordsMock.mockResolvedValue([]);
    generateWordsMock.mockReset();
    publishWordsMock.mockReset();
    fetchWordCategoriesMock.mockReset();
    fetchWordCategoriesMock.mockResolvedValue([]);
  });

  it("shows a password prompt and does not reveal the queue up front", async () => {
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(screen.queryByText(/no pending words/i)).not.toBeInTheDocument();
  });

  it("shows an error and stays locked when the password is wrong", async () => {
    listFlaggedWordsMock.mockRejectedValue(new Error("Unauthorized"));
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });

  it("unlocks without persisting any words up front", async () => {
    await unlock();

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
    expect(publishWordsMock).not.toHaveBeenCalled();
  });

  it("adds generated candidates to the local review queue without persisting them", async () => {
    generateWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
    ]);
    await unlock();

    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
    expect(publishWordsMock).not.toHaveBeenCalled();
  });

  it("clears the queue when Reject All is clicked", async () => {
    generateWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
      { id: "2", categoryId: "food", categoryLabel: "Food", text: "Pizza" },
    ]);
    await unlock();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
  });

  it("publishes only approved words when the screen unmounts", async () => {
    generateWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
      { id: "2", categoryId: "food", categoryLabel: "Food", text: "Pizza" },
    ]);
    const { unmount } = await unlock();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);

    unmount();

    expect(publishWordsMock).toHaveBeenCalledWith("right", [{ categoryId: "food", text: "Taco" }]);
  });

  it("does not publish anything when nothing was approved on unmount", async () => {
    generateWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
    ]);
    const { unmount } = await unlock();
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));
    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());

    unmount();

    expect(publishWordsMock).not.toHaveBeenCalled();
  });
});
