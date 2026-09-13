// Framework-agnostic prompt-building and dedupe logic shared conceptually
// with scripts/curate-words.ts (duplicated rather than imported — one runs
// under Node, the other under the Deno edge runtime). Kept dependency-free
// so it can be imported directly by both the edge function and Vitest.

export interface WordRow {
  category_id: string;
  text: string;
}

// A category the model may target: either a real one already in the db, or
// one proposed earlier in the same (unpublished) admin session — both are
// "known" to the model the same way, so it can keep adding to either
// instead of inventing a third near-duplicate.
export interface KnownCategory {
  id: string;
  label: string;
  emoji: string;
  isNewCategory: boolean;
}

export interface GeneratedBatch {
  categoryId: string | null;
  newCategoryLabel?: string;
  newCategoryEmoji?: string;
  words: string[];
}

export interface AcceptedCategory {
  categoryId: string;
  label: string;
  emoji: string;
  isNewCategory: boolean;
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
  categories: KnownCategory[],
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

  const topicDirective = trimmedInstructions
    ? `THE ADMIN'S REQUEST — THIS IS YOUR ASSIGNMENT, NOT A SUGGESTION:
"${trimmedInstructions}"

Every single word/phrase you return MUST be a direct, obvious instance of
this exact request. This request overrides everything else below except
the guessability rules — it does NOT matter whether an existing category
below "could use more entries"; if a word doesn't clearly satisfy this
request, it does not belong in this batch, full stop.

Do NOT drift onto a related-but-different topic. For example, if asked
for famous places, do not return famous people, buildings named after
people, or events that happened at a place — only actual places. If asked
for a specific decade or genre, do not include entries from a neighboring
one. When in doubt, an entry either obviously satisfies the exact request
or it gets left out.

The "Existing categories" list further below exists ONLY so you can (a)
avoid repeating a word that's already there and (b) file your answer under
the right id if one already covers this exact topic. It is not a menu of
topics to pick from or a source of inspiration — ignore what those
categories are about when deciding what to generate; only this request
decides that.`
    : `No specific topic was requested. Pick ONE existing category below
that could use more entries and generate words that clearly belong to it.`;

  return `${CURATION_RULES}

${topicDirective}

Generate ${count} original words/phrases for the request above, following
every rule in the guessability guidelines at the top of this prompt.

Once you know what the words are about, decide which ONE category they
belong in — this only affects where they're filed, never what they're
about:
- If an existing category below matches that same topic, use its exact
  "id" as "categoryId" and leave "newCategoryLabel"/"newCategoryEmoji"
  unset. A category is a match only if its topic is the same as the
  request, not merely adjacent or a superset (e.g. "Famous People" is not
  a match for a "famous places" request).
- Otherwise propose ONE new category: set "categoryId" to null, and set
  "newCategoryLabel" (a short Title Case name, 1-3 words) and
  "newCategoryEmoji" (one representative emoji). Do not propose a new
  category that duplicates or overlaps an existing one in spirit — reuse
  the existing one instead.
Do NOT repeat any of the existing words listed for a category (case
insensitive), and do not repeat a word across categories. If, and only if,
the request clearly spans more than one theme, you may return multiple
entries — otherwise return exactly one.

Existing categories (for dedup/filing only — see above):
${categoryList}

Before answering, re-read the request above and check every word against
it one more time — drop anything that isn't a direct match.

Respond with ONLY a JSON array (no markdown fences, no commentary) matching
this shape:
[{ "categoryId": "existing-id-or-null", "newCategoryLabel": "optional", "newCategoryEmoji": "optional", "words": ["new word one", "new word two"] }]`;
}

function normalizeWords(words: string[]): string[] {
  return words.map((w) => w.trim()).filter((w) => w.length > 0);
}

export function dedupeAgainstExisting(
  batches: GeneratedBatch[],
  knownCategories: KnownCategory[],
  existingWordsByCategory: Map<string, Set<string>>
): AcceptedCategory[] {
  const byId = new Map(knownCategories.map((c) => [c.id, c]));
  const byLabel = new Map(knownCategories.map((c) => [c.label.trim().toLowerCase(), c]));

  const seenThisRun = new Set<string>();
  const accepted = new Map<string, AcceptedCategory>();
  const usedNewSlugs = new Set<string>();

  const acceptInto = (target: AcceptedCategory, words: string[]) => {
    for (const rawWord of words) {
      const word = rawWord.trim();
      if (!word) continue;
      const key = `${target.categoryId}:${word.toLowerCase()}`;
      const alreadyExists = existingWordsByCategory.get(target.categoryId)?.has(word.toLowerCase());
      if (alreadyExists || seenThisRun.has(key)) continue;
      seenThisRun.add(key);
      target.words.push(word);
    }
  };

  for (const batch of batches) {
    const words = normalizeWords(batch.words);
    if (words.length === 0) continue;

    // Resolve to a known category first — by id, then by label (guards
    // against the model returning null/newCategory* for something that
    // already exists under a slightly different id casing/spelling).
    const label = batch.newCategoryLabel?.trim();
    const known =
      (batch.categoryId ? byId.get(batch.categoryId) : undefined) ??
      (label ? byLabel.get(label.toLowerCase()) : undefined);

    if (known) {
      const target = accepted.get(known.id) ?? {
        categoryId: known.id,
        label: known.label,
        emoji: known.emoji,
        isNewCategory: known.isNewCategory,
        words: [],
      };
      acceptInto(target, words);
      if (target.words.length > 0) accepted.set(known.id, target);
      continue;
    }

    const emoji = batch.newCategoryEmoji?.trim();
    if (!label || !emoji) continue; // invalid proposal — no way to resolve or create it

    const slugKey = label.toLowerCase();
    let categoryId = accepted.get(`new:${slugKey}`)?.categoryId;
    if (!categoryId) {
      const slug = slugify(label);
      let candidate = `new:${slug}`;
      let suffix = 2;
      while (usedNewSlugs.has(candidate)) {
        candidate = `new:${slug}-${suffix}`;
        suffix += 1;
      }
      usedNewSlugs.add(candidate);
      categoryId = candidate;
      byLabel.set(slugKey, { id: categoryId, label, emoji, isNewCategory: true });
    }

    const target = accepted.get(categoryId) ?? {
      categoryId,
      label,
      emoji,
      isNewCategory: true,
      words: [],
    };
    acceptInto(target, words);
    if (target.words.length > 0) accepted.set(categoryId, target);
  }

  return [...accepted.values()];
}

function slugify(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}
