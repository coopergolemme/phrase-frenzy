import { describe, expect, it } from "vitest";
import {
  applyCorrect,
  buildTurnOrder,
  buildWordBank,
  computeStandings,
  drawNextWord,
  drawNextWordSeeded,
  shuffleWithSeed,
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

describe("shuffleWithSeed", () => {
  it("is deterministic for the same seed and input", () => {
    const bank = ["a", "b", "c", "d", "e", "f"];
    expect(shuffleWithSeed(bank, 42)).toEqual(shuffleWithSeed(bank, 42));
  });

  it("produces a different order for a different seed", () => {
    const bank = ["a", "b", "c", "d", "e", "f"];
    expect(shuffleWithSeed(bank, 1)).not.toEqual(shuffleWithSeed(bank, 2));
  });
});

describe("drawNextWordSeeded", () => {
  it("advances through the deck implied by (wordBank, seed) without needing the order itself", () => {
    const bank = ["a", "b", "c"];
    const order = shuffleWithSeed(bank, 7);
    const result = drawNextWordSeeded(bank, 7, 1, order[0]);
    expect(result).toEqual({ deckSeed: 7, deckIndex: 2, word: order[1] });
  });

  it("reshuffles with a fresh seed once the deck is exhausted and avoids repeating the current word", () => {
    const bank = ["a", "b"];
    const result = drawNextWordSeeded(bank, 7, 2, "a");
    expect(result.deckIndex).toBe(1);
    expect(result.word).not.toBe("a");
    expect(shuffleWithSeed(bank, result.deckSeed)[0]).toBe(result.word);
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
