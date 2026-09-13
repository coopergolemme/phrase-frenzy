// Prompt-building for the "refine curation guidance" admin feature: reads
// the admin's accumulated Approve/Reject/Deactivate decisions for one
// category and asks the model to write (or revise) a short house-style
// rubric for that category. The rubric is stored per-category and folded
// into every future `generate` prompt (see curation.ts's buildPrompt), so
// it acts as durable, evolving memory of the admin's taste. Kept
// dependency-free and framework-agnostic like curation.ts/similarity.ts so
// it can be unit tested directly.

export interface Decision {
  text: string;
  decision: "approved" | "rejected" | "deactivated";
  reason?: string;
}

function formatDecision(decision: Decision): string {
  const reason = decision.reason?.trim();
  return reason ? `"${decision.text}" (reason: ${reason})` : `"${decision.text}"`;
}

export function buildGuidancePrompt(
  categoryLabel: string,
  existingGuidance: string | null,
  decisions: Decision[]
): string {
  const approved = decisions.filter((d) => d.decision === "approved").map(formatDecision);
  const rejected = decisions.filter((d) => d.decision === "rejected").map(formatDecision);
  const deactivated = decisions.filter((d) => d.decision === "deactivated").map(formatDecision);

  const decisionsBlock = [
    approved.length > 0 ? `APPROVED (kept — these are good examples):\n${approved.join("\n")}` : null,
    rejected.length > 0
      ? `REJECTED during review (not good enough — never made it into the bank):\n${rejected.join("\n")}`
      : null,
    deactivated.length > 0
      ? `DEACTIVATED (were in the bank, later pulled out as bad):\n${deactivated.join("\n")}`
      : null,
  ]
    .filter((block): block is string => block !== null)
    .join("\n\n");

  const existingGuidanceBlock = existingGuidance?.trim()
    ? `Here are your EXISTING house-style notes for this category, written from
earlier decisions:
"${existingGuidance.trim()}"

Revise these notes in light of the new decisions below — keep whatever
still holds up, sharpen or drop anything the new decisions contradict, and
fold in genuinely new patterns. Do not just append to the list or restate
everything from scratch; produce one clean, updated rubric.`
    : `This category has no house-style notes yet. Write a first rubric from
the decisions below.`;

  return `I'm building the word bank for a "hot potato" word-guessing party game
called Phrase Frenzy (similar to Catchphrase/Heads Up). An admin reviews
AI-generated word candidates for the "${categoryLabel}" category and
approves the good ones, rejects the bad ones, and occasionally deactivates
a word that made it into the bank after all but turned out to be a mistake
(sometimes with a stated reason why).

${existingGuidanceBlock}

Decisions to learn from:
${decisionsBlock}

Write a short, concrete rubric (a handful of bullet points, well under 150
words total) describing what specifically makes a word or phrase good vs.
bad for THIS category, based on the actual pattern in these decisions —
not generic word-game advice. Reference the kind of thing that was
approved vs. rejected/deactivated (without necessarily naming every word).
If the decisions don't show a clear pattern beyond basic guessability,
say so briefly rather than inventing rules that aren't supported by the
evidence.

Respond with ONLY a JSON object (no markdown fences, no commentary) of the
shape:
{ "guidance": "your rubric as a single string, using \\n between bullet points" }`;
}
