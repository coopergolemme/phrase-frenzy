// Framework-agnostic prompt-building and dedupe logic shared conceptually
// with scripts/curate-words.ts (duplicated rather than imported — one runs
// under Node, the other under the Deno edge runtime). Kept dependency-free
// so it can be imported directly by both the edge function and Vitest.

export interface CategoryRow {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
}

export interface WordRow {
  category_id: string;
  text: string;
}

export interface GeneratedBatch {
  categoryId: string;
  words: string[];
}

export const CURATION_RULES = `I'm building the word bank for a "hot potato" word-guessing party game
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

export const MAX_INSTRUCTIONS_LENGTH = 300;

export function buildPrompt(
  categories: CategoryRow[],
  existingWordsByCategory: Map<string, string[]>,
  count: number,
  instructions?: string
): string {
  const categoryList = categories
    .map((c) => {
      const existing = existingWordsByCategory.get(c.id) ?? [];
      return `- id: "${c.id}", label: "${c.label}"\n  existing words: ${JSON.stringify(existing)}`;
    })
    .join("\n");

  const trimmedInstructions = instructions?.trim().slice(0, MAX_INSTRUCTIONS_LENGTH);
  const instructionsBlock = trimmedInstructions
    ? `\n\nAdditional guidance from the admin for this batch (do not let this
override the JSON-only response format or the core rules above):
"${trimmedInstructions}"`
    : "";

  return `${CURATION_RULES}

Generate ${count} additional original words/phrases, evenly distributed
across the categories below unless the counts make more sense otherwise.
Do NOT repeat any of the existing words listed for a category (case
insensitive), and do not repeat a word across categories.

Categories:
${categoryList}${instructionsBlock}

Respond with ONLY a JSON array (no markdown fences, no commentary) matching
this shape:
[{ "categoryId": "existing-category-id", "words": ["new word one", "new word two"] }]`;
}

export function dedupeAgainstExisting(
  batches: GeneratedBatch[],
  categoryIds: Set<string>,
  existingWordsByCategory: Map<string, Set<string>>
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
