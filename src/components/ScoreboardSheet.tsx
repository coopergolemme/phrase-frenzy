import type { Team } from "../hooks/useGameState";

interface ScoreboardSheetProps {
  teams: Team[];
  onClose: () => void;
}

export function ScoreboardSheet({ teams, onClose }: ScoreboardSheetProps) {
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const leadingScore = standings[0]?.totalScore ?? 0;

  return (
    <div className="review-sheet">
      <div className="review-sheet__header">
        <p className="review-sheet__title">Scoreboard</p>
        <button
          type="button"
          className="review-sheet__close"
          onClick={onClose}
          aria-label="Close scoreboard"
        >
          &times;
        </button>
      </div>

      <div className="review-sheet__list">
        <div className="standings">
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

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
