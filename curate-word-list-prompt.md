# Prompt: Generate More Phrase Frenzy Words

Reusable prompt for adding new entries to `src/data/words.ts` (or curating
a fresh batch from a raw source list). Paste it into Claude Code along with
however many new words you want, and point it at the categories that need
filling out.

---

## The Prompt

```
I'm building the word bank for a "hot potato" word-guessing party game
called Phrase Frenzy (similar to Catchphrase/Heads Up). Players describe a
word or short phrase out loud while teammates guess before a 60-second
timer runs out.

My audience is a mixed group: people in their 20s and people in their 50s,
often playing together in the same round (e.g. family gatherings, mixed
generational friend groups). Every word needs to be guessable and
recognizable by BOTH age groups without either side feeling left out.

THE #1 RULE, ABOVE EVERYTHING ELSE: every single word or phrase must be
describable by one player, out loud, in a FEW WORDS (a short sentence or
two, max), without saying the word itself. If you can't imagine a natural
clue like "the frozen dessert with a stick" or "the guy who played Iron
Man," the entry doesn't belong on the list, no matter how famous or
well-known it is. Reject anything that would require a rambling
explanation, a story, or multiple attempts to clue — favor a concrete,
one-glance, one-sentence description over cleverness or obscurity every
time. Apply this filter more strictly than any other rule below, including
for famous people and brands.

Please do the following:

1. FILTER OUT words/phrases that:
   - Are too obscure, technical, or niche (e.g. jargon, rare trivia)
   - Skew heavily toward only one generation (e.g. very recent internet
     slang/memes that a 50-year-old wouldn't know, OR outdated references
     a 20-something wouldn't recognize)
   - Are ambiguous or too hard to describe in a few words (overly
     abstract concepts, multi-word idioms with no concrete image, or
     famous people/brands whose fame isn't "instantly clueable" — e.g.
     someone known for a nuanced body of work rather than one clear
     hook)

2. KEEP words/phrases that are:
   - Common nouns, everyday objects, activities, places, foods, animals
   - Cross-generational pop culture that's stood the test of time (classic
     movies, well-known songs, iconic brands, sports)
   - Famous people (actors, musicians, athletes, historical figures,
     politicians who are broadly known) who have ONE obvious, easy hook a
     clue-giver can reach for immediately (a signature role, a famous
     song, a well-known achievement, a distinctive trait)
   - Branded/trademarked things (products, restaurants, companies, apps,
     franchises) that are extremely widely recognized and easy to clue by
     function or slogan (e.g. "the search engine that's also a verb")
   - Easy to describe verbally within 5-10 seconds without saying the word

3. GENERATE [N] additional original words/phrases across these categories,
   evenly distributed unless I say otherwise:
   - Everyday objects & household items
   - Food & drink
   - Animals
   - Places & travel
   - Actions & activities (sports, hobbies)
   - Classic + modern movies/TV/music (broadly recognizable across decades)
   - Simple idioms or common phrases (visual/concrete, not abstract)
   - Famous people (actors, musicians, athletes, historical/cultural
     figures) who are easy to clue in one sentence
   - Well-known brands, products, and companies that are easy to clue by
     what they are/do
   - Books & authors (classic + modern titles broadly known across
     generations; authors with one clear hook)

4. Check every new entry against the existing lists in
   src/data/words.ts and drop anything that's already there — no
   duplicates within or across categories.

5. Sort each new entry into the best-fit existing category id from
   src/data/words.ts (household, food, animals, travel, actions,
   movies-tv-music, idioms, famous-people, brands, books-authors). Only
   propose a new category if none of the existing ones fit.

6. Output the final result as ready-to-paste TypeScript matching the
   existing WordCategory format:

   {
     id: "existing-category-id",
     label: "Existing Label",
     emoji: "🏠",
     words: [
       "new word one",
       "new word two",
     ],
   }

   Group your output by category so it's easy to merge each batch of new
   words into the matching category's `words` array in
   src/data/words.ts.
```

---

## How to use it

1. Fill in `[N]` with how many new words you want (e.g. "50 new food
   words" or "200 words across all categories").
2. If you're curating a raw source list instead of generating from
   scratch, paste it in and ask Claude to filter/sort it the same way
   rather than generate net-new entries.
3. Run it in Claude Code with the prompt above — Claude Code can read
   `src/data/words.ts` directly to check for duplicates and category fit,
   which is more reliable than pasting the whole file into a plain chat
   prompt.
4. Merge the output into the right `words` arrays in
   `src/data/words.ts`, then run `npx tsc --noEmit` to confirm nothing
   broke.
5. Skim the final additions yourself — the model gets you most of the way,
   but a quick human pass catches audience-specific misses (inside jokes,
   regional references, etc.) that only you'd know to flag.

## Optional tweaks

- Ask for a themed sub-batch (e.g. "50 Boston sports words") and either
  fold them into an existing category or add a new category id/label/emoji
  if the theme is big enough to stand on its own.
- If a category feels short or repetitive during playtesting, point this
  prompt at just that one category with a specific count to top it up.
