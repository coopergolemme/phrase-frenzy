// One-off migration: populates the Supabase categories/words tables from the
// legacy hardcoded word list. Run manually, once, after creating the
// Supabase project and applying supabase/schema.sql. Not run by the app or CI.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts /tmp/legacy-words.ts
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

interface LegacyCategory {
  id: string;
  label: string;
  emoji: string;
  words: string[];
}

async function loadLegacyCategories(filePath: string): Promise<LegacyCategory[]> {
  // The legacy file is a self-contained TS module (no imports of its own)
  // exporting WORD_CATEGORIES, so tsx can load it directly as a module —
  // no eval() of its contents needed.
  const module = (await import(pathToFileURL(resolve(filePath)).href)) as {
    WORD_CATEGORIES: LegacyCategory[];
  };
  return module.WORD_CATEGORIES;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: tsx scripts/seed-supabase.ts <path-to-legacy-words.ts>");
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  const client = createClient(url, serviceRoleKey);
  const categories = await loadLegacyCategories(filePath);

  for (const [index, category] of categories.entries()) {
    const { error: categoryError } = await client.from("categories").upsert({
      id: category.id,
      label: category.label,
      emoji: category.emoji,
      sort_order: index,
    });
    if (categoryError) throw categoryError;

    const rows = category.words.map((text) => ({ category_id: category.id, text, active: true }));
    const { error: wordsError } = await client.from("words").insert(rows);
    if (wordsError) throw wordsError;

    console.log(`Seeded ${rows.length} words into "${category.id}"`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
