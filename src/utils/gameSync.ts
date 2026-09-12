import { getSupabaseClient } from "./supabaseClient";
import type { MatchRecord } from "./matchHistory";

export interface WordStatDelta {
  word: string;
  correct: number;
  skipped: number;
}

export interface TeamMemberEntry {
  name: string;
  teamName: string;
  teamScore: number;
  isWinner: boolean;
}

// Best-effort telemetry push, called once a game finishes. Never throws —
// a failed sync (offline, RLS misconfig, etc.) must not block gameplay,
// since localStorage remains the source of truth for the UI.
export async function syncGameResults(
  match: MatchRecord,
  wordDeltas: WordStatDelta[],
  flaggedWords: string[],
  teamMembers: TeamMemberEntry[]
): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.rpc("sync_game_results", {
      p_match: match,
      p_word_deltas: wordDeltas,
      p_flagged_words: flaggedWords,
      p_team_members: teamMembers,
    });
    if (error) throw error;
  } catch {
    // offline or sync failed — local data is unaffected, safe to ignore
  }
}

// Persists a single flag immediately (rather than waiting for match end) so
// it shows up in the admin review queue as soon as a player flags it. Never
// throws, for the same reason as syncGameResults above.
export async function syncFlaggedWord(word: string): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.rpc("sync_game_results", {
      p_match: null,
      p_word_deltas: null,
      p_flagged_words: [word],
      p_team_members: null,
    });
    if (error) throw error;
  } catch {
    // offline or sync failed — local data is unaffected, safe to ignore
  }
}
