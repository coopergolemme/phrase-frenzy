import { useCallback, useState } from "react";
import type { RoundLogEntry } from "./useGameState";
import { normalizeWord } from "../utils/flaggedWords";
import { getWordStats, saveWordStats, type WordStats } from "../utils/wordStats";

export function useWordStats() {
  const [stats, setStats] = useState<WordStats>(() => getWordStats());

  const recordRoundLog = useCallback((entries: RoundLogEntry[]) => {
    if (entries.length === 0) return;
    setStats((prev) => {
      const next: WordStats = { ...prev };
      for (const entry of entries) {
        const key = normalizeWord(entry.word);
        const current = next[key] ?? { correct: 0, skipped: 0 };
        next[key] =
          entry.outcome === "correct"
            ? { ...current, correct: current.correct + 1 }
            : { ...current, skipped: current.skipped + 1 };
      }
      saveWordStats(next);
      return next;
    });
  }, []);

  return { stats, recordRoundLog };
}
