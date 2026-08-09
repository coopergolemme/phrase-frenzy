const STORAGE_KEY = "phrase-frenzy:flagged-words";

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

export function getFlaggedWords(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

export function saveFlaggedWords(words: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}
