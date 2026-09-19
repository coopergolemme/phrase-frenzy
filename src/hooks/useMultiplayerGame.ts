import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentWord as apiGetCurrentWord,
  markCorrect as apiMarkCorrect,
  markPass as apiMarkPass,
  togglePause as apiTogglePause,
  skipRound as apiSkipRound,
  timeUp as apiTimeUp,
  nextTurn as apiNextTurn,
  restartGame as apiRestartGame,
  reportFoul as apiReportFoul,
  type PublicGameState,
  type LobbyPlayer,
} from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";
import { fetchPublicState, subscribeToPublicState } from "../utils/multiplayerRealtime";
import { drawNextWordSeeded, type RoundLogEntry, type WordOutcome } from "../game/turnLogic";
import { playBuzzerSound, triggerHaptic } from "../utils/audio";

import { useMatchHistory } from "./useMatchHistory";
import { useWordStats } from "./useWordStats";
import { useGameSync } from "./useGameSync";

// The describer's local mirror of the turn's deck — word bank + the deck's
// (seed, index) position (see drawNextWordSeeded) plus this turn's score
// so far. Since the seed makes the deck order fully reproducible without
// the server, taps can advance this locally and instantly; the matching
// correct/pass call is only needed to persist the outcome, not to learn
// what the next word is.
interface LocalDeck {
  wordBank: string[];
  deckSeed: number;
  deckIndex: number;
  currentWord: string;
  roundScore: number;
  roundLog: RoundLogEntry[];
}

const TICK_MS = 250;

function computeRemaining(state: PublicGameState): number {
  // While paused, freeze at the instant the pause began instead of "now" —
  // resuming shifts turnStartedAt forward server-side by the pause
  // duration, so this collapses back to the normal now-based calculation
  // once unpaused. See togglePause in supabase/functions/multiplayer/index.ts.
  const now = state.pausedAt ? new Date(state.pausedAt).getTime() : Date.now();
  const elapsedSec = Math.floor((now - new Date(state.turnStartedAt).getTime()) / 1000);
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
  const [localRoundScore, setLocalRoundScore] = useState(0);
  const [localRoundLog, setLocalRoundLog] = useState<RoundLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timeUpSentForTurnRef = useRef<string | null>(null);
  const wordFetchedForTurnRef = useRef<string | null>(null);
  const localDeckRef = useRef<LocalDeck | null>(null);
  const lastRecordedTurnRef = useRef<string | null>(null);
  const matchRecordedRef = useRef<boolean>(false);

  const { addMatch } = useMatchHistory();
  const { recordRoundLog } = useWordStats();
  const { trackTurn, resetSession, finishMatch } = useGameSync();
  // Chains correct/pass persistence calls one after another so concurrent
  // taps can never race a read-modify-write on the server's deck position
  // — the UI itself never waits on this chain, only timeUp does (below),
  // so the round doesn't finalize before every tap has been recorded.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [lastFoul, setLastFoul] = useState<{ spectatorName: string; penaltySec: number } | null>(null);
  const foulTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;

    if (
      state.status === "lobby" ||
      (state.status === "playing" && state.turnIndex === 0 && matchRecordedRef.current)
    ) {
      matchRecordedRef.current = false;
      lastRecordedTurnRef.current = null;
      resetSession();
    }

    if ((state.status === "roundSummary" || state.status === "gameOver") && state.roundLog) {
      if (lastRecordedTurnRef.current !== state.turnStartedAt) {
        lastRecordedTurnRef.current = state.turnStartedAt;
        recordRoundLog(state.roundLog);
        trackTurn(state.roundLog);
      }
    }

    if (state.status === "gameOver" && !matchRecordedRef.current) {
      matchRecordedRef.current = true;
      const match = addMatch(state.teams, state.roundsPerTeam);
      finishMatch(match, state.teams);
    }
  }, [state, recordRoundLog, trackTurn, addMatch, finishMatch, resetSession]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicState(session.roomCode).then((result) => {
      if (!cancelled && result) setState(result);
    });
    const unsubscribe = subscribeToPublicState(
      session.roomCode,
      (result) => {
        if (!cancelled) setState(result);
      },
      (foulPayload) => {
        if (cancelled) return;
        playBuzzerSound();
        triggerHaptic([150, 50, 150]);
        setLastFoul(foulPayload);

        if (foulTimeoutRef.current) {
          window.clearTimeout(foulTimeoutRef.current);
        }
        foulTimeoutRef.current = window.setTimeout(() => {
          setLastFoul(null);
        }, 2500);
      }
    );
    return () => {
      cancelled = true;
      if (foulTimeoutRef.current) {
        window.clearTimeout(foulTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [session.roomCode]);

  useEffect(() => {
    if (!state || state.status !== "playing") return;
    timeUpSentForTurnRef.current = null;
    const tick = () => {
      const remaining = computeRemaining(state);
      setTimeRemaining(remaining);
      if (state.pausedAt) return;
      if (remaining <= 0 && timeUpSentForTurnRef.current !== state.turnStartedAt) {
        timeUpSentForTurnRef.current = state.turnStartedAt;
        // Wait for every queued correct/pass to finish persisting first —
        // otherwise a tap made in the last instant could still be in
        // flight when the round finalizes and its point would be lost.
        persistQueueRef.current
          .catch(() => {})
          .then(() => apiTimeUp(session.roomCode))
          .catch(() => {
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
      localDeckRef.current = null;
      setWord(null);
      return;
    }
    if (wordFetchedForTurnRef.current === state.turnStartedAt) return;
    wordFetchedForTurnRef.current = state.turnStartedAt;
    apiGetCurrentWord(session.roomCode, session.playerToken)
      .then((result) => {
        localDeckRef.current = {
          wordBank: result.wordBank,
          deckSeed: result.deckSeed,
          deckIndex: result.deckIndex,
          currentWord: result.word,
          roundScore: 0,
          roundLog: [],
        };
        setWord(result.word);
        setLocalRoundScore(0);
        setLocalRoundLog([]);
      })
      .catch(() => setWord(null));
  }, [state, isDescriber, session.roomCode, session.playerToken]);

  // Advances the describer's own view immediately from the local deck
  // mirror, then queues the matching server call in the background — the
  // server independently derives the same next word from its own
  // (deckSeed, deckIndex), so nothing from this draw needs to be sent to
  // it, only the outcome for scoring.
  const advance = useCallback(
    (outcome: WordOutcome) => {
      const deck = localDeckRef.current;
      if (!deck) return;

      const draw = drawNextWordSeeded(deck.wordBank, deck.deckSeed, deck.deckIndex, deck.currentWord);
      const roundLog = [...deck.roundLog, { word: deck.currentWord, outcome }];
      const roundScore = outcome === "correct" ? deck.roundScore + 1 : deck.roundScore;
      localDeckRef.current = {
        ...deck,
        deckSeed: draw.deckSeed,
        deckIndex: draw.deckIndex,
        currentWord: draw.word,
        roundScore,
        roundLog,
      };
      setWord(draw.word);
      setLocalRoundScore(roundScore);
      setLocalRoundLog(roundLog);

      const persist = outcome === "correct" ? apiMarkCorrect : apiMarkPass;
      persistQueueRef.current = persistQueueRef.current.then(() =>
        persist(session.roomCode, session.playerToken)
          .then(() => {})
          .catch((err) =>
            setError(err instanceof Error ? err.message : `Couldn't persist "${outcome}"`)
          )
      );
    },
    [session.roomCode, session.playerToken]
  );

  const isPaused = state?.pausedAt != null;

  const handleCorrect = useCallback(() => {
    if (isDescriber && !isPaused) advance("correct");
  }, [isDescriber, isPaused, advance]);

  const handlePass = useCallback(() => {
    if (isDescriber && !isPaused) advance("passed");
  }, [isDescriber, isPaused, advance]);

  // Gated the same way handleCorrect/handlePass are — only the active
  // describer's device renders these controls (GameScreen), so this
  // mirrors the existing authorization rather than adding a separate
  // host-only surface.
  const handleTogglePause = useCallback(() => {
    if (!isDescriber) return;
    apiTogglePause(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't toggle pause")
    );
  }, [isDescriber, session.roomCode, session.playerToken]);

  const handleSkipRound = useCallback(() => {
    if (!isDescriber) return;
    apiSkipRound(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't skip the round")
    );
  }, [isDescriber, session.roomCode, session.playerToken]);

  const isHost = lobbyPlayers[0]?.id === session.playerId;

  const handleNextTurn = useCallback(() => {
    if (!isHost) return;
    apiNextTurn(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't advance to the next turn")
    );
  }, [isHost, session.roomCode, session.playerToken]);

  const handleRestart = useCallback(() => {
    if (!isHost) return;
    apiRestartGame(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't restart the game")
    );
  }, [isHost, session.roomCode, session.playerToken]);

  const handleFoul = useCallback(() => {
    if (isDescriber || isPaused) return;
    apiReportFoul(session.roomCode, session.playerToken).catch((err) =>
      setError(err instanceof Error ? err.message : "Couldn't call foul")
    );
  }, [isDescriber, isPaused, session.roomCode, session.playerToken]);

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
    teamTotalScore: activeTeam?.totalScore ?? 0,
    describerName,
    isDescriber,
    isHost,
    roundLabel: state ? `Round ${currentRoundNumber} of ${state.roundsPerTeam}` : "",
    currentWord: isDescriber ? word : null,
    timeRemaining,
    isPaused,
    lastFoul,
    foulPenaltySec: state?.foulPenaltySec ?? 2,
    // While the round is live, the describer's own device shows its local
    // optimistic tally instead of waiting on the server round trip +
    // realtime broadcast; every other device (and everyone once the round
    // ends) reads the server-synced value, which the queue above
    // guarantees matches by the time the round finalizes.
    roundScore: state?.status === "playing" && isDescriber ? localRoundScore : state?.roundScore ?? 0,
    roundLog:
      state?.status === "playing" && isDescriber ? localRoundLog : state?.roundLog ?? [],
    turnIndex: state?.turnIndex ?? 0,
    roundsPerTeam: state?.roundsPerTeam ?? 1,
    isLastTurn,
    nextTeamName,
    error,
    handleCorrect,
    handlePass,
    handleTogglePause,
    handleSkipRound,
    handleNextTurn,
    handleRestart,
    handleFoul,
  };
}
