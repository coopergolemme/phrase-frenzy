import type { DeactivatedWord } from "../utils/adminApi";

interface AdminDeactivatedWordsQueueProps {
  deactivatedWords: DeactivatedWord[];
  onReactivate: (ids: string[]) => void;
}

export function AdminDeactivatedWordsQueue({
  deactivatedWords,
  onReactivate,
}: AdminDeactivatedWordsQueueProps) {
  if (deactivatedWords.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No deactivated words.</p>;
  }

  return (
    <div className="max-h-[65vh] overflow-y-auto rounded-card border border-outline bg-surface backdrop-blur-[20px] [-webkit-overflow-scrolling:touch]">
      {deactivatedWords.map((word) => (
        <div
          key={word.id}
          className="flex items-center gap-2 border-b border-border-solid px-4 py-2 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-text">{word.text}</span>
            <span className="ml-2 text-[0.8rem] text-text-secondary">
              {word.categoryLabel}
              {word.flaggedCount > 0 ? ` · flagged ${word.flaggedCount}x` : ""}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--small btn--primary"
            onClick={() => onReactivate([word.id])}
          >
            Reactivate
          </button>
        </div>
      ))}
    </div>
  );
}
