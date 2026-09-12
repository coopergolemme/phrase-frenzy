import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const listPendingWordsMock = vi.fn();
const listFlaggedWordsMock = vi.fn();
const fetchWordCategoriesMock = vi.fn();

vi.mock("../utils/adminApi", () => ({
  listPendingWords: (...args: unknown[]) => listPendingWordsMock(...args),
  listFlaggedWords: (...args: unknown[]) => listFlaggedWordsMock(...args),
  generateWords: vi.fn(),
  approveWords: vi.fn(),
  rejectWords: vi.fn(),
  editWord: vi.fn(),
  deactivateWords: vi.fn(),
}));

vi.mock("../data/wordDatabase", () => ({
  fetchWordCategories: (...args: unknown[]) => fetchWordCategoriesMock(...args),
}));

describe("AdminScreen", () => {
  beforeEach(() => {
    listPendingWordsMock.mockReset();
    listFlaggedWordsMock.mockReset();
    listFlaggedWordsMock.mockResolvedValue([]);
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
    listPendingWordsMock.mockRejectedValue(new Error("Unauthorized"));
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });

  it("unlocks and shows the pending queue on a correct password", async () => {
    listPendingWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
    ]);
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
  });
});
