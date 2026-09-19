import { useState } from "react";
import { WordCard } from "./WordCard";
import { ScoreboardSheet } from "./ScoreboardSheet";
import type { Team } from "../hooks/useGameState";

interface GameScreenProps {
  teamName: string;
  describerName: string | null;
  roundLabel: string;
  // null means "hidden from this device" — used in distributed multiplayer
  // where only the active describer's device ever receives the word.
  currentWord: string | null;
  timeRemaining: number;
  score: number;
  teams: Team[];
  isPaused: boolean;
  onCorrect: () => void;
  onPass: () => void;
  onSkipRound: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
}

export function GameScreen({
  teamName,
  describerName,
  roundLabel,
  currentWord,
  timeRemaining,
  score,
  teams,
  isPaused,
  onCorrect,
  onPass,
  onSkipRound,
  onRestart,
  onTogglePause,
}: GameScreenProps) {
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isUrgent = !isPaused && timeRemaining <= 10 && timeRemaining > 0;

  const closeMenu = () => setIsMenuOpen(false);
  const actionsDisabled = isPaused || currentWord === null;

  const handleSkipRound = () => {
    closeMenu();
    onSkipRound();
  };

  const handleOpenScoreboard = () => {
    closeMenu();
    setIsScoreboardOpen(true);
  };

  const handleRestart = () => {
    closeMenu();
    onRestart();
  };

  return (
    <div className={`screen screen--game${isUrgent ? " screen--game-urgent" : ""}`}>
      <div className="game__rotate-hint">
        <span className="game__rotate-hint-icon" aria-hidden="true">
          📱
        </span>
        Turn your phone sideways
      </div>

      <div className="game__word-area">
        {currentWord !== null ? (
          <WordCard word={isPaused ? "Paused" : currentWord} />
        ) : (
          <WordCard word={describerName ? `Waiting for ${describerName}…` : "Waiting…"} />
        )}

        <div className="game__hud game__hud--left">
          <p className="game__team-name">{teamName}</p>
          {describerName && <p className="game__describer">{describerName} describing</p>}
          <p className="game__meta">
            <span className="game__meta-item">{roundLabel}</span>
            <span className="game__meta-item">Score: {score}</span>
          </p>
        </div>

        <div className="game__hud game__hud--right">
          <p
            className={`game__timer${isUrgent ? " game__timer--urgent" : ""}`}
            aria-live="polite"
          >
            {timeRemaining}
          </p>
          <button
            type="button"
            className="game-pause-btn"
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume timer" : "Pause timer"}
            aria-pressed={isPaused}
          >
            {isPaused ? "▶" : "⏸"}
          </button>
          <button
            type="button"
            className="icon-menu-btn"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Game menu"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            ⚙️
          </button>

          {isMenuOpen && (
            <>
              <button
                type="button"
                className="icon-menu__backdrop"
                onClick={closeMenu}
                aria-label="Close menu"
              />
              <div className="icon-menu" role="menu">
                <button
                  type="button"
                  className="icon-menu__item"
                  role="menuitem"
                  onClick={handleSkipRound}
                >
                  <span className="icon-menu__icon" aria-hidden="true">
                    ⏭
                  </span>
                  Skip Round
                </button>
                <button
                  type="button"
                  className="icon-menu__item"
                  role="menuitem"
                  onClick={handleOpenScoreboard}
                >
                  <span className="icon-menu__icon" aria-hidden="true">
                    🏆
                  </span>
                  Scoreboard
                </button>
                <button
                  type="button"
                  className="icon-menu__item"
                  role="menuitem"
                  onClick={handleRestart}
                >
                  <span className="icon-menu__icon" aria-hidden="true">
                    🔄
                  </span>
                  Restart
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="game__actions">
        <button
          className="btn btn--pass btn--large"
          onClick={onPass}
          disabled={actionsDisabled}
        >
          <span className="btn__icon" aria-hidden="true">
            ✕
          </span>
          Pass
        </button>
        <button
          className="btn btn--primary btn--large"
          onClick={onCorrect}
          disabled={actionsDisabled}
        >
          <span className="btn__icon" aria-hidden="true">
            ✓
          </span>
          Correct
        </button>
      </div>

      {isScoreboardOpen && (
        <ScoreboardSheet teams={teams} onClose={() => setIsScoreboardOpen(false)} />
      )}
    </div>
  );
}
