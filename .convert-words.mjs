import { parse } from "yaml";
import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync("./game_words.yaml", "utf8");
const data = parse(raw);

const LABELS = {
  "catchphrase.easy": ["Easy", "🟢"],
  "catchphrase.medium": ["Medium", "🟡"],
  "catchphrase.hard": ["Hard", "🔴"],
  "catchphrase.animals": ["Animals", "🐘"],
  "catchphrase.food": ["Food", "🍕"],
  "catchphrase.travel": ["Travel", "✈️"],
  "catchphrase.people": ["People", "🧑"],
  "catchphrase.household": ["Household", "🏠"],
  "pictionary.easy": ["Easy", "🟢"],
  "pictionary.medium": ["Medium", "🟡"],
  "pictionary.difficult": ["Difficult", "🟠"],
  "pictionary.hard": ["Hard", "🔴"],
  "pictionary.idioms": ["Idioms", "💬"],
  "pictionary.characters": ["Characters", "🎭"],
  "pictionary.movies": ["Movies", "🎬"],
};

const GROUP_LABELS = {
  catchphrase: "Catchphrase",
  pictionary: "Pictionary",
};

const INCLUDE_GROUPS = ["catchphrase", "pictionary"];

// Fix known mojibake from Windows-1252 hex escapes in the source YAML.
const FIXUPS = {
  "cr\x8Fème brûlée": "crème brûlée",
  "d\x8Ej\x88 vu": "déjà vu",
};

function fixWord(word) {
  return FIXUPS[word] ?? word;
}

const categories = [];
for (const groupKey of INCLUDE_GROUPS) {
  const group = data[groupKey];
  for (const [subKey, words] of Object.entries(group)) {
    const key = `${groupKey}.${subKey}`;
    const [label, emoji] = LABELS[key] ?? [subKey, "🔤"];
    categories.push({
      id: key.replace(".", "-"),
      label,
      emoji,
      group: GROUP_LABELS[groupKey] ?? groupKey,
      words: words.map(fixWord),
    });
  }
}

console.log("Total categories:", categories.length);
for (const c of categories) {
  console.log(`${c.id.padEnd(24)} ${c.words.length.toString().padStart(4)} words  (${c.group})`);
}

function tsStringArray(words) {
  return "[\n" + words.map((w) => `    ${JSON.stringify(w)},`).join("\n") + "\n  ]";
}

const out = `export interface WordCategory {
  id: string;
  label: string;
  emoji: string;
  group: string;
  words: string[];
}

export const WORD_CATEGORIES: WordCategory[] = [
${categories
  .map(
    (c) =>
      `  {\n    id: ${JSON.stringify(c.id)},\n    label: ${JSON.stringify(
        c.label
      )},\n    emoji: ${JSON.stringify(c.emoji)},\n    group: ${JSON.stringify(
        c.group
      )},\n    words: ${tsStringArray(c.words)},\n  },`
  )
  .join("\n")}
];
`;

writeFileSync("./src/data/words.ts", out, "utf8");
console.log("\nWrote src/data/words.ts");
