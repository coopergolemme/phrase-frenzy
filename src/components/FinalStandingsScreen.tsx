import { IconTrophy } from "./icons";
import type { Team } from "../hooks/useGameState";

interface FinalStandingsScreenProps {
  teams: Team[];
  onPlayAgain: () => void;
  // Multiplayer only: when set, this device isn't the host, so "Play
  // Again" can't trigger a rematch (only the host can restart the shared
  // room) — show a waiting message instead of a button that would do
  // nothing. Omitted in local pass-and-play, where every device is "host".
  canPlayAgain?: boolean;
  onLeave?: () => void;
}

export function FinalStandingsScreen({
  teams,
  onPlayAgain,
  canPlayAgain = true,
  onLeave,
}: FinalStandingsScreenProps) {
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = standings[0]?.totalScore ?? 0;
  const winners = standings.filter((team) => team.totalScore === topScore);
  const isTie = winners.length > 1;

  return (
    <div className="screen justify-center items-center gap-6 text-center landscape-compact:gap-3 landscape-compact:overflow-y-auto">
      <div className="flex w-full flex-col items-center gap-2 landscape-compact:flex-row landscape-compact:items-stretch landscape-compact:gap-5 landscape-compact:text-left">
        <div className="hero-card landscape-compact:flex landscape-compact:flex-1 landscape-compact:flex-col landscape-compact:items-start landscape-compact:justify-center">
          <h1 className="m-0 font-display font-normal text-[2rem] leading-tight text-yellow [text-shadow:0_0_12px_rgba(255,210,63,0.7),0_0_32px_rgba(255,210,63,0.35)] landscape-compact:text-[clamp(1.4rem,7vh,2rem)]">
            Game Over!
          </h1>
          <p className="m-0 font-semibold tracking-wide text-text-secondary">
            {isTie ? "It's a tie!" : "Winner"}
          </p>
          <p className="m-0 mb-4 font-display font-normal text-[1.75rem] text-primary landscape-compact:text-[clamp(1.2rem,5.5vh,1.75rem)]">
            {winners.map((team) => team.name).join(" & ")}
          </p>
        </div>

        <div className="standings landscape-compact:flex-1 landscape-compact:justify-center">
          {standings.map((team, index) => (
            <div
              key={team.id}
              className={
                "standings__row" +
                (team.totalScore === topScore ? " standings__row--leader" : "")
              }
            >
              <span className="standings__name flex items-center gap-1.5">
                {team.totalScore === topScore ? (
                  <IconTrophy width="1em" height="1em" className="text-yellow" />
                ) : (
                  `${index + 1}. `
                )}
                {team.name}
              </span>
              <span className="standings__score">{team.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      {canPlayAgain ? (
        <button className="btn btn--primary btn--large w-full" onClick={onPlayAgain}>
          Play Again
        </button>
      ) : (
        <p className="m-0 text-center text-[0.85rem] text-text-secondary">
          Waiting for the host to start a new game…
        </p>
      )}

      {onLeave && (
        <button className="btn btn--outline btn--large w-full" onClick={onLeave}>
          Leave Room
        </button>
      )}
    </div>
  );
}
