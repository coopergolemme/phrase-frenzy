// Client for the multiplayer Supabase Edge Function. See
// supabase/functions/multiplayer/index.ts for the authorization model
// (per-device player_token, checked server-side — not real auth).
import type { RoundLogEntry, Team } from "../game/turnLogic";

export class MultiplayerApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Action =
  | "createRoom"
  | "joinRoom"
  | "startGame"
  | "getCurrentWord"
  | "correct"
  | "pass"
  | "togglePause"
  | "skipRound"
  | "timeUp"
  | "nextTurn"
  | "restartGame";

async function callMultiplayer<T>(action: Action, payload: Record<string, unknown>): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/functions/v1/multiplayer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new MultiplayerApiError(data.error ?? "Request failed", response.status);
  }
  return data as T;
}

export interface CreateRoomResult {
  roomCode: string;
  playerToken: string;
  playerId: string;
}

export function createRoom(params: {
  hostName: string;
  teamNames: string[];
  roundsPerTeam: number;
  roundDurationSec: number;
  categoryIds: string[];
}): Promise<CreateRoomResult> {
  return callMultiplayer<CreateRoomResult>("createRoom", params);
}

export interface JoinRoomResult {
  playerToken: string;
  playerId: string;
}

export function joinRoom(params: {
  roomCode: string;
  name: string;
  teamIndex: number;
}): Promise<JoinRoomResult> {
  return callMultiplayer<JoinRoomResult>("joinRoom", params);
}

export interface LobbyPlayer {
  id: string;
  name: string;
  teamIndex: number;
}

export interface Lobby {
  status: "lobby" | "playing" | "roundSummary" | "gameOver";
  roundsPerTeam: number;
  roundDurationSec: number;
  categoryIds: string[];
  teamNames: string[];
  players: LobbyPlayer[];
}

export function startGame(
  roomCode: string,
  playerToken: string,
  flaggedWords: string[]
): Promise<Record<string, never>> {
  return callMultiplayer("startGame", { roomCode, playerToken, flaggedWords });
}

export interface PublicGameState {
  status: "lobby" | "playing" | "roundSummary" | "gameOver";
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

export interface CurrentWordResult {
  word: string;
  wordBank: string[];
  deckSeed: number;
  deckIndex: number;
}

export function getCurrentWord(roomCode: string, playerToken: string): Promise<CurrentWordResult> {
  return callMultiplayer("getCurrentWord", { roomCode, playerToken });
}

export function markCorrect(roomCode: string, playerToken: string): Promise<{ word?: string }> {
  return callMultiplayer("correct", { roomCode, playerToken });
}

export function markPass(roomCode: string, playerToken: string): Promise<{ word?: string }> {
  return callMultiplayer("pass", { roomCode, playerToken });
}

export function togglePause(roomCode: string, playerToken: string): Promise<Record<string, never>> {
  return callMultiplayer("togglePause", { roomCode, playerToken });
}

export function skipRound(roomCode: string, playerToken: string): Promise<Record<string, never>> {
  return callMultiplayer("skipRound", { roomCode, playerToken });
}

export function timeUp(roomCode: string): Promise<Record<string, never>> {
  return callMultiplayer("timeUp", { roomCode });
}

export function nextTurn(roomCode: string, playerToken: string): Promise<Record<string, never>> {
  return callMultiplayer("nextTurn", { roomCode, playerToken });
}

export function restartGame(roomCode: string, playerToken: string): Promise<Record<string, never>> {
  return callMultiplayer("restartGame", { roomCode, playerToken });
}
