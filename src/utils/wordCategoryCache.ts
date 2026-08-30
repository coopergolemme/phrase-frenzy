import type { WordCategory } from "../data/wordCategory";

const STORAGE_KEY = "phrase-frenzy:word-categories";

export function getCachedWordCategories(): WordCategory[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as WordCategory[]) : null;
  } catch {
    return null;
  }
}

export function saveCachedWordCategories(categories: WordCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}
