// Prompt-building and result-filtering for the "find similar words" admin
// feature: when an admin deactivates a flagged word, we ask the model which
// still-active words in the same category are similar enough that the admin
// probably wants to review them too (near-duplicates, redundant phrasing of
// the same concept, or the same narrow niche). Kept dependency-free and
// framework-agnostic like curation.ts so it can be unit tested directly.

export interface CandidateWord {
  id: string;
  text: string;
}

export function buildSimilarWordsPrompt(
  deactivatedWord: string,
  categoryLabel: string,
  candidates: CandidateWord[]
): string {
  const candidateList = candidates.map((c) => c.text);

  return `An admin just deactivated the word/phrase "${deactivatedWord}" from the
"${categoryLabel}" category of a word-guessing party game's word bank
(Phrase Frenzy — similar to Catchphrase/Heads Up). They deactivated it
because it was flagged as a bad entry: too obscure, ambiguous, hard to
describe out loud, offensive, or a near-duplicate of another word already
in the bank.

Here is the full list of other words still active in that same category:
${JSON.stringify(candidateList)}

Identify which of these words, if any, likely have the SAME problem and
should be flagged for the admin to review as well. Only include a word if
it is a close match to the deactivated one in one of these ways:
- It's a near-duplicate or redundant rephrasing of the same concept (e.g.
  "Pizza" and "Pizza Slice", "Couch" and "Sofa")
- It shares the exact same narrow, obscure, or hard-to-clue quality that
  got the original word deactivated
- It's part of the same specific franchise/brand/reference and shares
  whatever made the original problematic

Do NOT include a word just because it's in the same general category —
being about food, or animals, or movies, is not enough on its own. Be
conservative: an empty list is a perfectly good answer if nothing is a
close match.

Respond with ONLY a JSON array of strings (no markdown fences, no
commentary), using the EXACT text of each match as it appears in the list
above:
["Matching Word One", "Matching Word Two"]`;
}

// Guards against the model returning text that isn't verbatim in the
// candidate list (a paraphrase, a hallucinated word, wrong casing) and
// against it echoing the deactivated word itself back.
export function filterValidSuggestions(
  suggested: string[],
  candidates: CandidateWord[],
  deactivatedWord: string
): CandidateWord[] {
  const byLowerText = new Map(candidates.map((c) => [c.text.trim().toLowerCase(), c]));
  const excluded = deactivatedWord.trim().toLowerCase();

  const seen = new Set<string>();
  const accepted: CandidateWord[] = [];
  for (const raw of suggested) {
    const key = raw.trim().toLowerCase();
    if (!key || key === excluded || seen.has(key)) continue;
    const match = byLowerText.get(key);
    if (!match) continue;
    seen.add(key);
    accepted.push(match);
  }
  return accepted;
}
