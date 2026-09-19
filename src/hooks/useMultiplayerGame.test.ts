import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMultiplayerGame } from "./useMultiplayerGame";
import * as realtime from "../utils/multiplayerRealtime";
import * as matchHistoryModule from "./useMatchHistory";
import * as wordStatsModule from "./useWordStats";
import * as gameSyncModule from "./useGameSync";
import type { PublicGameState } from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";

const mockSession: MultiplayerSession = {
  roomCode: "TEST01",
  playerId: "p1",
  playerToken: "token-1",
  name: "Alice",
};

const mockLobbyPlayers = [
  { id: "p1", name: "Alice", teamIndex: 0 },
  { id: "p2", name: "Bob", teamIndex: 1 },
];

describe("useMultiplayerGame", () => {
  let subscriberCallback: ((state: PublicGameState) => void) | null = null;
  const mockAddMatch = vi.fn().mockReturnValue({ id: "match-1", winnerNames: ["Team 1"] });
  const mockRecordRoundLog = vi.fn();
  const mockTrackTurn = vi.fn();
  const mockResetSession = vi.fn();
  const mockFinishMatch = vi.fn();

  beforeEach(() => {
    subscriberCallback = null;
    vi.spyOn(realtime, "fetchPublicState").mockResolvedValue(null);
    vi.spyOn(realtime, "subscribeToPublicState").mockImplementation((_roomCode, callback) => {
      subscriberCallback = callback;
      return () => {};
    });

    vi.spyOn(matchHistoryModule, "useMatchHistory").mockReturnValue({
      history: [],
      addMatch: mockAddMatch,
    });

    vi.spyOn(wordStatsModule, "useWordStats").mockReturnValue({
      stats: {},
      recordRoundLog: mockRecordRoundLog,
    });

    vi.spyOn(gameSyncModule, "useGameSync").mockReturnValue({
      trackTurn: mockTrackTurn,
      resetSession: mockResetSession,
      finishMatch: mockFinishMatch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records round log and match result on round summary and game over state transitions", () => {
    renderHook(() => useMultiplayerGame(mockSession, mockLobbyPlayers));
    expect(subscriberCallback).not.toBeNull();

    const turn1State: PublicGameState = {
      status: "roundSummary",
      teams: [
        { id: "t0", name: "Team 1", totalScore: 3, members: ["Alice"] },
        { id: "t1", name: "Team 2", totalScore: 1, members: ["Bob"] },
      ],
      turnOrder: [0, 1],
      turnIndex: 0,
      roundsPerTeam: 1,
      roundScore: 3,
      roundLog: [
        { word: "Apple", outcome: "correct" },
        { word: "Banana", outcome: "correct" },
        { word: "Cherry", outcome: "correct" },
      ],
      turnStartedAt: "2026-09-19T19:00:00Z",
      durationSec: 60,
      penaltySec: 0,
      pausedAt: null,
    };

    act(() => {
      subscriberCallback!(turn1State);
    });

    expect(mockRecordRoundLog).toHaveBeenCalledWith(turn1State.roundLog);
    expect(mockTrackTurn).toHaveBeenCalledWith(turn1State.roundLog);

    const gameOverState: PublicGameState = {
      ...turn1State,
      status: "gameOver",
    };

    act(() => {
      subscriberCallback!(gameOverState);
    });

    expect(mockAddMatch).toHaveBeenCalledWith(gameOverState.teams, gameOverState.roundsPerTeam);
    expect(mockFinishMatch).toHaveBeenCalled();
  });
});
