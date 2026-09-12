// Automated word curation: pulls the live category/word list from Supabase,
// asks an LLM to generate a filtered, deduplicated batch of new words per
// the rules in docs/curate-word-list-prompt.md, and inserts the results as
// inactive rows for manual review (see scripts/activate-words.ts).
//
// Usage:
//   npm run curate:words -- --count 50 [--category food] [--dry-run]
// Reads GEMINI_API_KEY, VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY
// from .env (falls back to whatever's already in the environment).
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

try {
  process.loadEnvFile();
} catch {
  // No .env file — fall back to vars already present in the environment.
}

interface CategoryRow {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
}

interface WordRow {
  category_id: string;
  text: string;
}

interface GeneratedBatch {
  categoryId: string;
  words: string[];
}

const CURATION_RULES = `I'm building the word bank for a "hot potato" word-guessing party game
called Phrase Frenzy (similar to Catchphrase/Heads Up). Players describe a
word or short phrase out loud while teammates guess before a 60-second
timer runs out.

My audience is a mixed group: people in their 20s and people in their 50s,
often playing together in the same round (e.g. family gatherings, mixed
generational friend groups). Every word needs to be guessable and
recognizable by BOTH age groups without either side feeling left out.

THE #1 RULE YOU CANNOT BREAK: every single word or phrase must be
describable by one player, out loud, in a FEW WORDS (a short sentence or
two, max), without saying the word itself. If you can't imagine a natural
clue like "the frozen dessert with a stick" or "the guy who played Iron
Man," the entry doesn't belong on the list, no matter how famous or
well-known it is. Reject anything that would require a rambling
explanation, a story, or multiple attempts to clue — favor a concrete,
one-glance, one-sentence description over cleverness or obscurity every
time. Apply this filter more strictly than any other rule below, including
for famous people and brands.

FILTER OUT words/phrases that:
- Are too obscure, technical, or niche (e.g. jargon, rare trivia)
- Skew heavily toward only one generation (e.g. very recent internet
  slang/memes that a 50-year-old wouldn't know, OR outdated references
  a 20-something wouldn't recognize)
- Are ambiguous or too hard to describe in a few words

KEEP words/phrases that are:
- Common nouns, everyday objects, activities, places, foods, animals
- Cross-generational pop culture that's stood the test of time
- Famous people, brands, books, idioms with ONE obvious, easy hook a
  clue-giver can reach for immediately
- Easy to describe verbally within 5-10 seconds without saying the word`;

function parseArgs(argv: string[]) {
  const countFlagIndex = argv.indexOf("--count");
  const categoryFlagIndex = argv.indexOf("--category");
  const count = countFlagIndex >= 0 ? Number(argv[countFlagIndex + 1]) : 50;
  const categoryId =
    categoryFlagIndex >= 0 ? argv[categoryFlagIndex + 1] : undefined;
  const dryRun = argv.includes("--dry-run");

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("--count must be a positive integer");
  }

  return { count, categoryId, dryRun };
}

function buildPrompt(
  categories: CategoryRow[],
  existingWordsByCategory: Map<string, string[]>,
  count: number,
): string {
  const categoryList = categories
    .map((c) => {
      const existing = existingWordsByCategory.get(c.id) ?? [];
      return `- id: "${c.id}", label: "${c.label}"\n  existing words: ${JSON.stringify(existing)}`;
    })
    .join("\n");

  return `${CURATION_RULES}

Generate ${count} additional original words/phrases, evenly distributed
across the categories below unless the counts make more sense otherwise.
Do NOT repeat any of the existing words listed for a category (case
insensitive), and do not repeat a word across categories.

Categories:
${categoryList}

Respond with ONLY a JSON array (no markdown fences, no commentary) matching
this shape:
[{ "categoryId": "existing-category-id", "words": ["new word one", "new word two"] }]`;
}

async function callGemini(prompt: string): Promise<GeneratedBatch[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini response had no text content");
  }

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }
  return parsed as GeneratedBatch[];
}

function dedupeAgainstExisting(
  batches: GeneratedBatch[],
  categoryIds: Set<string>,
  existingWordsByCategory: Map<string, Set<string>>,
): Map<string, string[]> {
  const seenThisRun = new Set<string>();
  const result = new Map<string, string[]>();

  for (const batch of batches) {
    if (!categoryIds.has(batch.categoryId)) continue;
    const existing = existingWordsByCategory.get(batch.categoryId) ?? new Set();
    const accepted: string[] = [];

    for (const rawWord of batch.words) {
      const word = rawWord.trim();
      if (!word) continue;
      const key = `${batch.categoryId}:${word.toLowerCase()}`;
      if (existing.has(word.toLowerCase()) || seenThisRun.has(key)) continue;
      seenThisRun.add(key);
      accepted.push(word);
    }

    if (accepted.length > 0) {
      result.set(batch.categoryId, accepted);
    }
  }

  return result;
}

async function main() {
  const { count, categoryId, dryRun } = parseArgs(process.argv.slice(2));

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  const client = createClient(url, serviceRoleKey);

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client
    .from("words")
    .select("category_id, text");
  if (wordError) throw wordError;

  const allCategories = (categoryRows ?? []) as CategoryRow[];
  const categories = categoryId
    ? allCategories.filter((c) => c.id === categoryId)
    : allCategories;
  if (categories.length === 0) {
    throw new Error(
      categoryId
        ? `Unknown category id "${categoryId}"`
        : "No categories found",
    );
  }

  const existingWords = (wordRows ?? []) as WordRow[];
  const existingWordsByCategory = new Map<string, string[]>();
  const existingWordSetByCategory = new Map<string, Set<string>>();
  for (const row of existingWords) {
    const list = existingWordsByCategory.get(row.category_id) ?? [];
    list.push(row.text);
    existingWordsByCategory.set(row.category_id, list);

    const set = existingWordSetByCategory.get(row.category_id) ?? new Set();
    set.add(row.text.toLowerCase());
    existingWordSetByCategory.set(row.category_id, set);
  }

  const prompt = buildPrompt(categories, existingWordsByCategory, count);
  const rawBatches = await callGemini(prompt);
  const accepted = dedupeAgainstExisting(
    rawBatches,
    new Set(categories.map((c) => c.id)),
    existingWordSetByCategory,
  );

  let total = 0;
  for (const [catId, words] of accepted) {
    total += words.length;
    console.log(`\n${catId} (${words.length}):`);
    for (const word of words) console.log(`  - ${word}`);
  }
  console.log(`\nTotal new words: ${total}`);

  if (dryRun) {
    console.log("\nDry run — nothing written to Supabase.");
    return;
  }

  const createdAt = new Date().toISOString();
  for (const [catId, words] of accepted) {
    const rows = words.map((text) => ({
      category_id: catId,
      text,
      active: false,
      created_at: createdAt,
    }));
    const { error } = await client.from("words").insert(rows);
    if (error) throw error;
  }

  console.log(
    "\nInserted as inactive. Review, then run: npx tsx scripts/activate-words.ts",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
