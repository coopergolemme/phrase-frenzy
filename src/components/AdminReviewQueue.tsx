import { useState } from "react";
import type { PendingWord } from "../utils/adminApi";

interface AdminReviewQueueProps {
  pendingWords: PendingWord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEditSave: (id: string, text: string) => void;
}

export function AdminReviewQueue({
  pendingWords,
  onApprove,
  onReject,
  onEditSave,
}: AdminReviewQueueProps) {
  if (pendingWords.length === 0) {
    return <p className="admin__empty">No pending words.</p>;
  }

  const byCategory = new Map<string, PendingWord[]>();
  for (const word of pendingWords) {
    const list = byCategory.get(word.categoryLabel) ?? [];
    byCategory.set(word.categoryLabel, [...list, word]);
  }

  return (
    <div className="admin__queue">
      {[...byCategory.entries()].map(([label, words]) => (
        <section key={label} className="admin__queue-group">
          <h3>{label}</h3>
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
    <div className="admin__row">
      <input
        className="admin__row-input"
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
