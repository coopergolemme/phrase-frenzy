# Prompt: Curate the Phrase Frenzy Word List (Mixed 20s/50s Audience)

Use this prompt with Claude (or another LLM) to turn the raw `game-words`
data into a clean, curated word bank for Phrase Frenzy.

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

I'm starting from this raw word list [PASTE GAME-WORDS OUTPUT HERE], and I
want you to help me curate and expand it into a final list of 150-200
entries.

Please do the following:

1. FILTER OUT words/phrases that:
   - Are too obscure, technical, or niche (e.g. jargon, rare trivia)
   - Skew heavily toward only one generation (e.g. very recent internet
     slang/memes that a 50-year-old wouldn't know, OR outdated references
     a 20-something wouldn't recognize)
   - Are offensive, crude, political, or otherwise inappropriate for a
     casual family/friend setting
   - Are branded/copyrighted characters, franchises, or trademarked names
     (to avoid IP issues)
   - Are ambiguous or too hard to act out/describe in a few words (overly
     abstract concepts, multi-word idioms with no concrete image)

2. KEEP words/phrases that are:
   - Common nouns, everyday objects, activities, places, foods, animals
   - Cross-generational pop culture that's stood the test of time (classic
     movies, well-known songs, iconic brands, sports)
   - Easy to describe verbally within 5-10 seconds without saying the word

3. GENERATE additional original words/phrases (aim for enough to reach
   150-200 total after filtering) across these categories, evenly
   distributed:
   - Everyday objects & household items
   - Food & drink
   - Animals
   - Places & travel
   - Actions & activities (sports, hobbies)
   - Classic + modern movies/TV/music (broadly recognizable across decades)
   - Simple idioms or common phrases (visual/concrete, not abstract)

4. Rate each final word's difficulty as Easy, Medium, or Hard based on how
   quickly you'd expect an average mixed-age group to guess it.

5. Output the final list as a JSON array of objects in this exact format:

[
  { "word": "roller coaster", "category": "activities", "difficulty": "easy" },
  { "word": "birthday cake", "category": "food", "difficulty": "easy" }
]

Give me the full JSON array as your final output, ready to paste directly
into a word bank file.
```

---

## How to use it
1. Grab the raw word/category data from `nick-aschenbach/game-words` (or
   whichever source you're pulling from).
2. Paste it into the `[PASTE GAME-WORDS OUTPUT HERE]` placeholder.
3. Run the prompt through Claude — if the source list is long, you can
   split it into a few batches (e.g. 200 words at a time) and merge the
   JSON outputs afterward.
4. Skim the final list yourself for anything that still feels off — the
   model will get you 90% of the way, but a quick human pass catches
   audience-specific misses (inside jokes, regional references, etc.)
   that only you'd know to flag.

## Optional tweaks
- If you want harder rounds for adults-only games, ask for a "Hard mode"
  batch generated the same way, skewed toward Medium/Hard difficulty.
- If you want a themed category (e.g. Boston sports, since you're a big
  fan), add a line to the prompt requesting a dedicated category batch.
