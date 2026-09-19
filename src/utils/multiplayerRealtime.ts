// Initial reads go straight from Postgres to the client via RLS (no edge
// function hop). Live updates arrive over Realtime Broadcast, pushed
// directly by the multiplayer edge function right after each write — see
// supabase/functions/multiplayer/index.ts. Broadcast (a direct WebSocket
// push) is used instead of Postgres Changes (a WAL-tailing CDC poll) to
// avoid the few-hundred-ms-to-1s latency Postgres Changes adds, which is
// what actually keeps Correct/Pass feeling instant on other players'
// screens. The edge function is still the only thing that ever writes to
// the tables read here.
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
// then one start) — a full re-fetch on the "changed" ping keeps this
// simple without needing to hand-patch a roster array from a broadcast
// payload. Still avoids the edge function round trip on the read since the
// re-fetch is a direct, fast PostgREST call.
export function subscribeToLobby(roomCode: string, onChange: () => void): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`room-lobby:${roomCode}`)
    .on("broadcast", { event: "changed" }, onChange)
    .subscribe();
  return () => client.removeChannel(channel);
}

// The hot path: gameplay state (score, turn, timer anchor) is pushed
// directly in the broadcast payload, with no follow-up fetch — this is
// what keeps Correct/Pass feeling instant on the other players' screens.
export function subscribeToPublicState(
  roomCode: string,
  onChange: (state: PublicGameState) => void
): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`room-state:${roomCode}`)
    .on("broadcast", { event: "state" }, (message) => {
      const state = message.payload as PublicGameState | undefined;
      if (state) onChange(state);
    })
    .subscribe();
  return () => client.removeChannel(channel);
}
