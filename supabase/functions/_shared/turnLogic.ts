// Pure, framework-free game logic shared between the local reducer
// (src/hooks/useGameState.ts, imported via src/game/turnLogic.ts) and the
// multiplayer edge function (supabase/functions/multiplayer/index.ts).
// Keeping exactly one copy of deck-drawing/turn-order/scoring math means
// local pass-and-play and distributed multiplayer can never score a round
// differently just because the logic drifted between two hand-ported
// copies. No DOM/React/Deno-specific APIs — must stay runnable in both a
// browser bundle and the Deno edge runtime.

export type WordOutcome = "correct" | "passed";

export interface RoundLogEntry {
  word: string;
  outcome: WordOutcome;
}

export interface Team {
  id: string;
  name: string;
  totalScore: number;
  members: string[];
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface DrawResult {
  deckOrder: string[];
  deckIndex: number;
  word: string;
}

export function drawNextWord(
  deckOrder: string[],
  deckIndex: number,
  currentWord: string,
  wordBank: string[]
): DrawResult {
  if (deckIndex >= deckOrder.length) {
    const reshuffled = shuffle(wordBank);
    if (reshuffled[0] === currentWord && reshuffled.length > 1) {
      const swapIndex = 1 + Math.floor(Math.random() * (reshuffled.length - 1));
      [reshuffled[0], reshuffled[swapIndex]] = [reshuffled[swapIndex], reshuffled[0]];
    }
    return { deckOrder: reshuffled, deckIndex: 1, word: reshuffled[0] };
  }
  return { deckOrder, deckIndex: deckIndex + 1, word: deckOrder[deckIndex] };
}

export function createDeckSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

// Deterministic PRNG (mulberry32) so the same (wordBank, seed) pair always
// produces the same shuffle order — lets the deck order be reconstructed
// from a single number instead of persisting/transmitting the full
// shuffled array.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface SeededDrawResult {
  deckSeed: number;
  deckIndex: number;
  word: string;
}

// Same stepping behavior as drawNextWord, but the deck order is derived
// from (wordBank, deckSeed) each call instead of an already-shuffled array
// — the caller only needs to persist/send deckSeed + deckIndex.
export function drawNextWordSeeded(
  wordBank: string[],
  deckSeed: number,
  deckIndex: number,
  currentWord: string
): SeededDrawResult {
  const order = shuffleWithSeed(wordBank, deckSeed);
  if (deckIndex < order.length) {
    return { deckSeed, deckIndex: deckIndex + 1, word: order[deckIndex] };
  }
  let nextSeed = createDeckSeed();
  let nextOrder = shuffleWithSeed(wordBank, nextSeed);
  for (let attempts = 0; nextOrder[0] === currentWord && wordBank.length > 1 && attempts < 10; attempts++) {
    nextSeed = createDeckSeed();
    nextOrder = shuffleWithSeed(wordBank, nextSeed);
  }
  return { deckSeed: nextSeed, deckIndex: 1, word: nextOrder[0] };
}

export function initialSeededDeck(wordBank: string[]): SeededDrawResult {
  const deckSeed = createDeckSeed();
  const order = shuffleWithSeed(wordBank, deckSeed);
  return { deckSeed, deckIndex: 1, word: order[0] };
}

export function buildTurnOrder(teamCount: number, roundsPerTeam: number): number[] {
  const order: number[] = [];
  for (let round = 0; round < roundsPerTeam; round++) {
    for (let team = 0; team < teamCount; team++) {
      order.push(team);
    }
  }
  return order;
}

export function buildWordBank(
  wordsByCategory: string[][],
  flaggedWords: string[] = []
): string[] {
  const flaggedSet = new Set(flaggedWords.map((w) => w.toLowerCase()));
  return Array.from(new Set(wordsByCategory.flat())).filter(
    (word) => !flaggedSet.has(word.toLowerCase())
  );
}

export function applyCorrect(teams: Team[], activeTeamIndex: number, delta = 1): Team[] {
  return teams.map((team, index) =>
    index === activeTeamIndex ? { ...team, totalScore: team.totalScore + delta } : team
  );
}

export function computeStandings(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => b.totalScore - a.totalScore);
}
