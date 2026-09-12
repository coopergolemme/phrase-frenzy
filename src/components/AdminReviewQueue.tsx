import { useState } from "react";
import type { PendingWord } from "../utils/adminApi";

interface AdminReviewQueueProps {
  pendingWords: PendingWord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRejectAll: () => void;
  onEditSave: (id: string, text: string) => void;
}

export function AdminReviewQueue({
  pendingWords,
  onApprove,
  onReject,
  onRejectAll,
  onEditSave,
}: AdminReviewQueueProps) {
  if (pendingWords.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No pending words.</p>;
  }

  const byCategory = new Map<string, PendingWord[]>();
  for (const word of pendingWords) {
    const list = byCategory.get(word.categoryLabel) ?? [];
    byCategory.set(word.categoryLabel, [...list, word]);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="btn btn--small btn--outline self-end"
        onClick={onRejectAll}
      >
        Reject All ({pendingWords.length})
      </button>
      {[...byCategory.entries()].map(([label, words]) => (
        <section
          key={label}
          className="overflow-hidden rounded-card border border-outline bg-surface backdrop-blur-[20px]"
        >
          <div className="flex items-center justify-between border-b border-border-solid px-4 py-3">
            <span className="font-bold">{label}</span>
            <span className="inline-flex min-w-[1.6rem] items-center justify-center rounded-chip border border-outline bg-surface-solid px-2 text-[0.8rem] font-bold text-text-secondary">
              {words.length}
            </span>
          </div>
          {words.map((word) => (
            <AdminReviewRow
              key={word.id}
              word={word}
              onApprove={onApprove}
              onReject={onReject}
              onEditSave={onEditSave}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

interface AdminReviewRowProps {
  word: PendingWord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEditSave: (id: string, text: string) => void;
}

function AdminReviewRow({ word, onApprove, onReject, onEditSave }: AdminReviewRowProps) {
  const [text, setText] = useState(word.text);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== word.text) {
      onEditSave(word.id, trimmed);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-border-solid px-4 py-2 last:border-b-0">
      <input
        className="min-h-touch min-w-0 flex-1 rounded-button border-[1.5px] border-transparent bg-transparent px-3 py-2 font-[inherit] text-base text-text focus:border-border-solid focus:bg-surface-solid focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        aria-label={`Edit "${word.text}"`}
      />
      <button
        type="button"
        className="btn btn--small btn--primary"
        onClick={() => onApprove(word.id)}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn btn--small btn--outline"
        onClick={() => onReject(word.id)}
      >
        Reject
      </button>
    </div>
  );
}
