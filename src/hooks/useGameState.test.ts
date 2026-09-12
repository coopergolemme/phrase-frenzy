import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGameState } from "./useGameState";
import { loadGameState, saveGameState } from "../utils/gameStateStorage";
import type { GameState } from "./useGameState";

vi.mock("../utils/gameStateStorage", () => ({
  loadGameState: vi.fn(),
  saveGameState: vi.fn(),
}));

const loadGameStateMock = vi.mocked(loadGameState);
const saveGameStateMock = vi.mocked(saveGameState);

const STORED_STATE: GameState = {
  gameStatus: "playing",
  teams: [{ id: "t1", name: "Red", totalScore: 3, members: ["Cooper"] }],
  roundsPerTeam: 3,
  turnOrder: [0],
  turnIndex: 0,
  currentWord: "Taco",
  roundScore: 1,
  roundLog: [],
  categoryIds: ["food"],
  wordBank: ["Taco"],
  deckOrder: ["Taco"],
  deckIndex: 1,
};

describe("useGameState", () => {
  afterEach(() => {
    loadGameStateMock.mockReset();
    saveGameStateMock.mockReset();
  });

  it("starts at home when there is no stored snapshot", () => {
    loadGameStateMock.mockReturnValue(null);

    const { result } = renderHook(() => useGameState());

    expect(result.current.state.gameStatus).toBe("home");
  });

  it("hydrates from a valid stored snapshot on mount", () => {
    loadGameStateMock.mockReturnValue(STORED_STATE);

    const { result } = renderHook(() => useGameState());

    expect(result.current.state).toEqual(STORED_STATE);
  });

  it("persists the updated state after a dispatch", () => {
    loadGameStateMock.mockReturnValue(null);

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startTeamSetup();
    });

    expect(saveGameStateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ gameStatus: "teamSetup" })
    );
  });
});
