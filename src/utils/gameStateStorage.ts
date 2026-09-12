import type { GameState, GameStatus } from "../hooks/useGameState";

const STORAGE_KEY = "phrase-frenzy:game-state";

const KNOWN_STATUSES: GameStatus[] = ["home", "teamSetup", "playing", "roundSummary", "gameOver"];

function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.gameStatus === "string" &&
    KNOWN_STATUSES.includes(state.gameStatus as GameStatus) &&
    Array.isArray(state.teams) &&
    Array.isArray(state.turnOrder) &&
    Array.isArray(state.roundLog) &&
    Array.isArray(state.wordBank) &&
    Array.isArray(state.deckOrder) &&
    Array.isArray(state.categoryIds)
  );
}

// Session-scoped (not localStorage, unlike matchHistory/flaggedWords) — this
// resumes the current tab's in-progress game on refresh, not a permanent
// record; a stale mid-game state resurfacing weeks later would be more
// surprising than a clean loss.
export function loadGameState(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}
