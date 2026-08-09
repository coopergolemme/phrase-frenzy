import { useCallback } from "react";
import { useGameState } from "./hooks/useGameState";
import { useCountdown } from "./hooks/useCountdown";
import { HomeScreen } from "./components/HomeScreen";
import { GameScreen } from "./components/GameScreen";
import { EndScreen } from "./components/EndScreen";

const ROUND_DURATION_SEC = 60;

function App() {
  const { state, startGame, markCorrect, markPass, timeUp, reset } = useGameState();

  const onExpire = useCallback(() => {
    timeUp();
  }, [timeUp]);

  const timeRemaining = useCountdown(
    state.gameStatus === "playing",
    ROUND_DURATION_SEC,
    onExpire
  );

  return (
    <div className="app-shell">
      <div className="screen-container" key={state.gameStatus}>
        {state.gameStatus === "home" && <HomeScreen onStart={startGame} />}
        {state.gameStatus === "playing" && (
          <GameScreen
            currentWord={state.currentWord}
            timeRemaining={timeRemaining}
            score={state.score}
            passUsed={state.passUsed}
            onCorrect={markCorrect}
            onPass={markPass}
          />
        )}
        {state.gameStatus === "ended" && (
          <EndScreen score={state.score} onPlayAgain={reset} />
        )}
      </div>
    </div>
  );
}

export default App;
