import { useCallback, useState } from "react";
import { useGameState } from "./hooks/useGameState";
import { useCountdown } from "./hooks/useCountdown";
import { useFlaggedWords } from "./hooks/useFlaggedWords";
import { useMatchHistory } from "./hooks/useMatchHistory";
import { useWordStats } from "./hooks/useWordStats";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { HomeScreen } from "./components/HomeScreen";
import { TeamSetupScreen } from "./components/TeamSetupScreen";
import { GameScreen } from "./components/GameScreen";
import { RoundSummaryScreen } from "./components/RoundSummaryScreen";
import { FinalStandingsScreen } from "./components/FinalStandingsScreen";

const DEFAULT_ROUND_DURATION_SEC = 60;
const PASS_PENALTY_SEC = 3;

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

  const { flaggedWords, isFlagged, flagWord, unflagWord } = useFlaggedWords();
  const { history: matchHistory, addMatch, clearHistory } = useMatchHistory();
  const { stats: wordStats, recordRoundLog } = useWordStats();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [roundDurationSec, setRoundDurationSec] = useState(DEFAULT_ROUND_DURATION_SEC);

  const handleStartTournament = useCallback(
    (
      teamNames: string[],
      roundsPerTeam: number,
      categoryIds: string[],
      roundDuration: number
    ) => {
      setRoundDurationSec(roundDuration);
      startTournament(teamNames, roundsPerTeam, categoryIds, flaggedWords);
    },
    [startTournament, flaggedWords]
  );

  const onExpire = useCallback(() => {
    timeUp();
  }, [timeUp]);

  const { timeRemaining, applyPenalty } = useCountdown(
    state.gameStatus === "playing",
    roundDurationSec,
    onExpire
  );

  const handlePass = useCallback(() => {
    applyPenalty(PASS_PENALTY_SEC);
    markPass();
  }, [applyPenalty, markPass]);

  const handleRestart = useCallback(() => {
    if (window.confirm("Restart the game? This will erase the current scores.")) {
      reset();
    }
  }, [reset]);

  const activeTeamIndex = state.turnOrder[state.turnIndex];
  const activeTeam = state.teams[activeTeamIndex];
  const currentRoundNumber =
    state.teams.length > 0 ? Math.floor(state.turnIndex / state.teams.length) + 1 : 1;

  const isLastTurn = state.turnIndex + 1 >= state.turnOrder.length;
  const nextTeamIndex = state.turnOrder[state.turnIndex + 1];
  const nextTeamName = isLastTurn ? null : state.teams[nextTeamIndex]?.name ?? null;

  const handleNextTurn = useCallback(() => {
    recordRoundLog(state.roundLog);
    if (isLastTurn) {
      addMatch(state.teams, state.roundsPerTeam);
    }
    nextTurn();
  }, [
    recordRoundLog,
    state.roundLog,
    isLastTurn,
    addMatch,
    state.teams,
    state.roundsPerTeam,
    nextTurn,
  ]);

  return (
    <div className="app-shell">
      <div className="screen-container" key={state.gameStatus}>
        {state.gameStatus === "home" && (
          <HomeScreen
            onStart={startTeamSetup}
            flaggedWords={flaggedWords}
            onUnflagWord={unflagWord}
            isWordFlagged={isFlagged}
            onToggleFlag={(word) => (isFlagged(word) ? unflagWord(word) : flagWord(word))}
            wordStats={wordStats}
            matchHistory={matchHistory}
            onClearMatchHistory={clearHistory}
            canInstall={canInstall}
            onInstall={promptInstall}
          />
        )}

        {state.gameStatus === "teamSetup" && (
          <TeamSetupScreen onStart={handleStartTournament} />
        )}

        {state.gameStatus === "playing" && activeTeam && (
          <GameScreen
            teamName={activeTeam.name}
            roundLabel={`Round ${currentRoundNumber} of ${state.roundsPerTeam}`}
            currentWord={state.currentWord}
            timeRemaining={timeRemaining}
            score={state.roundScore}
            teams={state.teams}
            onCorrect={markCorrect}
            onPass={handlePass}
            onSkipRound={timeUp}
            onRestart={handleRestart}
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
            onNext={handleNextTurn}
            onToggleWordOutcome={toggleWordOutcome}
            isWordFlagged={isFlagged}
            onToggleFlag={(word) => (isFlagged(word) ? unflagWord(word) : flagWord(word))}
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
