import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreboardScreen } from "./ScoreboardScreen";
import type { ScoreboardState } from "../../hooks/useScoreboardState";

const mockScoreboardState: ScoreboardState = {
  status: "playing",
  lobby: null,
  state: null,
  timeRemaining: 45,
  activeTeam: { id: "t1", name: "Team Fire", totalScore: 12, members: ["Alice"] },
  describerName: "Alice",
  roundLabel: "Round 1 of 3",
  roundScore: 3,
  teams: [
    { id: "t1", name: "Team Fire", totalScore: 12, members: ["Alice"] },
    { id: "t2", name: "Team Ice", totalScore: 8, members: ["Bob"] },
  ],
  roundLog: [{ word: "BANANA", outcome: "correct" }],
  turnQueue: [{ teamName: "Team Ice", describerName: "Bob" }],
  isPaused: false,
  isLoading: false,
  error: null,
  currentRoundNumber: 1,
  totalRounds: 3,
};

vi.mock("../../hooks/useScoreboardState", () => ({
  useScoreboardState: () => mockScoreboardState,
}));

vi.mock("../RoomQrCode", () => ({
  RoomQrCode: () => <div data-testid="qr-code">QR CODE</div>,
}));

describe("ScoreboardScreen", () => {
  it("renders live playing view correctly", () => {
    render(<ScoreboardScreen roomCode="TEST123" />);

    expect(screen.getAllByText("Team Fire")[0]).toBeInTheDocument();
    expect(screen.getByText(/Alice describing/i)).toBeInTheDocument();
    expect(screen.getByText("45s")).toBeInTheDocument();
    expect(screen.getByText("✓ BANANA")).toBeInTheDocument();
  });

  it("renders overlay mode HUD when specified", () => {
    render(<ScoreboardScreen roomCode="TEST123" isOverlayMode={true} />);

    expect(screen.getByText("Match Standings")).toBeInTheDocument();
    expect(screen.getAllByText("Team Fire")[0]).toBeInTheDocument();
    expect(screen.getByText("Team Ice")).toBeInTheDocument();
  });
});
