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
