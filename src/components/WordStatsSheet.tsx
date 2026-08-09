import type { WordStats } from "../utils/wordStats";

interface WordStatsSheetProps {
  stats: WordStats;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
  onClose: () => void;
}

export function WordStatsSheet({
  stats,
  isWordFlagged,
  onToggleFlag,
  onClose,
}: WordStatsSheetProps) {
  const rows = Object.entries(stats)
    .map(([word, entry]) => ({ word, ...entry }))
    .sort((a, b) => b.skipped - a.skipped || b.correct + b.skipped - (a.correct + a.skipped));

  return (
    <div className="review-sheet">
      <div className="review-sheet__header">
        <p className="review-sheet__title">Word stats</p>
        <button
          type="button"
          className="review-sheet__close"
          onClick={onClose}
          aria-label="Close word stats"
        >
          &times;
        </button>
      </div>

      <div className="review-sheet__list">
        {rows.length === 0 && (
          <p className="review-sheet__empty">Play a few rounds to see stats.</p>
        )}
        {rows.map(({ word, correct, skipped }) => {
          const flagged = isWordFlagged(word);
          return (
            <div className="review-row" key={word}>
              <div className="stat-row__info">
                <span className="review-row__word">{word}</span>
                <span className="stat-row__counts">
                  ✅ {correct} &nbsp; ⏭️ {skipped}
                </span>
              </div>
              <div className="review-row__actions">
                <button
                  type="button"
                  className={"flag-btn" + (flagged ? " flag-btn--active" : "")}
                  onClick={() => onToggleFlag(word)}
                  aria-pressed={flagged}
                  aria-label={flagged ? `Unflag "${word}"` : `Flag "${word}" as too hard`}
                >
                  🚩
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
