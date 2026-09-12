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
    <form className="admin__generate-form" onSubmit={handleSubmit}>
      <select
        aria-label="Category"
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
      <input
        aria-label="Count"
        type="number"
        min={1}
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
      />
      <button type="submit" className="btn btn--primary" disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
