import { useCallback, useState } from "react";
import { useWordCategories } from "./hooks/useWordCategories";
import { useFlaggedWords } from "./hooks/useFlaggedWords";
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
  const { isFlagged, flagWord, unflagWord } = useFlaggedWords();
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
              void room.create(params);
            }}
            onJoin={(code) => {
              setPendingRoomCode(code);
              void room.loadPreview(code);
            }}
            onBack={goHome}
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
    />
  );
}

interface InGameProps {
  session: MultiplayerSession;
  players: LobbyPlayer[];
  onLeave: () => void;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
}

function InGame({ session, players, onLeave, isWordFlagged, onToggleFlag }: InGameProps) {
  const game = useMultiplayerGame(session, players);

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
            onToggleWordOutcome={() => { }}
            isWordFlagged={isWordFlagged}
            onToggleFlag={onToggleFlag}
          />
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
            foulPenaltySec={game.foulPenaltySec}
            onFoul={game.handleFoul}
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
          lastFoul={game.lastFoul}
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
