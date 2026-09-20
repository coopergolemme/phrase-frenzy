import { useState } from "react";
import { WordCard } from "./WordCard";
import { ScoreboardSheet } from "./ScoreboardSheet";
import {
  IconAlertSiren,
  IconCheck,
  IconCross,
  IconPause,
  IconPlay,
  IconRefresh,
  IconRotatePhone,
  IconSettings,
  IconSkipForward,
  IconTrophy,
} from "./icons";
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
  lastFoul?: { spectatorName: string; penaltySec: number } | null;
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
  lastFoul,
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
    <div className={`screen screen--game${isUrgent ? " screen--game-urgent" : ""}${lastFoul ? " screen--foul-flash" : ""}`}>
      {lastFoul && (
        <div className="foul-alert-banner" role="alert" aria-live="assertive">
          <IconAlertSiren className="foul-alert-banner__icon" width="1.1em" height="1.1em" />
          <span>
            <strong>FOUL CALLED BY {lastFoul.spectatorName.toUpperCase()}!</strong> (-{lastFoul.penaltySec}s)
          </span>
        </div>
      )}

      <div className="game__rotate-hint">
        <IconRotatePhone className="game__rotate-hint-icon" width="1.1em" height="1.1em" />
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
            {isPaused ? <IconPlay width="1em" height="1em" /> : <IconPause width="1em" height="1em" />}
          </button>
          <button
            type="button"
            className="icon-menu-btn"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Game menu"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <IconSettings width="1em" height="1em" />
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
                  <IconSkipForward className="icon-menu__icon" width="1em" height="1em" />
                  Skip Round
                </button>
                <button
                  type="button"
                  className="icon-menu__item"
                  role="menuitem"
                  onClick={handleOpenScoreboard}
                >
                  <IconTrophy className="icon-menu__icon" width="1em" height="1em" />
                  Scoreboard
                </button>
                <button
                  type="button"
                  className="icon-menu__item"
                  role="menuitem"
                  onClick={handleRestart}
                >
                  <IconRefresh className="icon-menu__icon" width="1em" height="1em" />
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
          <IconCross className="btn__icon" width="1.1em" height="1.1em" />
          Pass
        </button>
        <button
          className="btn btn--primary btn--large"
          onClick={onCorrect}
          disabled={actionsDisabled}
        >
          <IconCheck className="btn__icon" width="1.1em" height="1.1em" />
          Correct
        </button>
      </div>

      {isScoreboardOpen && (
        <ScoreboardSheet teams={teams} onClose={() => setIsScoreboardOpen(false)} />
      )}
    </div>
  );
}
