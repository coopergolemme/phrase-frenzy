import { useCallback } from "react";
import { useGameState } from "./hooks/useGameState";
import { useCountdown } from "./hooks/useCountdown";
import { HomeScreen } from "./components/HomeScreen";
import { TeamSetupScreen } from "./components/TeamSetupScreen";
import { GameScreen } from "./components/GameScreen";
import { RoundSummaryScreen } from "./components/RoundSummaryScreen";
import { FinalStandingsScreen } from "./components/FinalStandingsScreen";

const ROUND_DURATION_SEC = 60;

function App() {
  const {
    state,
    startTeamSetup,
    startTournament,
    markCorrect,
    markPass,
    timeUp,
    nextTurn,
    toggleWordOutcome,
    reset,
  } = useGameState();

  const onExpire = useCallback(() => {
    timeUp();
  }, [timeUp]);

  const timeRemaining = useCountdown(
    state.gameStatus === "playing",
    ROUND_DURATION_SEC,
    onExpire
  );

  const activeTeamIndex = state.turnOrder[state.turnIndex];
  const activeTeam = state.teams[activeTeamIndex];
  const currentRoundNumber =
    state.teams.length > 0 ? Math.floor(state.turnIndex / state.teams.length) + 1 : 1;

  const isLastTurn = state.turnIndex + 1 >= state.turnOrder.length;
  const nextTeamIndex = state.turnOrder[state.turnIndex + 1];
  const nextTeamName = isLastTurn ? null : state.teams[nextTeamIndex]?.name ?? null;

  return (
    <div className="app-shell">
      <div className="screen-container" key={state.gameStatus}>
        {state.gameStatus === "home" && <HomeScreen onStart={startTeamSetup} />}

        {state.gameStatus === "teamSetup" && (
          <TeamSetupScreen onStart={startTournament} />
        )}

        {state.gameStatus === "playing" && activeTeam && (
          <GameScreen
            teamName={activeTeam.name}
            roundLabel={`Round ${currentRoundNumber} of ${state.roundsPerTeam}`}
            currentWord={state.currentWord}
            timeRemaining={timeRemaining}
            score={state.roundScore}
            onCorrect={markCorrect}
            onPass={markPass}
            onDebugSkipRound={import.meta.env.DEV ? timeUp : undefined}
          />
        )}

        {state.gameStatus === "roundSummary" && activeTeam && (
          <RoundSummaryScreen
            teamName={activeTeam.name}
            roundScore={state.roundScore}
            roundLog={state.roundLog}
            teams={state.teams}
            isLastTurn={isLastTurn}
            nextTeamName={nextTeamName}
            onNext={nextTurn}
            onToggleWordOutcome={toggleWordOutcome}
          />
        )}

        {state.gameStatus === "gameOver" && (
          <FinalStandingsScreen teams={state.teams} onPlayAgain={reset} />
        )}
      </div>
    </div>
  );
}

export default App;
