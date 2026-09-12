import { useState } from "react";
import type { WordStats } from "../utils/wordStats";

const FREQUENTLY_SKIPPED_THRESHOLD = 2;

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
  const [showAll, setShowAll] = useState(false);

  const allRows = Object.entries(stats)
    .map(([word, entry]) => ({ word, ...entry }))
    .sort((a, b) => b.skipped - a.skipped || b.correct + b.skipped - (a.correct + a.skipped));

  const frequentlySkippedRows = allRows.filter(
    (row) => row.skipped >= FREQUENTLY_SKIPPED_THRESHOLD
  );
  const rows = showAll ? allRows : frequentlySkippedRows;

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
        {rows.length === 0 && allRows.length === 0 && (
          <p className="review-sheet__empty">Play a few rounds to see stats.</p>
        )}
        {rows.length === 0 && allRows.length > 0 && (
          <p className="review-sheet__empty">
            No frequently skipped words yet &mdash; show all to see everything.
          </p>
        )}
        {rows.map(({ word, correct, skipped }) => {
          const flagged = isWordFlagged(word);
          return (
            <div className="review-row" key={word}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="review-row__word">{word}</span>
                <span className="text-[0.85rem] text-text-secondary">
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

      {allRows.length > frequentlySkippedRows.length && (
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? "Show frequently skipped only" : `Show all words (${allRows.length})`}
        </button>
      )}

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
