import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MultiplayerHomeScreen } from "./MultiplayerHomeScreen";
import type { WordCategory } from "../data/wordCategory";

const CATEGORIES: WordCategory[] = [
  { id: "cat1", label: "Category 1", emoji: "🍎", words: [] },
];

function renderScreen(overrides: Partial<Parameters<typeof MultiplayerHomeScreen>[0]> = {}) {
  return render(
    <MultiplayerHomeScreen
      categories={CATEGORIES}
      isBusy={false}
      error={null}
      onCreate={vi.fn()}
      onJoin={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />
  );
}

describe("MultiplayerHomeScreen", () => {
  it("renders host and join options on initial choose mode", () => {
    renderScreen();

    expect(screen.getByRole("heading", { name: /play online/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /host a game/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join a game/i })).toBeInTheDocument();
  });

  it("switches to join mode and renders Scan QR Code button", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /join a game/i }));

    expect(screen.getByPlaceholderText(/e\.g\. ABCDEF/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scan qr code/i })).toBeInTheDocument();
  });

  it("opens QrScannerModal when Scan QR Code is clicked", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /join a game/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan qr code/i }));

    expect(screen.getByRole("dialog", { name: "Scan QR Code" })).toBeInTheDocument();
  });

  it("does not display flagged, stats, or history buttons when no data is provided", () => {
    renderScreen();

    expect(screen.queryByRole("button", { name: /flagged/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stats/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /history/i })).not.toBeInTheDocument();
  });

  it("displays flagged, stats, and history action buttons when data is present", () => {
    renderScreen({
      flaggedWords: ["BANANA"],
      wordStats: { BANANA: { correct: 2, skipped: 1 } },
      matchHistory: [
        {
          id: "m1",
          playedAt: "2026-01-01T00:00:00.000Z",
          roundsPerTeam: 3,
          teams: [{ name: "Team 1", score: 10 }],
          winnerNames: ["Team 1"],
        },
      ],
    });

    expect(screen.getByRole("button", { name: /flagged \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stats/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /history/i })).toBeInTheDocument();
  });

  it("opens and closes FlaggedWordsSheet when Flagged button is clicked", () => {
    const onUnflagWord = vi.fn();
    renderScreen({
      flaggedWords: ["BANANA"],
      onUnflagWord,
    });

    fireEvent.click(screen.getByRole("button", { name: /flagged \(1\)/i }));

    expect(screen.getByText("Flagged words")).toBeInTheDocument();
    expect(screen.getByText("BANANA")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close flagged words/i }));

    expect(screen.queryByText("Flagged words")).not.toBeInTheDocument();
  });

  it("opens and closes WordStatsSheet when Stats button is clicked", () => {
    renderScreen({
      wordStats: { BANANA: { correct: 2, skipped: 1 } },
      isWordFlagged: () => false,
      onToggleFlag: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: /stats/i }));

    expect(screen.getByText("Word stats")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close word stats/i }));

    expect(screen.queryByText("Word stats")).not.toBeInTheDocument();
  });

  it("opens and closes MatchHistorySheet when History button is clicked", () => {
    renderScreen({
      matchHistory: [
        {
          id: "m1",
          playedAt: "2026-01-01T00:00:00.000Z",
          roundsPerTeam: 3,
          teams: [{ name: "Team 1", score: 10 }],
          winnerNames: ["Team 1"],
        },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /history/i }));

    expect(screen.getByText("Match history")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close match history/i }));

    expect(screen.queryByText("Match history")).not.toBeInTheDocument();
  });
});
