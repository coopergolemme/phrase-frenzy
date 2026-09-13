import type { WordCategory } from "./wordCategory";
import { getSupabaseClient } from "../utils/supabaseClient";

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

// PostgREST caps an unpaginated `select` at its default 1000-row page
// size, and the words table is already well past that — an unpaginated
// fetch here silently truncates and drops whichever categories happen to
// sort past the cutoff (alphabetically by category_id, since that's the
// query's order), leaving them with zero words in the game.
const POSTGREST_PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }
  return rows;
}

export async function fetchWordCategories(): Promise<WordCategory[]> {
  const client = getSupabaseClient();

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const words = await fetchAllRows<WordRow>((from, to) =>
    client
      .from("words")
      .select("id, category_id, text, active")
      .eq("active", true)
      .order("category_id")
      .range(from, to)
  );

  const categories = (categoryRows ?? []) as CategoryRow[];

  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    emoji: category.emoji,
    words: words.filter((w) => w.category_id === category.id).map((w) => w.text),
  }));
}
