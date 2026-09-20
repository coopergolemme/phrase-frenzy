import { useState } from "react";
import type { FlaggedWord, SimilarWord, SimilarWordSuggestions } from "../utils/adminApi";

interface AdminFlaggedWordsQueueProps {
  flaggedWords: FlaggedWord[];
  onDeactivate: (ids: string[], reason?: string) => void;
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
  // Id of the word whose "why is this bad?" prompt is currently open —
  // only one at a time, keyed by flagged word id rather than a boolean so
  // it can't leak across rows.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  // Already-deactivated words can't be acted on from here — the
  // deactivated-words queue is where those get reviewed — so hide them,
  // *unless* this word was just deactivated in this session and still has
  // a similar-words follow-up to show: that row needs to stay visible for
  // the admin to act on it.
  const activeFlaggedWords = flaggedWords.filter(
    (flagged) => flagged.active || similarSuggestions[flagged.id] !== undefined
  );

  if (activeFlaggedWords.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No flagged words.</p>;
  }

  const startConfirm = (id: string) => {
    setConfirmingId(id);
    setReasonDraft("");
  };

  const cancelConfirm = () => {
    setConfirmingId(null);
    setReasonDraft("");
  };

  const confirmDeactivate = (id: string) => {
    onDeactivate([id], reasonDraft.trim() || undefined);
    setConfirmingId(null);
    setReasonDraft("");
  };

  return (
    <div className="max-h-[65vh] overflow-y-auto rounded-card border border-outline bg-surface [-webkit-overflow-scrolling:touch]">
      {activeFlaggedWords.map((flagged) => {
        const suggestions = similarSuggestions[flagged.id];
        const isConfirming = confirmingId === flagged.id;
        return (
          <div key={flagged.id} className="border-b border-border-solid last:border-b-0">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-text">{flagged.text}</span>
                <span className="ml-2 text-[0.8rem] text-text-secondary">
                  {flagged.categoryLabel} · flagged {flagged.flaggedCount}x
                </span>
                {!flagged.active && (
                  <span className="ml-2 text-[0.8rem] text-text-secondary">deactivated</span>
                )}
              </div>
              {!isConfirming && flagged.active && (
                <button
                  type="button"
                  className="btn btn--small btn--outline"
                  onClick={() => startConfirm(flagged.id)}
                >
                  Deactivate
                </button>
              )}
            </div>

            {isConfirming && (
              <div className="flex flex-col gap-2 px-4 pb-3">
                <label
                  className="text-[0.8rem] text-text-secondary"
                  htmlFor={`deactivate-reason-${flagged.id}`}
                >
                  Why was this word bad? (optional — helps find similar ones)
                </label>
                <input
                  id={`deactivate-reason-${flagged.id}`}
                  className="min-h-touch w-full rounded-button border-[1.5px] border-border-solid bg-surface-solid px-3 py-2 font-[inherit] text-base text-text focus:outline-2 focus:outline-primary focus:outline-offset-1"
                  type="text"
                  placeholder="e.g. too obscure, ambiguous, offensive…"
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn--small btn--outline" onClick={cancelConfirm}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--primary"
                    onClick={() => confirmDeactivate(flagged.id)}
                  >
                    Confirm Deactivation
                  </button>
                </div>
              </div>
            )}

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
                      className="btn btn--small btn--outline"
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
