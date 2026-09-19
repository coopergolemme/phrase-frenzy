import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Lobby, PublicGameState } from "../utils/multiplayerApi";

const mockLobby: Lobby = {
  status: "playing",
  roundsPerTeam: 3,
  roundDurationSec: 60,
  categoryIds: ["cat1"],
  teamNames: ["Alpha", "Beta"],
  players: [
    { id: "p1", name: "Alice", teamIndex: 0 },
    { id: "p2", name: "Bob", teamIndex: 1 },
    { id: "p3", name: "Charlie", teamIndex: 0 },
  ],
};

const mockPublicState: PublicGameState = {
  status: "playing",
  teams: [
    { id: "team-0", name: "Alpha", totalScore: 5, members: ["Alice", "Charlie"] },
    { id: "team-1", name: "Beta", totalScore: 3, members: ["Bob"] },
  ],
  turnOrder: [0, 1, 0, 1, 0, 1],
  turnIndex: 0,
  roundsPerTeam: 3,
  roundScore: 2,
  roundLog: [{ word: "APPLE", outcome: "correct" }],
  turnStartedAt: new Date(Date.now() - 10000).toISOString(),
  durationSec: 60,
  penaltySec: 0,
  pausedAt: null,
};

const fetchLobbySnapshotMock = vi.fn().mockResolvedValue(mockLobby);
const fetchPublicStateMock = vi.fn().mockResolvedValue(mockPublicState);
const subscribeToLobbyMock = vi.fn().mockReturnValue(vi.fn());
const subscribeToPublicStateMock = vi.fn().mockReturnValue(vi.fn());

vi.mock("../utils/multiplayerRealtime", () => ({
  fetchLobbySnapshot: (code: string) => fetchLobbySnapshotMock(code),
  fetchPublicState: (code: string) => fetchPublicStateMock(code),
  subscribeToLobby: (code: string, cb: () => void) => subscribeToLobbyMock(code, cb),
  subscribeToPublicState: (code: string, cb: (state: PublicGameState) => void) =>
    subscribeToPublicStateMock(code, cb),
}));

describe("useScoreboardState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLobbySnapshotMock.mockResolvedValue(mockLobby);
    fetchPublicStateMock.mockResolvedValue(mockPublicState);
    subscribeToLobbyMock.mockReturnValue(vi.fn());
    subscribeToPublicStateMock.mockReturnValue(vi.fn());
  });

  it("fetches initial snapshot and computes turn describer and queue", async () => {
    const { useScoreboardState } = await import("./useScoreboardState");
    const { result } = renderHook(() => useScoreboardState("TEST"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("playing");
    expect(result.current.activeTeam?.name).toBe("Alpha");
    expect(result.current.describerName).toBe("Alice");
    expect(result.current.roundLabel).toBe("Round 1 of 3");
    expect(result.current.roundScore).toBe(2);

    // Verify upcoming turn queue
    expect(result.current.turnQueue).toEqual([
      { teamName: "Beta", describerName: "Bob" },
      { teamName: "Alpha", describerName: "Charlie" },
      { teamName: "Beta", describerName: "Bob" },
      { teamName: "Alpha", describerName: "Alice" },
    ]);
  });

  it("calculates time remaining correctly for live turn", async () => {
    const { useScoreboardState } = await import("./useScoreboardState");
    const { result } = renderHook(() => useScoreboardState("TEST"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ~50 seconds remaining (60s total - 10s elapsed)
    expect(result.current.timeRemaining).toBeGreaterThanOrEqual(48);
    expect(result.current.timeRemaining).toBeLessThanOrEqual(51);
  });
});
