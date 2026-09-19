// Reads (initial load and every live update) go straight from Postgres to
// the client via RLS + Realtime Postgres Changes — no edge function hop on
// the read path. Only writes (create/join/start/correct/pass/timeUp/
// nextTurn) still go through the multiplayer edge function; see
// supabase/functions/multiplayer/index.ts, which is the only thing that
// ever writes to the tables read here.
import { getSupabaseClient } from "./supabaseClient";
import type { Lobby, LobbyPlayer, PublicGameState } from "./multiplayerApi";
import type { RoundLogEntry, Team } from "../game/turnLogic";

interface RoomRow {
  code: string;
  status: Lobby["status"];
  rounds_per_team: number;
  round_duration_sec: number;
  category_ids: string[];
  team_names: string[];
}

interface RoomRosterRow {
  id: string;
  name: string;
  team_index: number;
  join_order: number;
}

interface RoomPublicStateRow {
  status: PublicGameState["status"];
  teams: Team[];
  turn_order: number[];
  turn_index: number;
  rounds_per_team: number;
  round_score: number;
  round_log: RoundLogEntry[];
  turn_started_at: string;
  duration_sec: number;
  penalty_sec: number;
}

function mapPublicStateRow(row: RoomPublicStateRow): PublicGameState {
  return {
    status: row.status,
    teams: row.teams,
    turnOrder: row.turn_order,
    turnIndex: row.turn_index,
    roundsPerTeam: row.rounds_per_team,
    roundScore: row.round_score,
    roundLog: row.round_log,
    turnStartedAt: row.turn_started_at,
    durationSec: row.duration_sec,
    penaltySec: row.penalty_sec,
  };
}

export async function fetchLobbySnapshot(roomCode: string): Promise<Lobby> {
  const client = getSupabaseClient();
  const [roomResult, rosterResult] = await Promise.all([
    client.from("rooms").select("*").eq("code", roomCode).maybeSingle(),
    client
      .from("room_roster")
      .select("id, name, team_index, join_order")
      .eq("room_code", roomCode)
      .order("join_order"),
  ]);
  if (roomResult.error) throw roomResult.error;
  if (!roomResult.data) throw new Error("Room not found");
  if (rosterResult.error) throw rosterResult.error;

  const room = roomResult.data as RoomRow;
  const players: LobbyPlayer[] = ((rosterResult.data ?? []) as RoomRosterRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    teamIndex: row.team_index,
  }));

  return {
    status: room.status,
    roundsPerTeam: room.rounds_per_team,
    roundDurationSec: room.round_duration_sec,
    categoryIds: room.category_ids,
    teamNames: room.team_names,
    players,
  };
}

export async function fetchPublicState(roomCode: string): Promise<PublicGameState | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("room_public_state")
    .select("*")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPublicStateRow(data as RoomPublicStateRow) : null;
}

// Lobby membership/config changes a handful of times per game (joins,
// then one start) — a full re-fetch on any change keeps this simple
// without needing to hand-patch a roster array from raw insert/update
// payloads. Still avoids the edge function round trip since both reads
// are direct, fast PostgREST calls.
export function subscribeToLobby(roomCode: string, onChange: () => void): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`room-lobby:${roomCode}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_roster", filter: `room_code=eq.${roomCode}` },
      onChange
    )
    .subscribe();
  return () => client.removeChannel(channel);
}

// The hot path: gameplay state (score, turn, timer anchor) is delivered
// directly as the changed row, with no follow-up fetch — this is what
// keeps Correct/Pass feeling instant on the other players' screens.
export function subscribeToPublicState(
  roomCode: string,
  onChange: (state: PublicGameState) => void
): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`room-state:${roomCode}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_public_state", filter: `room_code=eq.${roomCode}` },
      (payload) => {
        const row = payload.new as RoomPublicStateRow | undefined;
        if (row && Object.keys(row).length > 0) onChange(mapPublicStateRow(row));
      }
    )
    .subscribe();
  return () => client.removeChannel(channel);
}
