# Word Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `src/data/words.ts` word bank with word categories fetched from a Supabase table at runtime, cached in `localStorage`, with a small bundled seed list as an offline/cold-start fallback.

**Architecture:** A new data layer (`src/data/wordDatabase.ts`) fetches `WordCategory[]` from Supabase via `@supabase/supabase-js` using a read-only anon key. A new hook (`src/hooks/useWordCategories.ts`) wraps that fetch with a `localStorage` cache and a bundled seed fallback, exposing `{ categories, isLoading }`. Every current consumer of the static `WORD_CATEGORIES` export (`useGameState`, `TeamSetupScreen`, `CategoryPickerSheet`) switches to receiving `categories` as data (prop or action field) instead of importing a module-level constant.

**Tech Stack:** React 19, TypeScript, Vite 8, `@supabase/supabase-js` (new), Vitest + `@testing-library/react` + `jsdom` (new — first test tooling in this repo).

**Spec:** `docs/superpowers/specs/2026-08-30-word-database-design.md`

## Global Constraints

- No player accounts/auth — the Supabase anon key is read-only (RLS `select`-only policy for `anon`; no write policy exists for that role).
- The game must remain playable with zero network: cold start with no cache falls back to a bundled seed list (`src/data/seedWords.ts`).
- `localStorage` reads/writes are always wrapped in try/catch and fail silently, matching the existing convention in `src/utils/flaggedWords.ts`.
- A background Supabase fetch failure must never surface a user-facing error or block gameplay — it just means "don't refresh this session."
- Env vars use the `VITE_` prefix for anything shipped to the client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); the seed script's `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `VITE_` and never committed.

---

### Task 1: Test tooling setup (Vitest + Testing Library)

This repo has no test suite yet — every later task in this plan needs a working `npm test` before it can write a real test.

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/setupTests.ts`
- Create: `src/utils/shuffle.test.ts` (smoke test using an existing pure function, to prove the harness works before building on it)

**Interfaces:**
- Produces: `npm test` script that runs Vitest once (CI-style, no watch) and exits non-zero on failure.

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest@4.1.11 @testing-library/react@16.3.3 @testing-library/jest-dom@7.0.1 jsdom@30.0.1
```

- [ ] **Step 2: Add Vitest config to `vite.config.ts`**

Replace the full file contents with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/phrase-frenzy/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
```

- [ ] **Step 3: Create `src/setupTests.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run"
```

(Keep `dev`, `build`, `lint`, `preview` as they are — just add `test` alongside them.)

- [ ] **Step 5: Write a smoke test against the existing `shuffle` utility**

Create `src/utils/shuffle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns an array with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});
```

- [ ] **Step 6: Run the test suite**

Run: `npm test`
Expected: PASS — 2 tests passed, in `src/utils/shuffle.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/setupTests.ts src/utils/shuffle.test.ts
git commit -m "test: add Vitest + Testing Library harness"
```

---

### Task 2: Shared `WordCategory` type and bundled seed fallback

Extracts the type and a trimmed offline word list out of `src/data/words.ts`, without touching any consumer yet (`words.ts` is left in place and still used by every current import — it gets removed in Task 5 once nothing points at it).

**Files:**
- Create: `src/data/wordCategory.ts`
- Create: `src/data/seedWords.ts`
- Test: `src/data/seedWords.test.ts`

**Interfaces:**
- Produces: `WordCategory` interface (`{ id: string; label: string; emoji: string; words: string[] }`), `SEED_WORD_CATEGORIES: WordCategory[]` — both consumed by Task 3 (`wordDatabase.ts`), Task 4 (`useWordCategories.ts`), and Task 5 (all UI consumers).

- [ ] **Step 1: Create the shared type**

`src/data/wordCategory.ts`:

```ts
export interface WordCategory {
  id: string;
  label: string;
  emoji: string;
  words: string[];
}
```

- [ ] **Step 2: Create the seed fallback data**

`src/data/seedWords.ts` — 10 categories (matching the current category set/order), ~20 words each, meant only as an offline safety net, not the full word bank:

```ts
import type { WordCategory } from "./wordCategory";

export const SEED_WORD_CATEGORIES: WordCategory[] = [
  {
    id: "household",
    label: "Household Items",
    emoji: "🏠",
    words: [
      "toothbrush", "toothpaste", "refrigerator", "washing machine", "dryer",
      "vacuum cleaner", "broom", "mop", "dustpan", "sponge",
      "dish soap", "laundry basket", "ironing board", "iron", "hanger",
      "pillow", "pillowcase", "blanket", "quilt", "curtains",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    emoji: "🍕",
    words: [
      "pizza", "hamburger", "hot dog", "French fries", "taco",
      "burrito", "sushi", "spaghetti", "macaroni and cheese", "grilled cheese sandwich",
      "chicken nuggets", "popcorn", "pretzel", "bagel", "donut",
      "pancakes", "waffles", "cereal", "oatmeal", "scrambled eggs",
    ],
  },
  {
    id: "animals",
    label: "Animals",
    emoji: "🐘",
    words: [
      "elephant", "giraffe", "lion", "tiger", "zebra",
      "monkey", "gorilla", "panda", "koala", "kangaroo",
      "penguin", "polar bear", "grizzly bear", "wolf", "fox",
      "deer", "moose", "elk", "bison", "rhinoceros",
    ],
  },
  {
    id: "travel",
    label: "Places & Travel",
    emoji: "✈️",
    words: [
      "Paris", "London", "Rome", "Tokyo", "New York City",
      "Los Angeles", "Las Vegas", "Hawaii", "Disneyland", "the Eiffel Tower",
      "the Statue of Liberty", "the Grand Canyon", "Mount Everest", "the Great Wall of China", "the Great Barrier Reef",
      "Niagara Falls", "the Amazon Rainforest", "the Sahara Desert", "Egypt", "the Pyramids",
    ],
  },
  {
    id: "actions",
    label: "Actions & Activities",
    emoji: "🏃",
    words: [
      "running", "swimming", "dancing", "singing", "jogging",
      "hiking", "riding a bike", "skateboarding", "surfing", "skiing",
      "snowboarding", "ice skating", "roller skating", "bowling", "golf",
      "tennis", "basketball", "baseball", "football", "soccer",
    ],
  },
  {
    id: "movies-tv-music",
    label: "Movies, TV & Music",
    emoji: "🎬",
    words: [
      "Star Wars", "The Wizard of Oz", "Jaws", "Titanic", "The Lion King",
      "Frozen", "Shrek", "Toy Story", "Finding Nemo", "The Incredibles",
      "Up", "Aladdin", "The Little Mermaid", "Beauty and the Beast", "Cinderella",
      "Snow White and the Seven Dwarfs", "Peter Pan", "Pinocchio", "Dumbo", "Bambi",
    ],
  },
  {
    id: "idioms",
    label: "Idioms & Phrases",
    emoji: "💬",
    words: [
      "piece of cake", "raining cats and dogs", "break a leg", "spill the beans", "let the cat out of the bag",
      "bite the bullet", "hit the nail on the head", "cost an arm and a leg", "the ball is in your court", "kick the bucket",
      "when pigs fly", "the early bird gets the worm", "don't cry over spilled milk", "barking up the wrong tree", "beat around the bush",
      "once in a blue moon", "the last straw", "a blessing in disguise", "curiosity killed the cat", "every cloud has a silver lining",
    ],
  },
  {
    id: "famous-people",
    label: "Famous People",
    emoji: "🌟",
    words: [
      "George Washington", "Abraham Lincoln", "Benjamin Franklin", "Thomas Jefferson", "Martin Luther King, Jr.",
      "Rosa Parks", "Amelia Earhart", "Albert Einstein", "Isaac Newton", "Charles Darwin",
      "Leonardo da Vinci", "Michelangelo", "Vincent van Gogh", "Pablo Picasso", "Cleopatra",
      "Julius Caesar", "Napoleon Bonaparte", "Christopher Columbus", "Alexander the Great", "Genghis Khan",
    ],
  },
  {
    id: "brands",
    label: "Brands & Products",
    emoji: "🏷️",
    words: [
      "McDonald's", "Burger King", "Taco Bell", "KFC", "Starbucks",
      "Coca-Cola", "Pepsi", "Nike", "Adidas", "Disney",
      "Netflix", "Google", "Apple", "Amazon", "Instagram",
      "YouTube", "Walmart", "Target", "LEGO", "Barbie",
    ],
  },
  {
    id: "books-authors",
    label: "Books & Authors",
    emoji: "📚",
    words: [
      "Harry Potter", "To Kill a Mockingbird", "The Great Gatsby", "The Lord of the Rings", "The Hobbit",
      "Charlotte's Web", "Where the Wild Things Are", "The Cat in the Hat", "Green Eggs and Ham", "Charlie and the Chocolate Factory",
      "Matilda", "James and the Giant Peach", "The BFG", "Alice in Wonderland", "The Chronicles of Narnia",
      "Winnie the Pooh", "Curious George", "The Very Hungry Caterpillar", "Goodnight Moon", "The Giving Tree",
    ],
  },
];
```

- [ ] **Step 3: Write the failing test**

`src/data/seedWords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SEED_WORD_CATEGORIES } from "./seedWords";

describe("SEED_WORD_CATEGORIES", () => {
  it("has at least one category with at least one word", () => {
    expect(SEED_WORD_CATEGORIES.length).toBeGreaterThan(0);
    for (const category of SEED_WORD_CATEGORIES) {
      expect(category.id.length).toBeGreaterThan(0);
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.words.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate category ids", () => {
    const ids = SEED_WORD_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate words within a category", () => {
    for (const category of SEED_WORD_CATEGORIES) {
      expect(new Set(category.words).size).toBe(category.words.length);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (this is a data-integrity test against real content, not a red/green TDD cycle — it should pass immediately given the data above; if it fails, fix the data, not the test).

- [ ] **Step 5: Commit**

```bash
git add src/data/wordCategory.ts src/data/seedWords.ts src/data/seedWords.test.ts
git commit -m "feat: add WordCategory type and bundled seed word list"
```

---

### Task 3: Supabase schema + `wordDatabase.ts` fetch layer

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/data/wordDatabase.ts`
- Test: `src/data/wordDatabase.test.ts`

**Interfaces:**
- Consumes: `WordCategory` from `src/data/wordCategory.ts` (Task 2).
- Produces: `fetchWordCategories(): Promise<WordCategory[]>`, consumed by Task 4's `useWordCategories` hook.

- [ ] **Step 1: Install the Supabase client**

```bash
npm install @supabase/supabase-js@2.112.4
```

- [ ] **Step 2: Write the schema file**

`supabase/schema.sql` (run manually once in the Supabase SQL editor when setting up the project — not executed by the app or CI):

```sql
create table categories (
  id text primary key,
  label text not null,
  emoji text not null,
  sort_order int not null default 0
);

create table words (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references categories(id) on delete cascade,
  text text not null,
  active boolean not null default true
);

alter table categories enable row level security;
alter table words enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "public read active words" on words
  for select using (active = true);
```

- [ ] **Step 3: Write the failing test for `fetchWordCategories`**

`src/data/wordDatabase.test.ts` — mocks the Supabase client module so no real network call happens:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCategoriesResult = {
  data: [
    { id: "food", label: "Food & Drink", emoji: "🍕", sort_order: 0 },
    { id: "animals", label: "Animals", emoji: "🐘", sort_order: 1 },
  ],
  error: null,
};

const mockWordsResult = {
  data: [
    { id: "1", category_id: "food", text: "pizza", active: true },
    { id: "2", category_id: "food", text: "taco", active: true },
    { id: "3", category_id: "animals", text: "lion", active: true },
  ],
  error: null,
};

function buildQueryChain(result: { data: unknown; error: unknown }) {
  return {
    select: () => ({
      order: () => Promise.resolve(result),
      eq: () => ({
        order: () => Promise.resolve(result),
      }),
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) =>
      table === "categories"
        ? buildQueryChain(mockCategoriesResult)
        : buildQueryChain(mockWordsResult),
  }),
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

describe("fetchWordCategories", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("assembles categories with their words, in sort_order", async () => {
    const { fetchWordCategories } = await import("./wordDatabase");
    const categories = await fetchWordCategories();

    expect(categories).toEqual([
      { id: "food", label: "Food & Drink", emoji: "🍕", words: ["pizza", "taco"] },
      { id: "animals", label: "Animals", emoji: "🐘", words: ["lion"] },
    ]);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with a module-not-found or import error for `./wordDatabase` (it doesn't exist yet).

- [ ] **Step 5: Implement `fetchWordCategories`**

`src/data/wordDatabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { WordCategory } from "./wordCategory";

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

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, anonKey);
}

export async function fetchWordCategories(): Promise<WordCategory[]> {
  const client = getClient();

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client
    .from("words")
    .select("id, category_id, text, active")
    .eq("active", true)
    .order("category_id");
  if (wordError) throw wordError;

  const categories = (categoryRows ?? []) as CategoryRow[];
  const words = (wordRows ?? []) as WordRow[];

  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    emoji: category.emoji,
    words: words.filter((w) => w.category_id === category.id).map((w) => w.text),
  }));
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Add env var placeholders**

Create `.env.example` at the repo root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Confirm `.gitignore` already ignores `.env.local` (it covers this via the existing `*.local` pattern) — no `.gitignore` change needed, but verify: `git check-ignore -v .env.local` should print a match against `*.local` before moving on.

- [ ] **Step 8: Commit**

```bash
git add supabase/schema.sql src/data/wordDatabase.ts src/data/wordDatabase.test.ts .env.example package.json package-lock.json
git commit -m "feat: add Supabase word category fetch layer"
```

---

### Task 4: `localStorage` cache + `useWordCategories` hook

**Files:**
- Create: `src/utils/wordCategoryCache.ts`
- Create: `src/hooks/useWordCategories.ts`
- Test: `src/hooks/useWordCategories.test.ts`

**Interfaces:**
- Consumes: `WordCategory` (Task 2), `fetchWordCategories` (Task 3), `SEED_WORD_CATEGORIES` (Task 2).
- Produces: `useWordCategories(): { categories: WordCategory[]; isLoading: boolean }`, consumed by Task 5 (`App.tsx`).

- [ ] **Step 1: Write the cache util** (no test needed — thin try/catch wrapper matching the existing `flaggedWords.ts` pattern exactly, exercised indirectly by the hook's tests below)

`src/utils/wordCategoryCache.ts`:

```ts
import type { WordCategory } from "../data/wordCategory";

const STORAGE_KEY = "phrase-frenzy:word-categories";

export function getCachedWordCategories(): WordCategory[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as WordCategory[]) : null;
  } catch {
    return null;
  }
}

export function saveCachedWordCategories(categories: WordCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}
```

- [ ] **Step 2: Write the failing tests for `useWordCategories`**

`src/hooks/useWordCategories.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const fetchWordCategoriesMock = vi.fn();

vi.mock("../data/wordDatabase", () => ({
  fetchWordCategories: fetchWordCategoriesMock,
}));

const FETCHED = [{ id: "food", label: "Food", emoji: "🍕", words: ["pizza"] }];
const CACHED = [{ id: "animals", label: "Animals", emoji: "🐘", words: ["lion"] }];

describe("useWordCategories", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchWordCategoriesMock.mockReset();
  });

  it("uses cached categories immediately, then refreshes from the fetch", async () => {
    localStorage.setItem("phrase-frenzy:word-categories", JSON.stringify(CACHED));
    fetchWordCategoriesMock.mockResolvedValue(FETCHED);

    const { useWordCategories } = await import("./useWordCategories");
    const { result } = renderHook(() => useWordCategories());

    expect(result.current.categories).toEqual(CACHED);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => expect(result.current.categories).toEqual(FETCHED));
    expect(JSON.parse(localStorage.getItem("phrase-frenzy:word-categories")!)).toEqual(FETCHED);
  });

  it("falls back to the seed list when there is no cache and the fetch fails", async () => {
    fetchWordCategoriesMock.mockRejectedValue(new Error("network down"));

    const { useWordCategories } = await import("./useWordCategories");
    const { SEED_WORD_CATEGORIES } = await import("../data/seedWords");
    const { result } = renderHook(() => useWordCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual(SEED_WORD_CATEGORIES);
  });

  it("keeps showing cached categories if the background fetch fails", async () => {
    localStorage.setItem("phrase-frenzy:word-categories", JSON.stringify(CACHED));
    fetchWordCategoriesMock.mockRejectedValue(new Error("network down"));

    const { useWordCategories } = await import("./useWordCategories");
    const { result } = renderHook(() => useWordCategories());

    expect(result.current.categories).toEqual(CACHED);
    await waitFor(() => expect(fetchWordCategoriesMock).toHaveBeenCalled());
    expect(result.current.categories).toEqual(CACHED);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with a module-not-found error for `./useWordCategories`.

- [ ] **Step 4: Implement the hook**

`src/hooks/useWordCategories.ts`:

```ts
import { useEffect, useState } from "react";
import type { WordCategory } from "../data/wordCategory";
import { fetchWordCategories } from "../data/wordDatabase";
import { SEED_WORD_CATEGORIES } from "../data/seedWords";
import { getCachedWordCategories, saveCachedWordCategories } from "../utils/wordCategoryCache";

export function useWordCategories() {
  const [categories, setCategories] = useState<WordCategory[]>(
    () => getCachedWordCategories() ?? []
  );
  const [isLoading, setIsLoading] = useState(categories.length === 0);

  useEffect(() => {
    let cancelled = false;

    fetchWordCategories()
      .then((fetched) => {
        if (cancelled) return;
        setCategories(fetched);
        saveCachedWordCategories(fetched);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories((current) => (current.length > 0 ? current : SEED_WORD_CATEGORIES));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { categories, isLoading };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all 3 `useWordCategories` tests plus prior tests from Tasks 1-3 still pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/wordCategoryCache.ts src/hooks/useWordCategories.ts src/hooks/useWordCategories.test.ts
git commit -m "feat: add useWordCategories hook with cache and seed fallback"
```

---

### Task 5: Wire categories through the app; remove `src/data/words.ts`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/useGameState.ts`
- Modify: `src/components/TeamSetupScreen.tsx`
- Modify: `src/components/CategoryPickerSheet.tsx`
- Modify: `src/styles/screens.css` (loading state)
- Delete: `src/data/words.ts`

**Interfaces:**
- Consumes: `useWordCategories` (Task 4), `WordCategory` (Task 2).
- Produces: `useGameState()`'s `startTournament` now takes `categories: WordCategory[]` as its final argument; `TeamSetupScreenProps` and `CategoryPickerSheetProps` gain a `categories: WordCategory[]` prop.

- [ ] **Step 1: Update `useGameState.ts`**

Remove the `WORD_CATEGORIES` import and switch `START_TOURNAMENT` to take categories as action data instead of reading a module-level constant:

Replace:
```ts
import { useReducer } from "react";
import { WORD_CATEGORIES } from "../data/words";
import { shuffle } from "../utils/shuffle";
```
with:
```ts
import { useReducer } from "react";
import type { WordCategory } from "../data/wordCategory";
import { shuffle } from "../utils/shuffle";
```

Replace the `GameAction` union's `START_TOURNAMENT` member:
```ts
  | {
      type: "START_TOURNAMENT";
      teamNames: string[];
      teamMembers: string[][];
      roundsPerTeam: number;
      categoryIds: string[];
      flaggedWords: string[];
    }
```
with:
```ts
  | {
      type: "START_TOURNAMENT";
      teamNames: string[];
      teamMembers: string[][];
      roundsPerTeam: number;
      categoryIds: string[];
      flaggedWords: string[];
      categories: WordCategory[];
    }
```

Replace `initialState`'s two `WORD_CATEGORIES`-derived fields:
```ts
  categoryIds: WORD_CATEGORIES.map((c) => c.id),
  wordBank: WORD_CATEGORIES.flatMap((c) => c.words),
```
with:
```ts
  categoryIds: [],
  wordBank: [],
```
(These are placeholders only — every real value is set by `START_TOURNAMENT`, which now always runs before any word is drawn.)

In the `START_TOURNAMENT` case, replace:
```ts
      const selectedCategories = WORD_CATEGORIES.filter((c) =>
        action.categoryIds.includes(c.id)
      );
      const flaggedSet = new Set(action.flaggedWords);
      const wordBank = Array.from(
        new Set(
          (selectedCategories.length > 0 ? selectedCategories : WORD_CATEGORIES).flatMap(
            (c) => c.words
          )
        )
      ).filter((word) => !flaggedSet.has(word.toLowerCase()));
```
with:
```ts
      const selectedCategories = action.categories.filter((c) =>
        action.categoryIds.includes(c.id)
      );
      const flaggedSet = new Set(action.flaggedWords);
      const wordBank = Array.from(
        new Set(
          (selectedCategories.length > 0 ? selectedCategories : action.categories).flatMap(
            (c) => c.words
          )
        )
      ).filter((word) => !flaggedSet.has(word.toLowerCase()));
```

Update the `startTournament` callback returned from `useGameState()` to accept and forward `categories`:
```ts
    startTournament: (
      teamNames: string[],
      teamMembers: string[][],
      roundsPerTeam: number,
      categoryIds: string[],
      flaggedWords: string[],
      categories: WordCategory[]
    ) =>
      dispatch({
        type: "START_TOURNAMENT",
        teamNames,
        teamMembers,
        roundsPerTeam,
        categoryIds,
        flaggedWords,
        categories,
      }),
```

- [ ] **Step 2: Update `CategoryPickerSheet.tsx`**

Replace:
```ts
import { WORD_CATEGORIES } from "../data/words";

const ALL_CATEGORY_IDS = WORD_CATEGORIES.map((c) => c.id);

interface CategoryPickerSheetProps {
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  categoryIds,
  onToggleCategory,
  onSelectAll,
  onClose,
}: CategoryPickerSheetProps) {
  const allSelected = categoryIds.length === ALL_CATEGORY_IDS.length;
```
with:
```ts
import type { WordCategory } from "../data/wordCategory";

interface CategoryPickerSheetProps {
  categories: WordCategory[];
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  categories,
  categoryIds,
  onToggleCategory,
  onSelectAll,
  onClose,
}: CategoryPickerSheetProps) {
  const allSelected = categoryIds.length === categories.length;
```

Replace `{WORD_CATEGORIES.map((category) => {` with `{categories.map((category) => {`.

- [ ] **Step 3: Update `TeamSetupScreen.tsx`**

Replace:
```ts
import { useState } from "react";
import { WORD_CATEGORIES } from "../data/words";
import { CategoryPickerSheet } from "./CategoryPickerSheet";
```
with:
```ts
import { useMemo, useState } from "react";
import type { WordCategory } from "../data/wordCategory";
import { CategoryPickerSheet } from "./CategoryPickerSheet";
```

Remove the module-level `const ALL_CATEGORY_IDS = WORD_CATEGORIES.map((c) => c.id);` line entirely.

Replace the props interface:
```ts
interface TeamSetupScreenProps {
  onStart: (
    teamNames: string[],
    teamMembers: string[][],
    roundsPerTeam: number,
    categoryIds: string[],
    roundDurationSec: number
  ) => void;
}

export function TeamSetupScreen({ onStart }: TeamSetupScreenProps) {
```
with:
```ts
interface TeamSetupScreenProps {
  categories: WordCategory[];
  onStart: (
    teamNames: string[],
    teamMembers: string[][],
    roundsPerTeam: number,
    categoryIds: string[],
    roundDurationSec: number
  ) => void;
}

export function TeamSetupScreen({ categories, onStart }: TeamSetupScreenProps) {
  const allCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
```

Replace the `useState<string[]>(ALL_CATEGORY_IDS)` initializer:
```ts
  const [categoryIds, setCategoryIds] = useState<string[]>(ALL_CATEGORY_IDS);
```
with:
```ts
  const [categoryIds, setCategoryIds] = useState<string[]>(allCategoryIds);
```

Replace the two remaining `ALL_CATEGORY_IDS` references:
```ts
  const allSelected = categoryIds.length === ALL_CATEGORY_IDS.length;
```
with:
```ts
  const allSelected = categoryIds.length === allCategoryIds.length;
```
and
```ts
  const selectAllCategories = () => {
    setCategoryIds(ALL_CATEGORY_IDS);
  };
```
with:
```ts
  const selectAllCategories = () => {
    setCategoryIds(allCategoryIds);
  };
```

Pass `categories` through to `CategoryPickerSheet`:
```ts
      {isPickingCategories && (
        <CategoryPickerSheet
          categoryIds={categoryIds}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setIsPickingCategories(false)}
        />
      )}
```
becomes:
```ts
      {isPickingCategories && (
        <CategoryPickerSheet
          categories={categories}
          categoryIds={categoryIds}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setIsPickingCategories(false)}
        />
      )}
```

- [ ] **Step 4: Update `App.tsx`**

Add the import and hook call:
```ts
import { useWordCategories } from "./hooks/useWordCategories";
```
placed alongside the other hook imports.

Inside `App()`, add near the top (after the `useGameState()` destructure):
```ts
  const { categories, isLoading: isLoadingCategories } = useWordCategories();
```

Update `handleStartTournament` to forward `categories` to `startTournament`:
```ts
  const handleStartTournament = useCallback(
    (
      teamNames: string[],
      teamMembers: string[][],
      roundsPerTeam: number,
      categoryIds: string[],
      roundDuration: number
    ) => {
      setRoundDurationSec(roundDuration);
      startTournament(teamNames, teamMembers, roundsPerTeam, categoryIds, flaggedWords, categories);
    },
    [startTournament, flaggedWords, categories]
  );
```

Pass `categories` to `TeamSetupScreen`:
```ts
        {state.gameStatus === "teamSetup" && (
          <TeamSetupScreen categories={categories} onStart={handleStartTournament} />
        )}
```

Add a cold-start loading guard right before the `return (` in `App()`:
```ts
  if (categories.length === 0 && isLoadingCategories) {
    return (
      <div className="app-shell">
        <div className="screen-container">
          <p className="loading-text">Loading word bank…</p>
        </div>
      </div>
    );
  }

```

- [ ] **Step 5: Add the loading state style**

In `src/styles/screens.css`, add:

```css
.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 6: Delete `src/data/words.ts`**

```bash
rm src/data/words.ts
```

- [ ] **Step 7: Verify the build and tests**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (confirms no remaining import of `../data/words` anywhere).

Run: `npm test`
Expected: PASS — all tests from Tasks 1-4 still pass (nothing in this task changes tested behavior, only wiring).

- [ ] **Step 8: Manually verify in the dev server**

Run: `npm run dev`, open the app, and confirm:
- The home screen loads (using seed data, since no `.env.local` exists yet at this point in the plan).
- Team setup shows the seed categories in the category picker.
- A full game can be started and played to completion.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: load word categories from useWordCategories instead of hardcoded words.ts"
```

---

### Task 6: Supabase seed migration script

**Files:**
- Create: `scripts/seed-supabase.ts`
- Modify: `package.json` (add a `seed:supabase` script and `tsx` dev dependency to run it)

This task requires the user to have already created a Supabase project and populated `.env.local` with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` plus a `SUPABASE_SERVICE_ROLE_KEY` (service-role key is only ever used here, script-side, never shipped to the client). The script reads word data from git history (the last commit containing `src/data/words.ts`, deleted in Task 5) rather than the working tree, since by this point the file no longer exists on disk.

**Interfaces:**
- Consumes: the `categories`/`words` schema from Task 3's `supabase/schema.sql`.
- Produces: a one-off, manually-run script — nothing else in the app depends on it.

- [ ] **Step 1: Install `tsx` to run the script**

```bash
npm install -D tsx@latest
```

- [ ] **Step 2: Export the pre-deletion `words.ts` content to a temp file for the script to read**

```bash
git show HEAD~1:src/data/words.ts > /tmp/legacy-words.ts
```

(`HEAD~1` is the commit from Task 5 that deleted the file — adjust if other commits landed in between.)

- [ ] **Step 3: Write the seed script**

`scripts/seed-supabase.ts`:

```ts
// One-off migration: populates the Supabase categories/words tables from the
// legacy hardcoded word list. Run manually, once, after creating the
// Supabase project and applying supabase/schema.sql. Not run by the app or CI.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts /tmp/legacy-words.ts
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

interface LegacyCategory {
  id: string;
  label: string;
  emoji: string;
  words: string[];
}

function parseLegacyCategories(filePath: string): LegacyCategory[] {
  const source = readFileSync(filePath, "utf-8");
  const match = source.match(/export const WORD_CATEGORIES: WordCategory\[\] = (\[[\s\S]*\]);/);
  if (!match) {
    throw new Error("Could not find WORD_CATEGORIES array in " + filePath);
  }
  // eslint-disable-next-line no-eval
  return eval(match[1]) as LegacyCategory[];
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
  const categories = parseLegacyCategories(filePath);

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
```

- [ ] **Step 4: Add the run script to `package.json`**

```json
"seed:supabase": "tsx scripts/seed-supabase.ts"
```

- [ ] **Step 5: Run it against the real Supabase project**

```bash
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> npm run seed:supabase -- /tmp/legacy-words.ts
```

Expected: console output logs a seeded count per category, ending in "Done."; verify row counts in the Supabase Table Editor match the 10 categories / ~1500 words from the original `words.ts`.

- [ ] **Step 6: Verify the live app now reads from Supabase**

With `.env.local` populated with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, run `npm run dev` and confirm the category picker now shows the full word bank (not just the ~20-word seed list), and a full game plays correctly.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-supabase.ts package.json package-lock.json
git commit -m "chore: add one-off Supabase seed migration script"
```
