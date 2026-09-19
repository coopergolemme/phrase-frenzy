interface SpectatorScreenProps {
  teamName: string;
  describerName: string | null;
  roundLabel: string;
  roundScore: number;
  teamTotalScore: number;
  timeRemaining: number;
}

// Shown on a non-active player's own device while a teammate or opponent
// is describing — there's nothing for them to tap, so this replaces
// GameScreen's word card + Correct/Pass with a passive, glanceable view of
// how the live turn is going.
export function SpectatorScreen({
  teamName,
  describerName,
  roundLabel,
  roundScore,
  teamTotalScore,
  timeRemaining,
}: SpectatorScreenProps) {
  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;

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
          <p className="m-[4px_0_0] font-display font-bold text-[4rem] text-primary">
            {roundScore}
          </p>
          <p className="m-0 text-text-secondary">words guessed</p>
        </div>

        <div className="hero-card">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide text-text-secondary">
            {teamName} total
          </p>
          <p className="m-[4px_0_0] font-display font-bold text-[3rem] text-primary">
            {teamTotalScore}
          </p>
        </div>
      </div>
    </div>
  );
}
