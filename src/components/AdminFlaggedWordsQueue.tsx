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
        <AdminFlaggedWordRow key={flagged.word} flagged={flagged} onDeactivate={onDeactivate} />
      ))}
    </div>
  );
}

interface AdminFlaggedWordRowProps {
  flagged: FlaggedWord;
  onDeactivate: (ids: string[]) => void;
}

function AdminFlaggedWordRow({ flagged, onDeactivate }: AdminFlaggedWordRowProps) {
  const activeMatches = flagged.matches.filter((match) => match.active);
  const categoryLabels = [...new Set(flagged.matches.map((match) => match.categoryLabel))];

  return (
    <div className="flex items-center gap-2 border-b border-border-solid px-4 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-text">{flagged.word}</span>
        {categoryLabels.length > 0 && (
          <span className="ml-2 text-[0.8rem] text-text-secondary">
            {categoryLabels.join(", ")}
          </span>
        )}
        {flagged.matches.length === 0 && (
          <span className="ml-2 text-[0.8rem] text-text-secondary">not in word bank</span>
        )}
        {flagged.matches.length > 0 && activeMatches.length === 0 && (
          <span className="ml-2 text-[0.8rem] text-text-secondary">already inactive</span>
        )}
      </div>
      <button
        type="button"
        className="btn btn--small btn--outline"
        disabled={activeMatches.length === 0}
        onClick={() => onDeactivate(activeMatches.map((match) => match.id))}
      >
        Deactivate
      </button>
    </div>
  );
}
