import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PendingWord } from "../utils/adminApi";

const SWIPE_THRESHOLD_PX = 80;

interface AdminReviewQueueProps {
  pendingWords: PendingWord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRejectAll: () => void;
  onEditSave: (id: string, text: string) => void;
}

interface CategoryGroup {
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  isNewCategory: boolean;
  words: PendingWord[];
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

  const byCategory = new Map<string, CategoryGroup>();
  for (const word of pendingWords) {
    const group = byCategory.get(word.categoryId) ?? {
      categoryId: word.categoryId,
      categoryLabel: word.categoryLabel,
      categoryEmoji: word.categoryEmoji,
      isNewCategory: word.isNewCategory,
      words: [],
    };
    group.words.push(word);
    byCategory.set(word.categoryId, group);
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
      {[...byCategory.values()].map((group) => (
        <section
          key={group.categoryId}
          className="overflow-hidden rounded-card border border-outline bg-surface"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border-solid px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <span aria-hidden="true">{group.categoryEmoji}</span>
              <span className="truncate">{group.categoryLabel}</span>
              {group.isNewCategory && (
                <span className="inline-flex flex-none items-center rounded-chip border border-yellow px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-yellow">
                  New
                </span>
              )}
            </span>
            <span className="inline-flex min-w-[1.6rem] flex-none items-center justify-center rounded-chip border border-outline bg-surface-solid px-2 text-[0.8rem] font-bold text-text-secondary">
              {group.words.length}
            </span>
          </div>
          {group.words.map((word) => (
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
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== word.text) {
      onEditSave(word.id, trimmed);
    }
  };

  // Swipe right to approve, left to reject — mirrors the buttons so a bulk
  // review pass can happen thumb-only without hunting for tap targets.
  // Ignored when the drag starts on the text input or a button so editing
  // and the existing click handlers keep working untouched.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, button")) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return;
    setDragX(e.clientX - startXRef.current);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (dragX > SWIPE_THRESHOLD_PX) {
      onApprove(word.id);
    } else if (dragX < -SWIPE_THRESHOLD_PX) {
      onReject(word.id);
    }
    setDragX(0);
  };

  const swipeIntent = dragX > 0 ? "approve" : dragX < 0 ? "reject" : null;
  const swipeStrength = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD_PX, 1);

  return (
    <div className="relative overflow-hidden border-b border-border-solid last:border-b-0">
      {swipeIntent && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center px-4 font-bold ${
            swipeIntent === "approve" ? "justify-start text-primary" : "justify-end text-danger"
          }`}
          style={{ opacity: swipeStrength }}
          aria-hidden="true"
        >
          {swipeIntent === "approve" ? "✓ Approve" : "Reject ✕"}
        </div>
      )}
      <div
        className="flex items-center gap-2 bg-bg px-4 py-2"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
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
    </div>
  );
}
