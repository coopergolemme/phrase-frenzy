import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGameState, saveGameState } from "./gameStateStorage";
import type { GameState } from "../hooks/useGameState";

const STATE: GameState = {
  gameStatus: "playing",
  teams: [{ id: "t1", name: "Red", totalScore: 3, members: ["Cooper"] }],
  roundsPerTeam: 3,
  turnOrder: [0],
  turnIndex: 0,
  currentWord: "Taco",
  roundScore: 1,
  roundLog: [{ word: "Pizza", outcome: "correct" }],
  categoryIds: ["food"],
  wordBank: ["Taco", "Pizza"],
  deckOrder: ["Taco", "Pizza"],
  deckIndex: 1,
};

describe("gameStateStorage", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips a valid game state through sessionStorage", () => {
    saveGameState(STATE);

    expect(loadGameState()).toEqual(STATE);
  });

  it("returns null when nothing is stored", () => {
    expect(loadGameState()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    sessionStorage.setItem("phrase-frenzy:game-state", "{not json");

    expect(loadGameState()).toBeNull();
  });

  it("returns null when the shape doesn't look like a GameState", () => {
    sessionStorage.setItem("phrase-frenzy:game-state", JSON.stringify({ gameStatus: "playing" }));

    expect(loadGameState()).toBeNull();
  });

  it("returns null for an unknown gameStatus value", () => {
    sessionStorage.setItem(
      "phrase-frenzy:game-state",
      JSON.stringify({ ...STATE, gameStatus: "not-a-real-status" })
    );

    expect(loadGameState()).toBeNull();
  });

  it("saveGameState does not throw when sessionStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => saveGameState(STATE)).not.toThrow();
  });

  it("loadGameState does not throw when sessionStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("unavailable");
    });

    expect(loadGameState()).toBeNull();
  });
});
