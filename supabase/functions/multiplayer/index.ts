// Distributed multiplayer: every player is on their own device (no shared
// display), so this function is the sole authority for game state — it's
// the only thing that ever reads/writes rooms/room_players/room_state
// (RLS denies all anon access to those tables, see the migration). Turn
// identity is a per-device `player_token` (a UUID handed out on
// create/join and stored client-side), checked against room_players — not
// real auth, matching this project's existing posture (admin-words has
// none at all; this is a step up only because turn-taking needs SOME way
// to know who's allowed to press Correct/Pass).
//
// The current word never goes out over the shared realtime channel — only
// redacted public state does (scores, turn order, timer anchor). It's
// returned solely in the direct HTTP response to whichever device is the
// active describer (see getCurrentWord/correct/pass), so a phone that
// isn't currently describing never receives it.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyCorrect,
  buildTurnOrder,
  buildWordBank,
  drawNextWordSeeded,
  initialSeededDeck,
  type RoundLogEntry,
  type Team,
} from "../_shared/turnLogic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const PASS_PENALTY_SEC = 3;
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const ROOM_CODE_LENGTH = 6;
const MIN_TEAMS = 2;
const MAX_TEAMS = 6;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10;
const MIN_ROUND_DURATION_SEC = 15;
const MAX_ROUND_DURATION_SEC = 300;

interface RoomRow {
  code: string;
  status: "lobby" | "playing" | "roundSummary" | "gameOver";
  rounds_per_team: number;
  round_duration_sec: number;
  category_ids: string[];
  team_names: string[];
}

interface RoomPlayerRow {
  id: string;
  room_code: string;
  player_token: string;
  name: string;
  team_index: number;
  join_order: number;
}

interface RoomStateRow {
  room_code: string;
  turn_order: number[];
  turn_index: number;
  teams: Team[];
  round_score: number;
  round_log: RoundLogEntry[];
  word_bank: string[];
  deck_seed: number;
  deck_index: number;
  current_word: string;
  turn_started_at: string;
  penalty_sec: number;
  paused_at: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface PublicState {
  status: RoomRow["status"];
  teams: Team[];
  turnOrder: number[];
  turnIndex: number;
  roundsPerTeam: number;
  roundScore: number;
  roundLog: RoundLogEntry[];
  turnStartedAt: string;
  durationSec: number;
  penaltySec: number;
  pausedAt: string | null;
}

function toPublicState(room: RoomRow, state: RoomStateRow): PublicState {
  return {
    status: room.status,
    teams: state.teams,
    turnOrder: state.turn_order,
    turnIndex: state.turn_index,
    roundsPerTeam: room.rounds_per_team,
    roundScore: state.round_score,
    // The round's words are only meaningful for review once the round has
    // actually ended — never leak them to the whole room while a turn is
    // still live.
    roundLog: room.status === "playing" ? [] : state.round_log,
    turnStartedAt: state.turn_started_at,
    durationSec: room.round_duration_sec,
    penaltySec: state.penalty_sec,
    pausedAt: state.paused_at,
  };
}

// Postgres Changes (CDC) has to tail the WAL before a client sees anything
// — usually a few hundred ms, sometimes close to a second. Broadcast skips
// that entirely: this sends the payload straight over the Realtime
// WebSocket relay to whoever's subscribed to the topic, no polling layer
// in between, which is what actually keeps Correct/Pass feeling instant.
// `channel.send()` here runs over REST (server-side, never subscribed) —
// see https://supabase.com/docs/guides/realtime/broadcast.
async function broadcast(
  client: SupabaseClient,
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    const response = await client.channel(topic).send({ type: "broadcast", event, payload });
    if (response !== "ok") console.error(`broadcast ${topic}/${event} failed`, response);
  } catch (error) {
    console.error(`broadcast ${topic}/${event} failed`, error);
  }
}

// Persists the redacted projection (room_public_state) so a client loading
// the room fresh (or reconnecting) has something to read, then broadcasts
// the same payload directly to whoever's already subscribed — see
// broadcast() above for why that second step is the one that matters for
// latency.
async function publishPublicState(
  client: SupabaseClient,
  room: RoomRow,
  state: RoomStateRow
): Promise<void> {
  const publicState = toPublicState(room, state);
  const { error } = await client.from("room_public_state").upsert(
    {
      room_code: room.code,
      status: publicState.status,
      teams: publicState.teams,
      turn_order: publicState.turnOrder,
      turn_index: publicState.turnIndex,
      rounds_per_team: publicState.roundsPerTeam,
      round_score: publicState.roundScore,
      round_log: publicState.roundLog,
      turn_started_at: publicState.turnStartedAt,
      duration_sec: publicState.durationSec,
      penalty_sec: publicState.penaltySec,
      paused_at: publicState.pausedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_code" }
  );
  if (error) console.error("publishPublicState failed", error);

  await broadcast(client, `room-state:${room.code}`, "state", publicState);
}

async function fetchRoom(client: SupabaseClient, roomCode: string): Promise<RoomRow> {
  const { data, error } = await client.from("rooms").select("*").eq("code", roomCode).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Room not found", 404);
  return data as RoomRow;
}

async function fetchRoomState(client: SupabaseClient, roomCode: string): Promise<RoomStateRow> {
  const { data, error } = await client
    .from("room_state")
    .select("*")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Game hasn't started yet", 404);
  return data as RoomStateRow;
}

// rooms and room_state are independent reads keyed by the same room code —
// fetching them concurrently instead of one after the other shaves a full
// round trip off every action on the hot path (getCurrentWord, correct,
// pass, timeUp, nextTurn), which is what the acting player's device
// actually waits on before it can show anything.
async function fetchRoomAndState(
  client: SupabaseClient,
  roomCode: string
): Promise<[RoomRow, RoomStateRow]> {
  return Promise.all([fetchRoom(client, roomCode), fetchRoomState(client, roomCode)]);
}

async function fetchTeamPlayersInOrder(
  client: SupabaseClient,
  roomCode: string,
  teamIndex: number
): Promise<RoomPlayerRow[]> {
  const { data, error } = await client
    .from("room_players")
    .select("*")
    .eq("room_code", roomCode)
    .eq("team_index", teamIndex)
    .order("join_order");
  if (error) throw error;
  return (data ?? []) as RoomPlayerRow[];
}

function activeTeamTurnsTaken(turnOrder: number[], turnIndex: number, activeTeamIndex: number): number {
  return turnOrder.slice(0, turnIndex).filter((t) => t === activeTeamIndex).length;
}

// Resolves which specific player is the active describer for
// authorization — re-derived from room_players (source of truth for who's
// on which team, in what order) rather than trusting the team.members name
// list in room_state, which avoids any ambiguity from duplicate names.
async function getActiveDescriberPlayer(
  client: SupabaseClient,
  roomCode: string,
  state: RoomStateRow
): Promise<RoomPlayerRow> {
  const activeTeamIndex = state.turn_order[state.turn_index];
  const teamPlayers = await fetchTeamPlayersInOrder(client, roomCode, activeTeamIndex);
  if (teamPlayers.length === 0) {
    throw new ApiError("Active team has no players", 500);
  }
  const turnsTaken = activeTeamTurnsTaken(state.turn_order, state.turn_index, activeTeamIndex);
  return teamPlayers[turnsTaken % teamPlayers.length];
}

function requireDescriber(player: RoomPlayerRow, playerToken: string): void {
  if (player.player_token !== playerToken) {
    throw new ApiError("It's not your turn to describe", 403);
  }
}

async function generateRoomCode(client: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    const { data, error } = await client.from("rooms").select("code").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new ApiError("Could not allocate a room code, try again", 500);
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`${label} is required`, 400);
  }
  return value.trim();
}

async function createRoom(
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<{ roomCode: string; playerToken: string; playerId: string }> {
  const hostName = requireNonEmptyString(body.hostName, "hostName");
  const teamNames = (body.teamNames as unknown[] | undefined)?.map((n) => String(n).trim()) ?? [];
  const roundsPerTeam = Number(body.roundsPerTeam);
  const roundDurationSec = Number(body.roundDurationSec);
  const categoryIds = (body.categoryIds as unknown[] | undefined)?.map((c) => String(c)) ?? [];

  if (teamNames.length < MIN_TEAMS || teamNames.length > MAX_TEAMS || teamNames.some((n) => !n)) {
    throw new ApiError(`Provide between ${MIN_TEAMS} and ${MAX_TEAMS} named teams`, 400);
  }
  if (!Number.isInteger(roundsPerTeam) || roundsPerTeam < MIN_ROUNDS || roundsPerTeam > MAX_ROUNDS) {
    throw new ApiError("Invalid roundsPerTeam", 400);
  }
  if (
    !Number.isInteger(roundDurationSec) ||
    roundDurationSec < MIN_ROUND_DURATION_SEC ||
    roundDurationSec > MAX_ROUND_DURATION_SEC
  ) {
    throw new ApiError("Invalid roundDurationSec", 400);
  }
  if (categoryIds.length === 0) {
    throw new ApiError("Select at least one category", 400);
  }

  const roomCode = await generateRoomCode(client);
  const { error: roomError } = await client.from("rooms").insert({
    code: roomCode,
    status: "lobby",
    rounds_per_team: roundsPerTeam,
    round_duration_sec: roundDurationSec,
    category_ids: categoryIds,
    team_names: teamNames,
  });
  if (roomError) throw roomError;

  const { data: playerRow, error: playerError } = await client
    .from("room_players")
    .insert({ room_code: roomCode, name: hostName, team_index: 0, join_order: 0 })
    .select()
    .single();
  if (playerError) throw playerError;
  const host = playerRow as RoomPlayerRow;

  const { error: rosterError } = await client
    .from("room_roster")
    .insert({ id: host.id, room_code: roomCode, name: host.name, team_index: 0, join_order: 0 });
  if (rosterError) throw rosterError;

  return { roomCode, playerToken: host.player_token, playerId: host.id };
}

async function joinRoom(
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<{ playerToken: string; playerId: string }> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const name = requireNonEmptyString(body.name, "name");
  const teamIndex = Number(body.teamIndex);

  const room = await fetchRoom(client, roomCode);
  if (room.status !== "lobby") {
    throw new ApiError("This game has already started", 409);
  }
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= room.team_names.length) {
    throw new ApiError("Invalid teamIndex", 400);
  }

  const { count, error: countError } = await client
    .from("room_players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode);
  if (countError) throw countError;

  const joinOrder = count ?? 0;
  const { data: playerRow, error: playerError } = await client
    .from("room_players")
    .insert({ room_code: roomCode, name, team_index: teamIndex, join_order: joinOrder })
    .select()
    .single();
  if (playerError) throw playerError;
  const player = playerRow as RoomPlayerRow;

  const { error: rosterError } = await client
    .from("room_roster")
    .insert({ id: player.id, room_code: roomCode, name, team_index: teamIndex, join_order: joinOrder });
  if (rosterError) throw rosterError;

  EdgeRuntime.waitUntil(broadcast(client, `room-lobby:${roomCode}`, "changed", {}));

  return { playerToken: player.player_token, playerId: player.id };
}

async function fetchWordsForCategories(
  client: SupabaseClient,
  categoryIds: string[]
): Promise<string[][]> {
  const { data, error } = await client
    .from("words")
    .select("category_id, text")
    .eq("active", true)
    .in("category_id", categoryIds);
  if (error) throw error;

  const byCategory = new Map<string, string[]>();
  for (const row of (data ?? []) as { category_id: string; text: string }[]) {
    const list = byCategory.get(row.category_id) ?? [];
    list.push(row.text);
    byCategory.set(row.category_id, list);
  }
  return Array.from(byCategory.values());
}

async function startGame(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const room = await fetchRoom(client, roomCode);
  if (room.status !== "lobby") {
    throw new ApiError("This game has already started", 409);
  }

  const { data: playerRows, error: playersError } = await client
    .from("room_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("join_order");
  if (playersError) throw playersError;
  const players = (playerRows ?? []) as RoomPlayerRow[];

  const host = players.find((p) => p.join_order === 0);
  if (!host || host.player_token !== playerToken) {
    throw new ApiError("Only the host can start the game", 403);
  }

  const teams: Team[] = room.team_names.map((name, index) => ({
    id: `team-${index}`,
    name,
    totalScore: 0,
    members: players
      .filter((p) => p.team_index === index)
      .sort((a, b) => a.join_order - b.join_order)
      .map((p) => p.name),
  }));
  if (teams.filter((t) => t.members.length > 0).length < MIN_TEAMS) {
    throw new ApiError(`At least ${MIN_TEAMS} teams need a player before starting`, 400);
  }
  if (teams.some((t) => t.members.length === 0)) {
    throw new ApiError("Every team needs at least one player", 400);
  }

  const flaggedWords = Array.isArray(body.flaggedWords)
    ? body.flaggedWords.filter((w): w is string => typeof w === "string")
    : [];

  const wordsByCategory = await fetchWordsForCategories(client, room.category_ids);
  const wordBank = buildWordBank(wordsByCategory, flaggedWords);
  if (wordBank.length === 0) {
    throw new ApiError("No words available for the selected categories", 400);
  }

  const deck = initialSeededDeck(wordBank);
  const turnOrder = buildTurnOrder(teams.length, room.rounds_per_team);

  const newState: RoomStateRow = {
    room_code: roomCode,
    turn_order: turnOrder,
    turn_index: 0,
    teams,
    round_score: 0,
    round_log: [],
    word_bank: wordBank,
    deck_seed: deck.deckSeed,
    deck_index: deck.deckIndex,
    current_word: deck.word,
    turn_started_at: new Date().toISOString(),
    penalty_sec: 0,
    paused_at: null,
  };

  const { error: stateError } = await client.from("room_state").insert(newState);
  if (stateError) throw stateError;

  const { error: updateError } = await client
    .from("rooms")
    .update({ status: "playing" })
    .eq("code", roomCode);
  if (updateError) throw updateError;

  // Neither of these change the response the host is waiting on (an empty
  // {} ack) — let them finish after the response goes out instead of
  // making the host's "Start" tap wait on them.
  EdgeRuntime.waitUntil(broadcast(client, `room-lobby:${roomCode}`, "changed", {}));
  EdgeRuntime.waitUntil(publishPublicState(client, { ...room, status: "playing" }, newState));
}

// Returns everything the active describer's device needs to step through
// the rest of this turn's deck entirely locally (see drawNextWordSeeded):
// the word bank and the deck's current (seed, index) position. Safe to
// hand over in full because only the describer — who already discloses
// each word aloud as they go — ever receives this response; it never
// reaches the shared realtime channel other players are subscribed to.
async function getCurrentWord(
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<{ word: string; wordBank: string[]; deckSeed: number; deckIndex: number }> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const [room, state] = await fetchRoomAndState(client, roomCode);
  if (room.status !== "playing") throw new ApiError("The game isn't in progress", 409);

  const describer = await getActiveDescriberPlayer(client, roomCode, state);
  requireDescriber(describer, playerToken);

  return {
    word: state.current_word,
    wordBank: state.word_bank,
    deckSeed: state.deck_seed,
    deckIndex: state.deck_index,
  };
}

function remainingSeconds(state: RoomStateRow, room: RoomRow): number {
  // While paused, freeze the clock at the instant the pause began rather
  // than at "now" — resuming (togglePause) shifts turn_started_at forward
  // by the elapsed pause duration, so once resumed this reduces back to
  // the normal now-based calculation.
  const now = state.paused_at ? new Date(state.paused_at).getTime() : Date.now();
  const elapsedSec = Math.floor((now - new Date(state.turn_started_at).getTime()) / 1000);
  return room.round_duration_sec - elapsedSec - state.penalty_sec;
}

async function finalizeRound(
  client: SupabaseClient,
  room: RoomRow,
  state: RoomStateRow
): Promise<void> {
  const activeTeamIndex = state.turn_order[state.turn_index];
  const teams = applyCorrect(state.teams, activeTeamIndex, state.round_score);

  const { error: stateError } = await client
    .from("room_state")
    .update({ teams, paused_at: null, updated_at: new Date().toISOString() })
    .eq("room_code", room.code);
  if (stateError) throw stateError;

  const { error: roomError } = await client
    .from("rooms")
    .update({ status: "roundSummary" })
    .eq("code", room.code);
  if (roomError) throw roomError;

  EdgeRuntime.waitUntil(
    publishPublicState(client, { ...room, status: "roundSummary" }, { ...state, teams, paused_at: null })
  );
}

async function correctOrPass(
  client: SupabaseClient,
  body: Record<string, unknown>,
  outcome: "correct" | "passed"
): Promise<{ word?: string }> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const [room, state] = await fetchRoomAndState(client, roomCode);
  if (room.status !== "playing") throw new ApiError("The game isn't in progress", 409);
  if (state.paused_at) throw new ApiError("The game is paused", 409);

  const describer = await getActiveDescriberPlayer(client, roomCode, state);
  requireDescriber(describer, playerToken);

  const draw = drawNextWordSeeded(state.word_bank, state.deck_seed, state.deck_index, state.current_word);
  const roundLog: RoundLogEntry[] = [...state.round_log, { word: state.current_word, outcome }];
  const roundScore = outcome === "correct" ? state.round_score + 1 : state.round_score;
  const penaltySec = outcome === "passed" ? state.penalty_sec + PASS_PENALTY_SEC : state.penalty_sec;

  const nextState: RoomStateRow = {
    ...state,
    deck_seed: draw.deckSeed,
    deck_index: draw.deckIndex,
    current_word: draw.word,
    round_log: roundLog,
    round_score: roundScore,
    penalty_sec: penaltySec,
  };

  if (remainingSeconds(nextState, room) <= 0) {
    // A pass penalty (or a slow request) pushed the clock past zero —
    // finalize the round immediately, same as the local timer's
    // applyPenalty-triggers-onExpire behavior.
    await finalizeRound(client, room, nextState);
    return {};
  }

  const { error: stateError } = await client
    .from("room_state")
    .update({
      deck_seed: nextState.deck_seed,
      deck_index: nextState.deck_index,
      current_word: nextState.current_word,
      round_log: nextState.round_log,
      round_score: nextState.round_score,
      penalty_sec: nextState.penalty_sec,
      updated_at: new Date().toISOString(),
    })
    .eq("room_code", roomCode);
  if (stateError) throw stateError;

  // The describer's own device is waiting on `word` right now to show the
  // next word — the redacted projection other players read is not on that
  // critical path, so let it (and the broadcast) finish after we respond.
  EdgeRuntime.waitUntil(publishPublicState(client, room, nextState));

  return { word: nextState.current_word };
}

// Authorized the same way correct/pass are (the active describer's device
// is the only one showing pause/skip controls, mirroring the local
// pass-and-play UI where whoever's holding the phone controls the round)
// rather than introducing a separate host-only control surface.
async function togglePause(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const [room, state] = await fetchRoomAndState(client, roomCode);
  if (room.status !== "playing") throw new ApiError("The game isn't in progress", 409);

  const describer = await getActiveDescriberPlayer(client, roomCode, state);
  requireDescriber(describer, playerToken);

  const now = Date.now();
  let nextState: RoomStateRow;
  if (state.paused_at) {
    // Resuming: shift the turn's anchor forward by however long the pause
    // lasted, so remainingSeconds (now-based once unpaused) picks up
    // exactly where it left off.
    const pausedMs = now - new Date(state.paused_at).getTime();
    const shiftedStart = new Date(new Date(state.turn_started_at).getTime() + pausedMs).toISOString();
    nextState = { ...state, turn_started_at: shiftedStart, paused_at: null };
  } else {
    nextState = { ...state, paused_at: new Date(now).toISOString() };
  }

  const { error: stateError } = await client
    .from("room_state")
    .update({
      turn_started_at: nextState.turn_started_at,
      paused_at: nextState.paused_at,
      updated_at: new Date().toISOString(),
    })
    .eq("room_code", roomCode);
  if (stateError) throw stateError;

  EdgeRuntime.waitUntil(publishPublicState(client, room, nextState));
}

// Describer-triggerable early end to the current turn — reuses
// finalizeRound as-is, which scores whatever round_score has accumulated
// so far, same as timeUp does when the clock naturally runs out.
async function skipRound(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const [room, state] = await fetchRoomAndState(client, roomCode);
  if (room.status !== "playing") throw new ApiError("The game isn't in progress", 409);

  const describer = await getActiveDescriberPlayer(client, roomCode, state);
  requireDescriber(describer, playerToken);

  await finalizeRound(client, room, state);
}

async function timeUp(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const room = await fetchRoom(client, roomCode);
  if (room.status !== "playing") return; // idempotent: already finalized by another client

  const state = await fetchRoomState(client, roomCode);
  if (remainingSeconds(state, room) > 0) {
    throw new ApiError("Time hasn't run out yet", 409);
  }

  await finalizeRound(client, room, state);
}

async function nextTurn(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const [room, state] = await fetchRoomAndState(client, roomCode);
  if (room.status !== "roundSummary") throw new ApiError("No round to advance from", 409);

  const { data: hostRow, error: hostError } = await client
    .from("room_players")
    .select("player_token")
    .eq("room_code", roomCode)
    .eq("join_order", 0)
    .maybeSingle();
  if (hostError) throw hostError;
  if (!hostRow || (hostRow as { player_token: string }).player_token !== playerToken) {
    throw new ApiError("Only the host can advance to the next turn", 403);
  }

  const nextTurnIndex = state.turn_index + 1;
  if (nextTurnIndex >= state.turn_order.length) {
    const { error } = await client.from("rooms").update({ status: "gameOver" }).eq("code", roomCode);
    if (error) throw error;
    EdgeRuntime.waitUntil(publishPublicState(client, { ...room, status: "gameOver" }, state));
    return;
  }

  const draw = drawNextWordSeeded(state.word_bank, state.deck_seed, state.deck_index, state.current_word);
  const nextState: RoomStateRow = {
    ...state,
    turn_index: nextTurnIndex,
    deck_seed: draw.deckSeed,
    deck_index: draw.deckIndex,
    current_word: draw.word,
    round_score: 0,
    round_log: [],
    turn_started_at: new Date().toISOString(),
    penalty_sec: 0,
    paused_at: null,
  };

  const { error: stateError } = await client
    .from("room_state")
    .update({
      turn_index: nextState.turn_index,
      deck_seed: nextState.deck_seed,
      deck_index: nextState.deck_index,
      current_word: nextState.current_word,
      round_score: nextState.round_score,
      round_log: nextState.round_log,
      turn_started_at: nextState.turn_started_at,
      penalty_sec: nextState.penalty_sec,
      paused_at: nextState.paused_at,
      updated_at: new Date().toISOString(),
    })
    .eq("room_code", roomCode);
  if (stateError) throw stateError;

  const { error: roomError } = await client
    .from("rooms")
    .update({ status: "playing" })
    .eq("code", roomCode);
  if (roomError) throw roomError;

  EdgeRuntime.waitUntil(publishPublicState(client, { ...room, status: "playing" }, nextState));
}

// Resets an in-progress or finished room for a rematch with the same
// players/teams: fresh scores, turn order, and word deck, without touching
// room_players/room_roster. Host-only, mirroring startGame's authorization
// (join_order 0) since there's no other notion of ownership in this model.
async function restartGame(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const roomCode = requireNonEmptyString(body.roomCode, "roomCode").toUpperCase();
  const playerToken = requireNonEmptyString(body.playerToken, "playerToken");

  const room = await fetchRoom(client, roomCode);
  if (room.status === "lobby") {
    throw new ApiError("The game hasn't started yet", 409);
  }

  const { data: playerRows, error: playersError } = await client
    .from("room_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("join_order");
  if (playersError) throw playersError;
  const players = (playerRows ?? []) as RoomPlayerRow[];

  const host = players.find((p) => p.join_order === 0);
  if (!host || host.player_token !== playerToken) {
    throw new ApiError("Only the host can restart the game", 403);
  }

  const teams: Team[] = room.team_names.map((name, index) => ({
    id: `team-${index}`,
    name,
    totalScore: 0,
    members: players
      .filter((p) => p.team_index === index)
      .sort((a, b) => a.join_order - b.join_order)
      .map((p) => p.name),
  }));
  if (teams.some((t) => t.members.length === 0)) {
    throw new ApiError("Every team needs at least one player to restart", 400);
  }

  const wordsByCategory = await fetchWordsForCategories(client, room.category_ids);
  const wordBank = buildWordBank(wordsByCategory);
  if (wordBank.length === 0) {
    throw new ApiError("No words available for the selected categories", 400);
  }

  const deck = initialSeededDeck(wordBank);
  const turnOrder = buildTurnOrder(teams.length, room.rounds_per_team);

  const newState: RoomStateRow = {
    room_code: roomCode,
    turn_order: turnOrder,
    turn_index: 0,
    teams,
    round_score: 0,
    round_log: [],
    word_bank: wordBank,
    deck_seed: deck.deckSeed,
    deck_index: deck.deckIndex,
    current_word: deck.word,
    turn_started_at: new Date().toISOString(),
    penalty_sec: 0,
  };

  const { error: stateError } = await client
    .from("room_state")
    .update(newState)
    .eq("room_code", roomCode);
  if (stateError) throw stateError;

  const { error: roomError } = await client
    .from("rooms")
    .update({ status: "playing" })
    .eq("code", roomCode);
  if (roomError) throw roomError;

  EdgeRuntime.waitUntil(broadcast(client, `room-lobby:${roomCode}`, "changed", {}));
  EdgeRuntime.waitUntil(publishPublicState(client, { ...room, status: "playing" }, newState));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: { action?: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (body.action) {
      case "createRoom":
        return json(await createRoom(client, body));
      case "joinRoom":
        return json(await joinRoom(client, body));
      case "startGame":
        await startGame(client, body);
        return json({});
      case "getCurrentWord":
        return json(await getCurrentWord(client, body));
      case "correct":
        return json(await correctOrPass(client, body, "correct"));
      case "pass":
        return json(await correctOrPass(client, body, "passed"));
      case "foul":
        await foul(client, body);
        return json({});
      case "togglePause":
        await togglePause(client, body);
        return json({});
      case "skipRound":
        await skipRound(client, body);
        return json({});
      case "timeUp":
        await timeUp(client, body);
        return json({});
      case "nextTurn":
        await nextTurn(client, body);
        return json({});
      case "restartGame":
        await restartGame(client, body);
        return json({});
      default:
        return json({ error: `Unknown action "${body.action}"` }, 400);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, error.status);
    }
    console.error("multiplayer error", error);
    return json({ error: extractErrorMessage(error) }, 500);
  }
});
