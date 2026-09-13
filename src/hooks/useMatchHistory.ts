import { useCallback, useState } from "react";
import type { Team } from "./useGameState";
import {
  getMatchHistory,
  saveMatchHistory,
  type MatchRecord,
} from "../utils/matchHistory";

export function useMatchHistory() {
  const [history, setHistory] = useState<MatchRecord[]>(() => getMatchHistory());

  const addMatch = useCallback((teams: Team[], roundsPerTeam: number): MatchRecord => {
    const topScore = teams.reduce((max, team) => Math.max(max, team.totalScore), 0);
    const record: MatchRecord = {
      id: `match-${Date.now()}`,
      playedAt: new Date().toISOString(),
      roundsPerTeam,
      teams: teams.map((team) => ({ name: team.name, score: team.totalScore })),
      winnerNames: teams
        .filter((team) => team.totalScore === topScore)
        .map((team) => team.name),
    };
    setHistory((prev) => {
      const next = [record, ...prev];
      saveMatchHistory(next);
      return next;
    });
    return record;
  }, []);

  return { history, addMatch };
}
