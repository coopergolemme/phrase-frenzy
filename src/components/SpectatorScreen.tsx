import { useEffect, useState } from "react";
import { playBuzzerSound, triggerHaptic } from "../utils/audio";

interface SpectatorScreenProps {
  teamName: string;
  describerName: string | null;
  roundLabel: string;
  roundScore: number;
  teamTotalScore: number;
  timeRemaining: number;
  foulPenaltySec?: number;
  onFoul?: () => void;
}

// Shown on a non-active player's own device while a teammate or opponent
// is describing — provides glanceable turn status and a live FOUL! buzzer button.
export function SpectatorScreen({
  teamName,
  describerName,
  roundLabel,
  roundScore,
  teamTotalScore,
  timeRemaining,
  foulPenaltySec = 2,
  onFoul,
}: SpectatorScreenProps) {
  const [cooldownSec, setCooldownSec] = useState(0);
  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleFoulClick = () => {
    if (cooldownSec > 0 || !onFoul) return;
    triggerHaptic([120, 60, 120]);
    playBuzzerSound();
    onFoul();
    setCooldownSec(2);
  };

  const penaltyLabel = foulPenaltySec > 0 ? `-${foulPenaltySec}s` : "No penalty";

  return (
    <div className="screen justify-center items-center gap-5 text-center">
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col items-start gap-0.5 text-left">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide">{teamName}</p>
          {describerName && (
            <p className="m-0 text-[0.85rem] text-text-secondary">{describerName} describing</p>
          )}
          <p className="m-0 text-[0.75rem] text-text-secondary">{roundLabel}</p>
        </div>
        <p
          className={`game__timer m-0${isUrgent ? " game__timer--urgent" : ""}`}
          aria-live="polite"
        >
          {timeRemaining}
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="hero-card">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide text-text-secondary">
            This round
          </p>
          <p className="m-[4px_0_0] font-display font-normal text-[4rem] text-primary">
            {roundScore}
          </p>
          <p className="m-0 text-text-secondary">words guessed</p>
        </div>

        <div className="hero-card">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide text-text-secondary">
            {teamName} total
          </p>
          <p className="m-[4px_0_0] font-display font-normal text-[3rem] text-primary">
            {teamTotalScore}
          </p>
        </div>
      </div>

      {onFoul && (
        <div className="w-full pt-2">
          <button
            type="button"
            className="btn btn--foul w-full py-4 text-xl font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            onClick={handleFoulClick}
            disabled={cooldownSec > 0 || timeRemaining <= 0}
            aria-label={`Report a rule foul (${penaltyLabel})`}
          >
            <span>🚨</span>
            <span>{cooldownSec > 0 ? `Buzzed! (${cooldownSec}s)` : `FOUL! (${penaltyLabel})`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
