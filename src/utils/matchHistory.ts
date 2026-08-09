const STORAGE_KEY = "phrase-frenzy:match-history";
const MAX_ENTRIES = 25;

export interface MatchRecord {
  id: string;
  playedAt: string;
  roundsPerTeam: number;
  teams: { name: string; score: number }[];
  winnerNames: string[];
}

export function getMatchHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveMatchHistory(records: MatchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_ENTRIES)));
  } catch {
    // storage unavailable — ignore
  }
}
