import { useState } from "react";
import { WordCard } from "./WordCard";
import { ScoreboardSheet } from "./ScoreboardSheet";
import type { Team } from "../hooks/useGameState";

interface GameScreenProps {
  teamName: string;
  roundLabel: string;
  currentWord: string;
  timeRemaining: number;
  score: number;
  teams: Team[];
  onCorrect: () => void;
  onPass: () => void;
  onSkipRound: () => void;
  onRestart: () => void;
}

export function GameScreen({
  teamName,
  roundLabel,
  currentWord,
  timeRemaining,
  score,
  teams,
  onCorrect,
  onPass,
  onSkipRound,
  onRestart,
}: GameScreenProps) {
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  return (
    <div className="screen screen--game">
      <div className="game__header">
        <p className="game__team-name">{teamName}</p>
        <p className="game__timer" aria-live="polite">
          {timeRemaining}
        </p>
        <div className="game__meta">
          <span className="game__meta-item">{roundLabel}</span>
          <span className="game__meta-dot" aria-hidden="true">
            &bull;
          </span>
          <span className="game__meta-item">Score: {score}</span>
        </div>
        <div className="game__controls">
          <button
            type="button"
            className="game-control-btn"
            onClick={onSkipRound}
            aria-label="Skip to end of round"
          >
            Skip Round ⏭
          </button>
          <button
            type="button"
            className="game-control-btn"
            onClick={() => setIsScoreboardOpen(true)}
            aria-label="View scoreboard"
          >
            Scoreboard 🏆
          </button>
          <button
            type="button"
            className="game-control-btn"
            onClick={onRestart}
            aria-label="Restart game"
          >
            Restart 🔄
          </button>
        </div>
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

      {isScoreboardOpen && (
        <ScoreboardSheet teams={teams} onClose={() => setIsScoreboardOpen(false)} />
      )}
    </div>
  );
}
