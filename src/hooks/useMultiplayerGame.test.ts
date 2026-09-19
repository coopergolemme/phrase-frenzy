import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { PublicGameState, LobbyPlayer } from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";

const mockPublicState: PublicGameState = {
  status: "roundSummary",
  turnIndex: 2,
  roundsPerTeam: 3,
  durationSec: 60,
  turnStartedAt: new Date().toISOString(),
  pausedAt: null,
  penaltySec: 0,
  teams: [
    { id: "team-1", name: "Team 1", totalScore: 5, members: ["Alice"] },
    { id: "team-2", name: "Team 2", totalScore: 3, members: ["Bob"] },
  ],
  turnOrder: [0, 1, 0, 1, 0, 1],
  roundScore: 2,
  roundLog: [{ word: "APPLE", outcome: "correct" }],
};

const fetchPublicStateMock = vi.fn().mockResolvedValue(mockPublicState);
const subscribeToPublicStateMock = vi.fn().mockReturnValue(vi.fn());

vi.mock("../utils/multiplayerRealtime", () => ({
  fetchPublicState: (code: string) => fetchPublicStateMock(code),
  subscribeToPublicState: (code: string, cb: (state: PublicGameState) => void) =>
    subscribeToPublicStateMock(code, cb),
}));

describe("useMultiplayerGame", () => {
  const session: MultiplayerSession = {
    roomCode: "ROOM123",
    playerToken: "token-1",
    playerId: "p1",
    name: "Alice",
  };

  const lobbyPlayers: LobbyPlayer[] = [
    { id: "p1", name: "Alice", teamIndex: 0 },
    { id: "p2", name: "Bob", teamIndex: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    fetchPublicStateMock.mockResolvedValue(mockPublicState);
    subscribeToPublicStateMock.mockReturnValue(vi.fn());
  });

  it("returns default values before public state loads", async () => {
    fetchPublicStateMock.mockImplementation(() => new Promise(() => {}));
    const { useMultiplayerGame } = await import("./useMultiplayerGame");
    const { result } = renderHook(() => useMultiplayerGame(session, lobbyPlayers));

    expect(result.current.status).toBe("lobby");
    expect(result.current.turnIndex).toBe(0);
    expect(result.current.roundsPerTeam).toBe(1);
    expect(result.current.teams).toEqual([]);
  });

  it("exposes turnIndex, roundsPerTeam, and other game state values when state is loaded", async () => {
    const { useMultiplayerGame } = await import("./useMultiplayerGame");
    const { result } = renderHook(() => useMultiplayerGame(session, lobbyPlayers));

    await waitFor(() => {
      expect(result.current.status).toBe("roundSummary");
    });

    expect(result.current.turnIndex).toBe(2);
    expect(result.current.roundsPerTeam).toBe(3);
    expect(result.current.teams).toEqual(mockPublicState.teams);
    expect(result.current.roundLog).toEqual(mockPublicState.roundLog);
    expect(result.current.isLastTurn).toBe(false);
  });
});
