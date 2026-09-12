import { useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";

interface AdminGenerateFormProps {
  categories: WordCategory[];
  isGenerating: boolean;
  onGenerate: (categoryId: string | undefined, count: number) => void;
}

const fieldLabelClass = "text-[0.8rem] font-semibold text-text-secondary";
const fieldControlClass =
  "min-h-touch w-full rounded-button border-[1.5px] border-border-solid bg-surface-solid px-3 py-2 font-[inherit] text-base text-text focus:outline-2 focus:outline-primary focus:outline-offset-1";

export function AdminGenerateForm({ categories, isGenerating, onGenerate }: AdminGenerateFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(20);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGenerate(categoryId || undefined, count);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className={fieldLabelClass} htmlFor="admin-generate-category">
            Category
          </label>
          <select
            id="admin-generate-category"
            className={fieldControlClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-none basis-[5.5rem] flex-col gap-1">
          <label className={fieldLabelClass} htmlFor="admin-generate-count">
            Count
          </label>
          <input
            id="admin-generate-count"
            className={fieldControlClass}
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
      </div>
      <button type="submit" className="btn btn--primary" disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
