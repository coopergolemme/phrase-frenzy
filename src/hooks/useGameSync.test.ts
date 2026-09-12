import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Team } from "./useGameState";
import type { MatchRecord } from "../utils/matchHistory";

const syncGameResultsMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../utils/gameSync", () => ({
  syncGameResults: syncGameResultsMock,
}));

const TEAMS: Team[] = [
  { id: "t1", name: "Red", totalScore: 12, members: ["Cooper", "Alex"] },
  { id: "t2", name: "Blue", totalScore: 5, members: ["Sam"] },
];

const MATCH: MatchRecord = {
  id: "match-1",
  playedAt: "2026-01-01T00:00:00.000Z",
  roundsPerTeam: 3,
  teams: [
    { name: "Red", score: 12 },
    { name: "Blue", score: 5 },
  ],
  winnerNames: ["Red"],
};

describe("useGameSync", () => {
  beforeEach(() => {
    syncGameResultsMock.mockClear();
  });

  it("aggregates the session's round log into per-word deltas and flags winners by team", async () => {
    const { useGameSync } = await import("./useGameSync");
    const { result } = renderHook(() => useGameSync());

    act(() => {
      result.current.trackTurn([
        { word: "Pizza", outcome: "correct" },
        { word: "pizza", outcome: "correct" },
      ]);
      result.current.trackTurn([{ word: "Taco", outcome: "passed" }]);
    });

    act(() => {
      result.current.finishMatch(MATCH, TEAMS, ["bad-word"]);
    });

    expect(syncGameResultsMock).toHaveBeenCalledWith(
      MATCH,
      expect.arrayContaining([
        { word: "pizza", correct: 2, skipped: 0 },
        { word: "taco", correct: 0, skipped: 1 },
      ]),
      ["bad-word"],
      expect.arrayContaining([
        { name: "Cooper", teamName: "Red", teamScore: 12, isWinner: true },
        { name: "Alex", teamName: "Red", teamScore: 12, isWinner: true },
        { name: "Sam", teamName: "Blue", teamScore: 5, isWinner: false },
      ])
    );
  });

  it("clears the session log after finishing a match", async () => {
    const { useGameSync } = await import("./useGameSync");
    const { result } = renderHook(() => useGameSync());

    act(() => {
      result.current.trackTurn([{ word: "pizza", outcome: "correct" }]);
      result.current.finishMatch(MATCH, TEAMS, []);
      result.current.finishMatch(MATCH, TEAMS, []);
    });

    expect(syncGameResultsMock).toHaveBeenLastCalledWith(MATCH, [], [], expect.any(Array));
  });
});
