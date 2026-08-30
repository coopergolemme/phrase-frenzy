import { createClient } from "@supabase/supabase-js";
import type { WordCategory } from "./wordCategory";

interface CategoryRow {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
}

interface WordRow {
  id: string;
  category_id: string;
  text: string;
  active: boolean;
}

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, anonKey);
}

export async function fetchWordCategories(): Promise<WordCategory[]> {
  const client = getClient();

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client
    .from("words")
    .select("id, category_id, text, active")
    .eq("active", true)
    .order("category_id");
  if (wordError) throw wordError;

  const categories = (categoryRows ?? []) as CategoryRow[];
  const words = (wordRows ?? []) as WordRow[];

  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    emoji: category.emoji,
    words: words.filter((w) => w.category_id === category.id).map((w) => w.text),
  }));
}
