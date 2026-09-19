import { useCallback, useEffect, useRef, useState } from "react";
import { useWordCategories } from "./hooks/useWordCategories";
import { useFlaggedWords } from "./hooks/useFlaggedWords";
import { useMatchHistory } from "./hooks/useMatchHistory";
import { useWordStats } from "./hooks/useWordStats";
import { useGameSync } from "./hooks/useGameSync";
import { useMultiplayerRoom } from "./hooks/useMultiplayerRoom";
import { useMultiplayerGame } from "./hooks/useMultiplayerGame";
import { MultiplayerHomeScreen } from "./components/MultiplayerHomeScreen";
import { MultiplayerLobbyScreen } from "./components/MultiplayerLobbyScreen";
import { GameScreen } from "./components/GameScreen";
import { SpectatorScreen } from "./components/SpectatorScreen";
import { RoundSummaryScreen } from "./components/RoundSummaryScreen";
import { FinalStandingsScreen } from "./components/FinalStandingsScreen";
import type { LobbyPlayer } from "./utils/multiplayerApi";
import type { MultiplayerSession } from "./utils/multiplayerSession";
import type { Team, RoundLogEntry } from "./game/turnLogic";
import type { MatchRecord } from "./utils/matchHistory";

interface MultiplayerAppProps {
  // Room code parsed out of a "#room/<code>" join link, if this device
  // arrived via a shared link rather than the "Play Online" home button.
  initialRoomCode?: string;
}

// Distributed multiplayer entry point: every player is on their own
// device, wired in parallel to App.tsx (local pass-and-play), which this
// component never touches. Reuses GameScreen/RoundSummaryScreen/
// FinalStandingsScreen as-is — see useMultiplayerGame for how their props
// are derived from server-pushed state instead of a local reducer.
function MultiplayerApp({ initialRoomCode }: MultiplayerAppProps) {
  const { categories } = useWordCategories();
  const { flaggedWords, isFlagged, flagWord, unflagWord } = useFlaggedWords();
  const { history: matchHistory, addMatch } = useMatchHistory();
  const { stats: wordStats, recordRoundLog } = useWordStats();
  const { trackTurn, resetSession, finishMatch } = useGameSync();
  const room = useMultiplayerRoom(initialRoomCode);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(initialRoomCode ?? null);

  const goHome = useCallback(() => {
    window.location.hash = "";
  }, []);

  const handleLeave = useCallback(() => {
    room.leave();
    setPendingRoomCode(null);
    goHome();
  }, [room, goHome]);

  const roomCode = room.session?.roomCode ?? pendingRoomCode;

  if (!roomCode) {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <MultiplayerHomeScreen
            categories={categories}
            isBusy={room.isBusy}
            error={room.error}
            onCreate={(params) => {
              resetSession();
              void room.create(params);
            }}
            onJoin={(code) => {
              resetSession();
              setPendingRoomCode(code);
              void room.loadPreview(code);
            }}
            onBack={goHome}
            flaggedWords={flaggedWords}
            onUnflagWord={unflagWord}
            isWordFlagged={isFlagged}
            onToggleFlag={(word) => (isFlagged(word) ? unflagWord(word) : flagWord(word))}
            wordStats={wordStats}
            matchHistory={matchHistory}
          />
        </div>
      </div>
    );
  }

  if (!room.lobby || room.lobby.status === "lobby" || !room.session) {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <MultiplayerLobbyScreen
            roomCode={roomCode}
            lobby={room.lobby}
            session={room.session}
            isHost={room.isHost}
            isBusy={room.isBusy}
            error={room.error}
            onJoin={(name, teamIndex) => {
              void room.join({ roomCode, name, teamIndex });
            }}
            onStart={() => {
              resetSession();
              void room.startGame();
            }}
            onLeave={handleLeave}
          />
        </div>
      </div>
    );
  }

  return (
    <InGame
      session={room.session}
      players={room.lobby.players}
      onLeave={handleLeave}
      isWordFlagged={isFlagged}
      onToggleFlag={(word) => (isFlagged(word) ? unflagWord(word) : flagWord(word))}
      addMatch={addMatch}
      recordRoundLog={recordRoundLog}
      trackTurn={trackTurn}
      finishMatch={finishMatch}
    />
  );
}

interface InGameProps {
  session: MultiplayerSession;
  players: LobbyPlayer[];
  onLeave: () => void;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
  addMatch: (teams: Team[], roundsPerTeam: number) => MatchRecord;
  recordRoundLog: (log: RoundLogEntry[]) => void;
  trackTurn: (log: RoundLogEntry[]) => void;
  finishMatch: (match: MatchRecord, teams: Team[]) => void;
}

function InGame({
  session,
  players,
  onLeave,
  isWordFlagged,
  onToggleFlag,
  addMatch,
  recordRoundLog,
  trackTurn,
  finishMatch,
}: InGameProps) {
  const game = useMultiplayerGame(session, players);
  const recordedTurnsRef = useRef<Set<number>>(new Set());
  const recordedGameOverRef = useRef<boolean>(false);

  useEffect(() => {
    if (game.status === "roundSummary" && !recordedTurnsRef.current.has(game.turnIndex)) {
      recordedTurnsRef.current.add(game.turnIndex);
      recordRoundLog(game.roundLog);
      trackTurn(game.roundLog);
    }
  }, [game.status, game.turnIndex, game.roundLog, recordRoundLog, trackTurn]);

  useEffect(() => {
    if (game.status === "gameOver" && !recordedGameOverRef.current) {
      recordedGameOverRef.current = true;
      const match = addMatch(game.teams, game.roundsPerTeam);
      finishMatch(match, game.teams);
    }
  }, [game.status, game.teams, game.roundsPerTeam, addMatch, finishMatch]);

  if (game.status === "gameOver") {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <FinalStandingsScreen teams={game.teams} onPlayAgain={onLeave} />
        </div>
      </div>
    );
  }

  if (game.status === "roundSummary") {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <RoundSummaryScreen
            teamName={game.teamName}
            roundScore={game.roundScore}
            roundLog={game.roundLog}
            teams={game.teams}
            isLastTurn={game.isLastTurn}
            nextTeamName={game.nextTeamName}
            onNext={game.handleNextTurn}
            // Manual post-round score correction isn't networked yet — see
            // the plan's known limitations. The review list itself (and
            // flagging) still works since flagging is a local device
            // preference, not shared game state.
            onToggleWordOutcome={() => {}}
            isWordFlagged={isWordFlagged}
            onToggleFlag={onToggleFlag}
          />
          {!game.isHost && (
            <p className="m-0 text-center text-[0.85rem] text-text-secondary">
              Waiting for the host to continue…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!game.isDescriber) {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <SpectatorScreen
            teamName={game.teamName}
            describerName={game.describerName}
            roundLabel={game.roundLabel}
            roundScore={game.roundScore}
            teamTotalScore={game.teamTotalScore}
            timeRemaining={game.timeRemaining}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container">
        <GameScreen
          teamName={game.teamName}
          describerName={game.describerName}
          roundLabel={game.roundLabel}
          currentWord={game.currentWord}
          timeRemaining={game.timeRemaining}
          score={game.roundScore}
          teams={game.teams}
          isPaused={game.isPaused}
          onCorrect={game.handleCorrect}
          onPass={game.handlePass}
          onSkipRound={game.handleSkipRound}
          onRestart={onLeave}
          onTogglePause={game.handleTogglePause}
        />
      </div>
    </div>
  );
}

export default MultiplayerApp;
