import { useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";

interface AdminGenerateFormProps {
  categories: WordCategory[];
  isGenerating: boolean;
  onGenerate: (categoryId: string | undefined, count: number) => void;
}

export function AdminGenerateForm({ categories, isGenerating, onGenerate }: AdminGenerateFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(20);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGenerate(categoryId || undefined, count);
  };

  return (
    <form className="admin-generate-form" onSubmit={handleSubmit}>
      <div className="admin-generate-form__fields">
        <div className="admin-field">
          <label className="admin-field__label" htmlFor="admin-generate-category">
            Category
          </label>
          <select
            id="admin-generate-category"
            className="admin-select"
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
        <div className="admin-field">
          <label className="admin-field__label" htmlFor="admin-generate-count">
            Count
          </label>
          <input
            id="admin-generate-count"
            className="admin-input"
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
