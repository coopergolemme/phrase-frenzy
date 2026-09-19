import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentWord as apiGetCurrentWord,
  markCorrect as apiMarkCorrect,
  markPass as apiMarkPass,
  timeUp as apiTimeUp,
  nextTurn as apiNextTurn,
  type PublicGameState,
  type LobbyPlayer,
} from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";
import { fetchPublicState, subscribeToPublicState } from "../utils/multiplayerRealtime";

const TICK_MS = 250;

function computeRemaining(state: PublicGameState): number {
  const elapsedSec = Math.floor((Date.now() - new Date(state.turnStartedAt).getTime()) / 1000);
  return Math.max(0, state.durationSec - elapsedSec - state.penaltySec);
}

// In-game multiplayer state for a single device: subscribes directly to
// Postgres Changes on room_public_state (scores, turn order, timer anchor
// — never the word itself), which delivers each update as the changed row
// itself with no follow-up fetch, runs a local countdown anchored to that
// timer the same way useCountdown.ts does, and fetches the current word
// directly only when this device becomes the active describer.
export function useMultiplayerGame(session: MultiplayerSession, lobbyPlayers: LobbyPlayer[]) {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [word, setWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeUpSentForTurnRef = useRef<string | null>(null);
  const wordFetchedForTurnRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicState(session.roomCode).then((result) => {
      if (!cancelled && result) setState(result);
    });
    const unsubscribe = subscribeToPublicState(session.roomCode, (result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session.roomCode]);

  useEffect(() => {
    if (!state || state.status !== "playing") return;
    timeUpSentForTurnRef.current = null;
    const tick = () => {
      const remaining = computeRemaining(state);
      setTimeRemaining(remaining);
      if (remaining <= 0 && timeUpSentForTurnRef.current !== state.turnStartedAt) {
        timeUpSentForTurnRef.current = state.turnStartedAt;
        apiTimeUp(session.roomCode).catch(() => {
          // Idempotent on the server — another device likely beat us to it.
        });
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [state, session.roomCode]);

  const myTeamIndex = lobbyPlayers.find((p) => p.id === session.playerId)?.teamIndex ?? -1;
  const myTeamPosition = lobbyPlayers
    .filter((p) => p.teamIndex === myTeamIndex)
    .findIndex((p) => p.id === session.playerId);

  const activeTeamIndex = state?.turnOrder[state.turnIndex] ?? -1;
  const activeTeam = state?.teams[activeTeamIndex] ?? null;
  const teamTurnsTaken = state
    ? state.turnOrder.slice(0, state.turnIndex).filter((t) => t === activeTeamIndex).length
    : 0;
  const describerName =
    activeTeam && activeTeam.members.length > 0
      ? activeTeam.members[teamTurnsTaken % activeTeam.members.length]
      : null;
  const isDescriber =
    activeTeamIndex === myTeamIndex &&
    activeTeam !== null &&
    activeTeam.members.length > 0 &&
    teamTurnsTaken % activeTeam.members.length === myTeamPosition;

  useEffect(() => {
    if (!state || state.status !== "playing" || !isDescriber) {
      setWord(null);
      return;
    }
    if (wordFetchedForTurnRef.current === state.turnStartedAt) return;
    wordFetchedForTurnRef.current = state.turnStartedAt;
    apiGetCurrentWord(session.roomCode, session.playerToken)
      .then((result) => setWord(result.word))
      .catch(() => setWord(null));
  }, [state, isDescriber, session.roomCode, session.playerToken]);

  const handleCorrect = useCallback(() => {
    if (!isDescriber) return;
    apiMarkCorrect(session.roomCode, session.playerToken)
      .then((result) => {
        if (result.word) setWord(result.word);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't mark correct"));
  }, [isDescriber, session.roomCode, session.playerToken]);

  const handlePass = useCallback(() => {
    if (!isDescriber) return;
    apiMarkPass(session.roomCode, session.playerToken)
      .then((result) => {
        if (result.word) setWord(result.word);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't mark pass"));
  }, [isDescriber, session.roomCode, session.playerToken]);

  const isHost = lobbyPlayers[0]?.id === session.playerId;

  const handleNextTurn = useCallback(() => {
    if (!isHost) return;
    apiNextTurn(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't advance to the next turn")
    );
  }, [isHost, session.roomCode, session.playerToken]);

  const isLastTurn = state ? state.turnIndex + 1 >= state.turnOrder.length : false;
  const nextTeamIndex = state ? state.turnOrder[state.turnIndex + 1] : undefined;
  const nextTeamName =
    !isLastTurn && state && nextTeamIndex !== undefined ? state.teams[nextTeamIndex]?.name ?? null : null;
  const currentRoundNumber =
    state && state.teams.length > 0 ? Math.floor(state.turnIndex / state.teams.length) + 1 : 1;

  return {
    status: state?.status ?? "lobby",
    teams: state?.teams ?? [],
    teamName: activeTeam?.name ?? "",
    describerName,
    isDescriber,
    isHost,
    roundLabel: state ? `Round ${currentRoundNumber} of ${state.roundsPerTeam}` : "",
    currentWord: isDescriber ? word : null,
    timeRemaining,
    roundScore: state?.roundScore ?? 0,
    roundLog: state?.roundLog ?? [],
    isLastTurn,
    nextTeamName,
    error,
    handleCorrect,
    handlePass,
    handleNextTurn,
  };
}
