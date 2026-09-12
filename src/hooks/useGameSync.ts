import { useCallback, useRef } from "react";
import type { RoundLogEntry, Team } from "./useGameState";
import { normalizeWord } from "../utils/flaggedWords";
import type { MatchRecord } from "../utils/matchHistory";
import { syncGameResults, type TeamMemberEntry, type WordStatDelta } from "../utils/gameSync";

// Accumulates this match's round log across turns so word-stat deltas sent
// to the db reflect only this session, not the all-time local totals —
// resyncing all-time totals would double-count on every subsequent match.
export function useGameSync() {
  const sessionLogRef = useRef<RoundLogEntry[]>([]);

  const trackTurn = useCallback((entries: RoundLogEntry[]) => {
    if (entries.length === 0) return;
    sessionLogRef.current = [...sessionLogRef.current, ...entries];
  }, []);

  const resetSession = useCallback(() => {
    sessionLogRef.current = [];
  }, []);

  const finishMatch = useCallback(
    (match: MatchRecord, teams: Team[]) => {
      const deltas = new Map<string, WordStatDelta>();
      for (const entry of sessionLogRef.current) {
        const word = normalizeWord(entry.word);
        const current = deltas.get(word) ?? { word, correct: 0, skipped: 0 };
        if (entry.outcome === "correct") current.correct += 1;
        else current.skipped += 1;
        deltas.set(word, current);
      }

      const winnerNames = new Set(match.winnerNames);
      const teamMembers: TeamMemberEntry[] = teams.flatMap((team) => {
        // Teams played solo (name only, no "+ Add member" entries) have no
        // members — fall back to the team name so player stats/roster still
        // pick up that person instead of silently dropping the match.
        const names = team.members.length > 0 ? team.members : [team.name];
        return names.map((name) => ({
          name,
          teamName: team.name,
          teamScore: team.totalScore,
          isWinner: winnerNames.has(team.name),
        }));
      });

      void syncGameResults(match, Array.from(deltas.values()), [], teamMembers);
      resetSession();
    },
    [resetSession]
  );

  return { trackTurn, resetSession, finishMatch };
}
