import { useCallback, useMemo, useState } from "react";
import { useGameState } from "./hooks/useGameState";
import { useGameStatusHash } from "./hooks/useGameStatusHash";
import { useCountdown } from "./hooks/useCountdown";
import { useFlaggedWords } from "./hooks/useFlaggedWords";
import { useWordCategories } from "./hooks/useWordCategories";
import { useMatchHistory } from "./hooks/useMatchHistory";
import { useWordStats } from "./hooks/useWordStats";
import { useGameSync } from "./hooks/useGameSync";
import { useKnownPlayerNames } from "./hooks/useKnownPlayerNames";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { HomeScreen } from "./components/HomeScreen";
import { TeamSetupScreen } from "./components/TeamSetupScreen";
import { GameScreen } from "./components/GameScreen";
import { ReadyScreen } from "./components/ReadyScreen";
import { RoundSummaryScreen } from "./components/RoundSummaryScreen";
import { FinalStandingsScreen } from "./components/FinalStandingsScreen";

const DEFAULT_ROUND_DURATION_SEC = 60;
const PASS_PENALTY_SEC = 3;
const TEST_GAME_DURATION_SEC = 99999;

function App() {
  const {
    state,
    startTeamSetup,
    startTournament,
    beginTurn,
    markCorrect,
    markPass,
    timeUp,
    nextTurn,
    toggleWordOutcome,
    reset,
  } = useGameState();

  useGameStatusHash(state.gameStatus);

  const {
    categories,
    isLoading: isLoadingCategories,
    refresh: refreshWordCategories,
    isRefreshing: isRefreshingWordCategories,
    refreshError: wordCategoriesRefreshError,
  } = useWordCategories();
  const { flaggedWords, isFlagged, flagWord, unflagWord } = useFlaggedWords();
  const { history: matchHistory, addMatch } = useMatchHistory();
  const { stats: wordStats, recordRoundLog } = useWordStats();
  const { trackTurn, resetSession, finishMatch } = useGameSync();
  const knownPlayerNames = useKnownPlayerNames();
  const knownTeamNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const match of matchHistory) {
      for (const team of match.teams) {
        const key = team.name.toLowerCase();
        if (team.name && !seen.has(key)) {
          seen.add(key);
          names.push(team.name);
        }
      }
    }
    return names;
  }, [matchHistory]);
  const { canInstall, promptInstall } = useInstallPrompt();
  const [roundDurationSec, setRoundDurationSec] = useState(DEFAULT_ROUND_DURATION_SEC);

  const handleStartTournament = useCallback(
    (
      teamNames: string[],
      teamMembers: string[][],
      roundsPerTeam: number,
      categoryIds: string[],
      roundDuration: number
    ) => {
      setRoundDurationSec(roundDuration);
      resetSession();
      startTournament(teamNames, teamMembers, roundsPerTeam, categoryIds, flaggedWords, categories);
    },
    [startTournament, flaggedWords, categories, resetSession]
  );

  const handleStartTestGame = useCallback(() => {
    setRoundDurationSec(TEST_GAME_DURATION_SEC);
    resetSession();
    startTournament(["Test Team"], [[]], 1, [], flaggedWords, categories);
  }, [startTournament, flaggedWords, categories, resetSession]);

  const onExpire = useCallback(() => {
    timeUp();
  }, [timeUp]);

  const { timeRemaining, applyPenalty, isPaused, togglePause } = useCountdown(
    state.gameStatus === "playing",
    roundDurationSec,
    onExpire
  );

  const handlePass = useCallback(() => {
    if (isPaused) return;
    applyPenalty(PASS_PENALTY_SEC);
    markPass();
  }, [applyPenalty, markPass, isPaused]);

  const handleCorrect = useCallback(() => {
    if (isPaused) return;
    markCorrect();
  }, [markCorrect, isPaused]);

  const handleRestart = useCallback(() => {
    if (window.confirm("Restart the game? This will erase the current scores.")) {
      reset();
    }
  }, [reset]);

  // Describers rotate through a team's members, one per turn that team takes.
  const getDescriberName = (teamIndex: number, turnIndex: number): string | null => {
    const team = state.teams[teamIndex];
    if (!team || team.members.length === 0) return null;
    const turnsTaken = state.turnOrder
      .slice(0, turnIndex)
      .filter((index) => index === teamIndex).length;
    return team.members[turnsTaken % team.members.length];
  };

  const activeTeamIndex = state.turnOrder[state.turnIndex];
  const activeTeam = state.teams[activeTeamIndex];
  const describerName = getDescriberName(activeTeamIndex, state.turnIndex);
  const guesserNames =
    activeTeam && describerName
      ? activeTeam.members.filter((member) => member !== describerName)
      : [];
  const currentRoundNumber =
    state.teams.length > 0 ? Math.floor(state.turnIndex / state.teams.length) + 1 : 1;

  const isLastTurn = state.turnIndex + 1 >= state.turnOrder.length;
  const nextTeamIndex = state.turnOrder[state.turnIndex + 1];
  // Turn order is round-robin, so mid-round every team up to the active one
  // has played this round. Null once the round is complete (or solo games).
  const isMidRound = state.teams.length > 1 && activeTeamIndex < state.teams.length - 1;
  const playedThisRoundTeamIds = isMidRound
    ? state.teams.slice(0, activeTeamIndex + 1).map((team) => team.id)
    : null;

  const nextTeam = isLastTurn ? undefined : state.teams[nextTeamIndex];
  const nextTeamName = nextTeam?.name ?? null;
  const nextDescriberName = nextTeam ? getDescriberName(nextTeamIndex, state.turnIndex + 1) : null;
  const nextGuesserNames =
    nextTeam && nextDescriberName
      ? nextTeam.members.filter((member) => member !== nextDescriberName)
      : [];

  const handleNextTurn = useCallback(() => {
    recordRoundLog(state.roundLog);
    trackTurn(state.roundLog);
    if (isLastTurn) {
      const match = addMatch(state.teams, state.roundsPerTeam);
      finishMatch(match, state.teams);
    }
    nextTurn();
  }, [
    recordRoundLog,
    trackTurn,
    state.roundLog,
    isLastTurn,
    addMatch,
    finishMatch,
    state.teams,
    state.roundsPerTeam,
    nextTurn,
  ]);

  if (categories.length === 0 && isLoadingCategories) {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <p className="flex h-full items-center justify-center text-[1.1rem] text-text-secondary">
            Loading word bank…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container" key={state.gameStatus}>
        {state.gameStatus === "home" && (
          <HomeScreen
            onStart={startTeamSetup}
            onStartTestGame={handleStartTestGame}
            flaggedWords={flaggedWords}
            onUnflagWord={unflagWord}
            isWordFlagged={isFlagged}
            onToggleFlag={(word) => (isFlagged(word) ? unflagWord(word) : flagWord(word))}
            wordStats={wordStats}
            matchHistory={matchHistory}
            canInstall={canInstall}
            onInstall={promptInstall}
            onRefreshWords={refreshWordCategories}
            isRefreshingWords={isRefreshingWordCategories}
            refreshWordsError={wordCategoriesRefreshError}
          />
        )}

        {state.gameStatus === "teamSetup" && (
          <TeamSetupScreen
            categories={categories}
            onStart={handleStartTournament}
            onBack={reset}
            knownPlayerNames={knownPlayerNames}
            knownTeamNames={knownTeamNames}
          />
        )}

        {state.gameStatus === "ready" && activeTeam && (
          <ReadyScreen
            teamName={activeTeam.name}
            roundLabel={`Round ${currentRoundNumber} of ${state.roundsPerTeam}`}
            describerName={describerName}
            guesserNames={guesserNames}
            onReady={beginTurn}
          />
        )}

        {state.gameStatus === "playing" && activeTeam && (
          <GameScreen
            teamName={activeTeam.name}
            describerName={describerName}
            roundLabel={`Round ${currentRoundNumber} of ${state.roundsPerTeam}`}
            currentWord={state.currentWord}
            timeRemaining={timeRemaining}
            score={state.roundScore}
            teams={state.teams}
            isPaused={isPaused}
            onCorrect={handleCorrect}
            onPass={handlePass}
            onSkipRound={timeUp}
            onRestart={handleRestart}
            onTogglePause={togglePause}
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
            nextDescriberName={nextDescriberName}
            nextGuesserNames={nextGuesserNames}
            playedThisRoundTeamIds={playedThisRoundTeamIds}
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
