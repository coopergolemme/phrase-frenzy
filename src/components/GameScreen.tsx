import { WordCard } from "./WordCard";

interface GameScreenProps {
  teamName: string;
  roundLabel: string;
  currentWord: string;
  timeRemaining: number;
  score: number;
  onCorrect: () => void;
  onPass: () => void;
  onDebugSkipRound?: () => void;
}

export function GameScreen({
  teamName,
  roundLabel,
  currentWord,
  timeRemaining,
  score,
  onCorrect,
  onPass,
  onDebugSkipRound,
}: GameScreenProps) {
  return (
    <div className="screen screen--game">
      <div className="game__header">
        <p className="game__team-name">{teamName}</p>
        <p className="game__round-label">{roundLabel}</p>
      </div>

      <div className="game__top-bar">
        <div className="chip chip--score">Score: {score}</div>
        <div className="chip chip--timer" aria-live="polite">
          {timeRemaining}
        </div>
        {onDebugSkipRound && (
          <button
            type="button"
            className="debug-skip-btn"
            onClick={onDebugSkipRound}
            aria-label="Debug: skip to end of round"
          >
            Skip ⏭
          </button>
        )}
      </div>

      <div className="game__rotate-hint">
        <span className="game__rotate-hint-icon" aria-hidden="true">
          📱
        </span>
        Turn your phone sideways
      </div>

      <div className="game__word-area">
        <WordCard word={currentWord} />
      </div>

      <div className="game__actions">
        <button className="btn btn--pass btn--large" onClick={onPass}>
          Pass
        </button>
        <button className="btn btn--primary btn--large" onClick={onCorrect}>
          Correct
        </button>
      </div>
    </div>
  );
}
