import { WORD_CATEGORIES, type WordCategory } from "../data/words";

const ALL_CATEGORY_IDS = WORD_CATEGORIES.map((c) => c.id);

const categoryGroups: [string, WordCategory[]][] = Array.from(
  WORD_CATEGORIES.reduce((groups, category) => {
    const list = groups.get(category.group) ?? [];
    list.push(category);
    groups.set(category.group, list);
    return groups;
  }, new Map<string, WordCategory[]>())
);

interface CategoryPickerSheetProps {
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  categoryIds,
  onToggleCategory,
  onSelectAll,
  onClose,
}: CategoryPickerSheetProps) {
  const allSelected = categoryIds.length === ALL_CATEGORY_IDS.length;

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
        <div className="category-picker">
          <button
            type="button"
            className={"category-chip" + (allSelected ? " category-chip--selected" : "")}
            onClick={onSelectAll}
            aria-pressed={allSelected}
          >
            <span aria-hidden="true">✅</span> All
          </button>
        </div>

        <div className="category-picker__groups">
          {categoryGroups.map(([group, categories]) => (
            <div key={group}>
              <p className="category-picker__group-label">{group}</p>
              <div className="category-picker">
                {categories.map((category) => {
                  const selected = categoryIds.includes(category.id);
                  return (
                    <button
                      type="button"
                      key={category.id}
                      className={
                        "category-chip" + (selected ? " category-chip--selected" : "")
                      }
                      onClick={() => onToggleCategory(category.id)}
                      aria-pressed={selected}
                    >
                      <span aria-hidden="true">{category.emoji}</span> {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
