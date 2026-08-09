import { WordCard } from "./WordCard";

interface GameScreenProps {
  currentWord: string;
  timeRemaining: number;
  score: number;
  passUsed: boolean;
  onCorrect: () => void;
  onPass: () => void;
}

export function GameScreen({
  currentWord,
  timeRemaining,
  score,
  passUsed,
  onCorrect,
  onPass,
}: GameScreenProps) {
  return (
    <div className="screen screen--game">
      <div className="game__top-bar">
        <div className="chip chip--score">Score: {score}</div>
        <div className="chip chip--timer" aria-live="polite">
          {timeRemaining}
        </div>
      </div>

      <div className="game__word-area">
        <WordCard word={currentWord} />
      </div>

      <div className="game__actions">
        <button
          className="btn btn--pass btn--large"
          onClick={onPass}
          disabled={passUsed}
        >
          Pass
        </button>
        <button className="btn btn--primary btn--large" onClick={onCorrect}>
          Correct
        </button>
      </div>
    </div>
  );
}
