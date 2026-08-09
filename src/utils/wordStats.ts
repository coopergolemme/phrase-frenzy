const STORAGE_KEY = "phrase-frenzy:word-stats";

export interface WordStatEntry {
  correct: number;
  skipped: number;
}

export type WordStats = Record<string, WordStatEntry>;

export function getWordStats(): WordStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as WordStats) : {};
  } catch {
    return {};
  }
}

export function saveWordStats(stats: WordStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // storage unavailable — ignore
  }
}
