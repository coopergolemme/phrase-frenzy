import { describe, expect, it } from "vitest";
import {
  applyCorrect,
  buildTurnOrder,
  buildWordBank,
  computeStandings,
  drawNextWord,
  type Team,
} from "./turnLogic";

describe("buildTurnOrder", () => {
  it("cycles through every team once per round", () => {
    expect(buildTurnOrder(3, 2)).toEqual([0, 1, 2, 0, 1, 2]);
  });
});

describe("buildWordBank", () => {
  it("dedupes exact-match words across categories and filters flagged words case-insensitively", () => {
    const bank = buildWordBank([["Taco", "Burrito"], ["Burrito", "Nacho"]], ["NACHO"]);
    expect(bank.sort()).toEqual(["Burrito", "Taco"]);
  });
});

describe("drawNextWord", () => {
  it("advances through the existing deck order without reshuffling", () => {
    const result = drawNextWord(["a", "b", "c"], 1, "a", ["a", "b", "c"]);
    expect(result).toEqual({ deckOrder: ["a", "b", "c"], deckIndex: 2, word: "b" });
  });

  it("reshuffles once the deck is exhausted and avoids repeating the current word", () => {
    const result = drawNextWord(["a", "b"], 2, "a", ["a", "b"]);
    expect(result.deckIndex).toBe(1);
    expect(result.deckOrder.sort()).toEqual(["a", "b"]);
    expect(result.word).not.toBe("a");
  });
});

describe("applyCorrect", () => {
  it("adds the delta only to the active team", () => {
    const teams: Team[] = [
      { id: "t1", name: "Red", totalScore: 2, members: [] },
      { id: "t2", name: "Blue", totalScore: 5, members: [] },
    ];
    expect(applyCorrect(teams, 1)).toEqual([
      { id: "t1", name: "Red", totalScore: 2, members: [] },
      { id: "t2", name: "Blue", totalScore: 6, members: [] },
    ]);
  });
});

describe("computeStandings", () => {
  it("sorts teams by score descending without mutating the input", () => {
    const teams: Team[] = [
      { id: "t1", name: "Red", totalScore: 2, members: [] },
      { id: "t2", name: "Blue", totalScore: 6, members: [] },
    ];
    const standings = computeStandings(teams);
    expect(standings.map((t) => t.name)).toEqual(["Blue", "Red"]);
    expect(teams.map((t) => t.name)).toEqual(["Red", "Blue"]);
  });
});
