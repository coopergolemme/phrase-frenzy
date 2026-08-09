import type { Team } from "../hooks/useGameState";

interface FinalStandingsScreenProps {
  teams: Team[];
  onPlayAgain: () => void;
}

export function FinalStandingsScreen({ teams, onPlayAgain }: FinalStandingsScreenProps) {
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = standings[0]?.totalScore ?? 0;
  const winners = standings.filter((team) => team.totalScore === topScore);
  const isTie = winners.length > 1;

  return (
    <div className="screen screen--final-standings">
      <div className="final-standings__content">
        <h1 className="final-standings__title">Game Over!</h1>
        <p className="final-standings__winner-label">
          {isTie ? "It's a tie!" : "Winner"}
        </p>
        <p className="final-standings__winner-name">
          {winners.map((team) => team.name).join(" & ")}
        </p>

        <div className="standings">
          {standings.map((team, index) => (
            <div
              key={team.id}
              className={
                "standings__row" +
                (team.totalScore === topScore ? " standings__row--leader" : "")
              }
            >
              <span className="standings__name">
                {team.totalScore === topScore ? "🏆 " : `${index + 1}. `}
                {team.name}
              </span>
              <span className="standings__score">{team.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn--primary btn--large" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
