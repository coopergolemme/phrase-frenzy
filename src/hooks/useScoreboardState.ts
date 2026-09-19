import { useEffect, useState } from "react";
import type { Lobby, PublicGameState } from "../utils/multiplayerApi";
import {
  fetchLobbySnapshot,
  fetchPublicState,
  subscribeToLobby,
  subscribeToPublicState,
} from "../utils/multiplayerRealtime";
import type { Team } from "../game/turnLogic";

export interface QueueItem {
  teamName: string;
  describerName: string;
}

export interface ScoreboardState {
  status: "lobby" | "playing" | "roundSummary" | "gameOver";
  lobby: Lobby | null;
  state: PublicGameState | null;
  timeRemaining: number;
  activeTeam: Team | null;
  describerName: string | null;
  roundLabel: string;
  roundScore: number;
  teams: Team[];
  roundLog: PublicGameState["roundLog"];
  turnQueue: QueueItem[];
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentRoundNumber: number;
  totalRounds: number;
}

const TICK_MS = 250;

function computeRemaining(state: PublicGameState): number {
  const now = state.pausedAt ? new Date(state.pausedAt).getTime() : Date.now();
  const elapsedSec = Math.floor((now - new Date(state.turnStartedAt).getTime()) / 1000);
  return Math.max(0, state.durationSec - elapsedSec - state.penaltySec);
}

export function useScoreboardState(roomCode: string): ScoreboardState {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cleanRoomCode = roomCode.toUpperCase().trim();

  // Load initial lobby + public state & set up realtime listeners
  useEffect(() => {
    if (!cleanRoomCode) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function init() {
      try {
        const [lobbyData, publicData] = await Promise.all([
          fetchLobbySnapshot(cleanRoomCode),
          fetchPublicState(cleanRoomCode).catch(() => null),
        ]);
        if (!cancelled) {
          setLobby(lobbyData);
          if (publicData) setState(publicData);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load room data");
          setIsLoading(false);
        }
      }
    }

    void init();

    const unsubLobby = subscribeToLobby(cleanRoomCode, () => {
      fetchLobbySnapshot(cleanRoomCode)
        .then((snapshot) => {
          if (!cancelled) setLobby(snapshot);
        })
        .catch(() => {});
    });

    const unsubState = subscribeToPublicState(cleanRoomCode, (newState) => {
      if (!cancelled) setState(newState);
    });

    return () => {
      cancelled = true;
      unsubLobby();
      unsubState();
    };
  }, [cleanRoomCode]);

  // Countdown timer calculation
  useEffect(() => {
    if (!state || state.status !== "playing") return;

    const tick = () => {
      setTimeRemaining(computeRemaining(state));
    };

    tick();
    const intervalId = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [state]);

  const status = state?.status ?? lobby?.status ?? "lobby";
  const teams = state?.teams ?? [];

  const activeTeamIndex = state?.turnOrder[state.turnIndex] ?? -1;
  const activeTeam = teams[activeTeamIndex] ?? null;

  // Describer calculation: counts how many times this active team has taken a turn so far
  const teamTurnsTaken = state
    ? state.turnOrder.slice(0, state.turnIndex).filter((t) => t === activeTeamIndex).length
    : 0;

  const describerName =
    activeTeam && activeTeam.members.length > 0
      ? activeTeam.members[teamTurnsTaken % activeTeam.members.length]
      : null;

  const totalRounds = state?.roundsPerTeam ?? lobby?.roundsPerTeam ?? 1;
  const currentRoundNumber =
    state && teams.length > 0 ? Math.floor(state.turnIndex / teams.length) + 1 : 1;
  const roundLabel = state ? `Round ${currentRoundNumber} of ${totalRounds}` : "";

  // Derive turn queue (upcoming turns across teams)
  const turnQueue: QueueItem[] = [];
  if (state && state.turnOrder.length > 0) {
    const totalTurns = state.turnOrder.length;
    const maxUpcoming = 4; // Show next 4 turns
    for (let offset = 1; offset <= maxUpcoming; offset++) {
      const idx = state.turnIndex + offset;
      if (idx >= totalTurns) break;
      const tIndex = state.turnOrder[idx];
      const team = teams[tIndex];
      if (!team) continue;
      const teamPastTurns = state.turnOrder.slice(0, idx).filter((t) => t === tIndex).length;
      const describer =
        team.members.length > 0
          ? team.members[teamPastTurns % team.members.length]
          : "Player";
      turnQueue.push({ teamName: team.name, describerName: describer });
    }
  }

  const isPaused = Boolean(state?.pausedAt);

  return {
    status,
    lobby,
    state,
    timeRemaining,
    activeTeam,
    describerName,
    roundLabel,
    roundScore: state?.roundScore ?? 0,
    teams,
    roundLog: state?.roundLog ?? [],
    turnQueue,
    isPaused,
    isLoading,
    error,
    currentRoundNumber,
    totalRounds,
  };
}
