import type { MatchRecord } from "../utils/matchHistory";

interface MatchHistorySheetProps {
  history: MatchRecord[];
  onClose: () => void;
}

export function MatchHistorySheet({ history, onClose }: MatchHistorySheetProps) {
  return (
    <div className="review-sheet">
      <div className="review-sheet__header">
        <p className="review-sheet__title">Match history</p>
        <button
          type="button"
          className="review-sheet__close"
          onClick={onClose}
          aria-label="Close match history"
        >
          &times;
        </button>
      </div>

      <div className="review-sheet__list">
        {history.length === 0 && (
          <p className="review-sheet__empty">No games played yet.</p>
        )}
        {history.map((match) => (
          <div className="match-card" key={match.id}>
            <p className="match-card__date">
              {new Date(match.playedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {match.teams.map((team) => (
              <div
                key={team.name}
                className={
                  "standings__row" +
                  (match.winnerNames.includes(team.name) ? " standings__row--leader" : "")
                }
              >
                <span className="standings__name">
                  {match.winnerNames.includes(team.name) ? "🏆 " : ""}
                  {team.name}
                </span>
                <span className="standings__score">{team.score}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
