interface FlaggedWordsSheetProps {
  flaggedWords: string[];
  onUnflag: (word: string) => void;
  onClose: () => void;
}

export function FlaggedWordsSheet({ flaggedWords, onUnflag, onClose }: FlaggedWordsSheetProps) {
  return (
    <div className="review-sheet">
      <div className="review-sheet__header">
        <p className="review-sheet__title">Flagged words</p>
        <button
          type="button"
          className="review-sheet__close"
          onClick={onClose}
          aria-label="Close flagged words"
        >
          &times;
        </button>
      </div>

      <div className="review-sheet__list">
        {flaggedWords.length === 0 && (
          <p className="review-sheet__empty">No flagged words yet.</p>
        )}
        {flaggedWords.map((word) => (
          <div className="review-row" key={word}>
            <span className="review-row__word">{word}</span>
            <button
              type="button"
              className="btn btn--outline btn--small"
              onClick={() => onUnflag(word)}
            >
              Unflag
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
