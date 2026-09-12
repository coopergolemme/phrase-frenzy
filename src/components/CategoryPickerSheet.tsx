import type { WordCategory } from "../data/wordCategory";

const categoryChipClass = (selected: boolean) =>
  "inline-flex min-h-touch items-center gap-1 rounded-chip border px-4 py-2 text-[0.95rem] font-semibold transition-transform duration-[80ms] active:scale-[0.96] " +
  (selected
    ? "border-primary-pressed bg-primary text-[#0e1f15]"
    : "border-outline bg-surface text-text backdrop-blur-[20px]");

interface CategoryPickerSheetProps {
  categories: WordCategory[];
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  categories,
  categoryIds,
  onToggleCategory,
  onSelectAll,
  onClose,
}: CategoryPickerSheetProps) {
  const allSelected = categoryIds.length === categories.length;

  return (
    <div className="review-sheet">
      <div className="review-sheet__header">
        <p className="review-sheet__title">Word categories</p>
        <button
          type="button"
          className="review-sheet__close"
          onClick={onClose}
          aria-label="Close word categories"
        >
          &times;
        </button>
      </div>

      <div className="review-sheet__list category-sheet__body">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={categoryChipClass(allSelected)}
            onClick={onSelectAll}
            aria-pressed={allSelected}
          >
            <span aria-hidden="true">✅</span> All
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = categoryIds.includes(category.id);
            return (
              <button
                type="button"
                key={category.id}
                className={categoryChipClass(selected)}
                onClick={() => onToggleCategory(category.id)}
                aria-pressed={selected}
              >
                <span aria-hidden="true">{category.emoji}</span> {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
