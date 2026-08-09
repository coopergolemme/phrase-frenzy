import type { Team } from "../hooks/useGameState";

interface RoundSummaryScreenProps {
  teamName: string;
  roundScore: number;
  teams: Team[];
  isLastTurn: boolean;
  nextTeamName: string | null;
  onNext: () => void;
}

export function RoundSummaryScreen({
  teamName,
  roundScore,
  teams,
  isLastTurn,
  nextTeamName,
  onNext,
}: RoundSummaryScreenProps) {
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const leadingScore = standings[0]?.totalScore ?? 0;

  return (
    <div className="screen screen--round-summary">
      <div className="round-summary__content">
        <div className="round-summary__score-block">
          <p className="round-summary__team-label">{teamName}'s round</p>
          <p className="round-summary__score">{roundScore}</p>
          <p className="round-summary__score-caption">words guessed</p>
        </div>

        <div className="standings">
          <p className="standings__title">Standings</p>
          {standings.map((team) => (
            <div
              key={team.id}
              className={
                "standings__row" +
                (team.totalScore === leadingScore ? " standings__row--leader" : "")
              }
            >
              <span className="standings__name">{team.name}</span>
              <span className="standings__score">{team.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn--primary btn--large" onClick={onNext}>
        {isLastTurn ? "See Final Results" : `Next Team's Turn — ${nextTeamName}`}
      </button>
    </div>
  );
}
