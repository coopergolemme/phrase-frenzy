import { formatNameList } from "../utils/formatNameList";

interface ReadyScreenProps {
  teamName: string;
  roundLabel: string;
  describerName: string | null;
  guesserNames: string[];
  onReady: () => void;
}

export function ReadyScreen({
  teamName,
  roundLabel,
  describerName,
  guesserNames,
  onReady,
}: ReadyScreenProps) {
  const guessersLabel = formatNameList(guesserNames);

  return (
    <div className="screen justify-center items-center gap-5 text-center landscape-compact:gap-3">
      <div className="hero-card w-full">
        <p className="m-0 text-[0.95rem] font-bold tracking-wide text-text-secondary">
          {roundLabel}
        </p>
        <p className="m-[6px_0_0] font-display font-normal text-[2.5rem] leading-tight text-primary [text-shadow:0_0_18px_rgba(52,209,122,0.5)] landscape-compact:text-[clamp(1.6rem,8vh,2.5rem)]">
          {teamName}
        </p>
        {describerName ? (
          <>
            <p className="m-[12px_0_0] text-text-secondary">
              Hand the phone to <span className="font-bold text-text">{describerName}</span>
            </p>
            <p className="m-[4px_0_0] text-[1.25rem] font-bold">
              {guessersLabel
                ? `${describerName} describes to ${guessersLabel}`
                : `${describerName} is describing`}
            </p>
          </>
        ) : (
          <p className="m-[12px_0_0] text-text-secondary">Get ready to describe!</p>
        )}
      </div>

      <button className="btn btn--primary btn--large w-full" onClick={onReady}>
        Ready
      </button>
    </div>
  );
}
