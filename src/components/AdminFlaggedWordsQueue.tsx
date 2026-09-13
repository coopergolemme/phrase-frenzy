import type { FlaggedWord, SimilarWord, SimilarWordSuggestions } from "../utils/adminApi";

interface AdminFlaggedWordsQueueProps {
  flaggedWords: FlaggedWord[];
  onDeactivate: (ids: string[]) => void;
  similarSuggestions: Record<string, SimilarWordSuggestions>;
  onDeactivateSuggestion: (sourceId: string, suggestion: SimilarWord) => void;
  onDismissSuggestion: (sourceId: string, suggestionId: string) => void;
}

export function AdminFlaggedWordsQueue({
  flaggedWords,
  onDeactivate,
  similarSuggestions,
  onDeactivateSuggestion,
  onDismissSuggestion,
}: AdminFlaggedWordsQueueProps) {
  if (flaggedWords.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No flagged words.</p>;
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline bg-surface backdrop-blur-[20px]">
      {flaggedWords.map((flagged) => {
        const suggestions = similarSuggestions[flagged.id];
        return (
          <div key={flagged.id} className="border-b border-border-solid last:border-b-0">
            <div className="flex items-center gap-2 px-4 py-2">
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

            {suggestions?.status === "loading" && (
              <p className="m-0 px-4 pb-2 text-[0.8rem] text-text-secondary">
                Checking for similar words…
              </p>
            )}
            {suggestions?.status === "error" && (
              <p className="m-0 px-4 pb-2 text-[0.8rem] text-danger">
                Couldn't check for similar words.
              </p>
            )}
            {suggestions?.status === "done" && suggestions.items.length > 0 && (
              <div className="mx-4 mb-2 flex flex-col gap-1 rounded-button border border-border-solid bg-surface-solid p-2">
                <p className="m-0 text-[0.8rem] font-semibold text-text-secondary">
                  Similar words still active — deactivate these too?
                </p>
                {suggestions.items.map((suggestion) => (
                  <div key={suggestion.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[0.9rem] text-text">{suggestion.text}</span>
                    <button
                      type="button"
                      className="btn btn--small btn--outline"
                      onClick={() => onDeactivateSuggestion(flagged.id, suggestion)}
                    >
                      Deactivate
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--text"
                      onClick={() => onDismissSuggestion(flagged.id, suggestion.id)}
                      aria-label={`Dismiss suggestion: ${suggestion.text}`}
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
