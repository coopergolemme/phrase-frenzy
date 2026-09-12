import type { FlaggedWord } from "../utils/adminApi";

interface AdminFlaggedWordsQueueProps {
  flaggedWords: FlaggedWord[];
  onDeactivate: (ids: string[]) => void;
}

export function AdminFlaggedWordsQueue({
  flaggedWords,
  onDeactivate,
}: AdminFlaggedWordsQueueProps) {
  if (flaggedWords.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No flagged words.</p>;
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline bg-surface backdrop-blur-[20px]">
      {flaggedWords.map((flagged) => (
        <div
          key={flagged.id}
          className="flex items-center gap-2 border-b border-border-solid px-4 py-2 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-text">{flagged.text}</span>
            <span className="ml-2 text-[0.8rem] text-text-secondary">
              {flagged.categoryLabel} · flagged {flagged.flaggedCount}x
            </span>
            {!flagged.active && (
              <span className="ml-2 text-[0.8rem] text-text-secondary">already inactive</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn--small btn--outline"
            disabled={!flagged.active}
            onClick={() => onDeactivate([flagged.id])}
          >
            Deactivate
          </button>
        </div>
      ))}
    </div>
  );
}
