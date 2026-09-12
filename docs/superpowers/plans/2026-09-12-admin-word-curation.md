# Admin Word Curation View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-gated `#admin` view to the deployed PWA where words can be generated with Gemini, reviewed, edited, and individually approved/rejected — backed by a new Supabase Edge Function that holds the secrets currently only usable from local CLI scripts.

**Architecture:** A Deno Supabase Edge Function (`supabase/functions/admin-words`) owns `GEMINI_API_KEY`, `ADMIN_PASSWORD`, and the service-role DB access, exposing one `action`-routed endpoint. A new `AdminScreen` React tree, reached via `window.location.hash === "#admin"` in `main.tsx` (bypassing `App.tsx`/the game state machine entirely), talks to it through a thin `adminApi.ts` fetch wrapper.

**Tech Stack:** Deno (Supabase Edge Runtime), `@supabase/supabase-js` (via `esm.sh` in the edge function, already a dependency for the client), React 19, Vitest + Testing Library (existing project setup).

**Spec:** `docs/superpowers/specs/2026-09-12-admin-word-curation-design.md`

## Global Constraints

- Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`) must never appear in client-bundled code or a `VITE_`-prefixed env var.
- The admin route (`#admin`) must not be linked from any nav/menu — direct URL only.
- No bulk approve/reject-all, no rate-limiting on the password — explicitly out of scope per spec.
- `scripts/curate-words.ts` / `scripts/activate-words.ts` stay as-is; this plan does not modify them.
- Match existing code style: explicit types on exported functions, no `any`, no mutation of props/state (spread-copy updates), files stay focused/small.

---

## File Structure

**New files:**
- `supabase/functions/admin-words/curation.ts` — prompt-building + dedupe logic, framework-agnostic (imported by both the Deno function and its Vitest test)
- `supabase/functions/admin-words/curation.test.ts` — Vitest tests for the above
- `supabase/functions/admin-words/gemini.ts` — `callGeminiForWords`, a thin `fetch` wrapper around the Gemini REST API
- `supabase/functions/admin-words/gemini.test.ts` — Vitest tests for the above
- `supabase/functions/admin-words/index.ts` — Deno edge function entrypoint: CORS, password check, action routing, Supabase reads/writes
- `src/utils/adminApi.ts` — client fetch wrapper for the edge function
- `src/utils/adminApi.test.ts` — Vitest tests for the above
- `src/components/AdminReviewQueue.tsx` — pending-words list grouped by category, with inline edit/approve/reject
- `src/components/AdminReviewQueue.test.tsx` — Testing Library tests for the above
- `src/components/AdminGenerateForm.tsx` — category + count + Generate button
- `src/components/AdminScreen.tsx` — password gate, owns pending-words state, wires the two components above
- `src/components/AdminScreen.test.tsx` — Testing Library tests for the password gate

**Modified files:**
- `src/main.tsx` — render `AdminScreen` instead of `App` when `location.hash === "#admin"`
- `src/styles/screens.css` — admin layout classes
- `README.md` — short "Admin word curation" section with deploy/usage steps

---

### Task 1: Curation logic module (prompt building + dedupe)

**Files:**
- Create: `supabase/functions/admin-words/curation.ts`
- Test: `supabase/functions/admin-words/curation.test.ts`

**Interfaces:**
- Produces: `CategoryRow { id: string; label: string; emoji: string; sort_order: number }`, `WordRow { category_id: string; text: string }`, `GeneratedBatch { categoryId: string; words: string[] }`, `CURATION_RULES: string`, `buildPrompt(categories: CategoryRow[], existingWordsByCategory: Map<string, string[]>, count: number): string`, `dedupeAgainstExisting(batches: GeneratedBatch[], categoryIds: Set<string>, existingWordsByCategory: Map<string, Set<string>>): Map<string, string[]>` — consumed by Task 3 (`index.ts`).

- [ ] **Step 1: Write the failing tests**

```typescript
// supabase/functions/admin-words/curation.test.ts
import { describe, expect, it } from "vitest";
import { buildPrompt, dedupeAgainstExisting, type CategoryRow, type GeneratedBatch } from "./curation";

describe("buildPrompt", () => {
  it("includes each category's id, label, and existing words as JSON", () => {
    const categories: CategoryRow[] = [
      { id: "food", label: "Food", emoji: "🍕", sort_order: 0 },
    ];
    const existing = new Map([["food", ["pizza", "taco"]]]);

    const prompt = buildPrompt(categories, existing, 10);

    expect(prompt).toContain('id: "food"');
    expect(prompt).toContain('label: "Food"');
    expect(prompt).toContain(JSON.stringify(["pizza", "taco"]));
    expect(prompt).toContain("Generate 10 additional");
  });

  it("uses an empty existing-words array for categories with no words yet", () => {
    const categories: CategoryRow[] = [
      { id: "animals", label: "Animals", emoji: "🐘", sort_order: 0 },
    ];

    const prompt = buildPrompt(categories, new Map(), 5);

    expect(prompt).toContain("existing words: []");
  });
});

describe("dedupeAgainstExisting", () => {
  const categoryIds = new Set(["food", "animals"]);

  it("drops words that already exist in that category, case-insensitively", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["Pizza", "Sushi"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, categoryIds, existing);

    expect(result.get("food")).toEqual(["Sushi"]);
  });

  it("drops duplicate words within the same generated run", () => {
    const batches: GeneratedBatch[] = [
      { categoryId: "food", words: ["Sushi", "sushi", "Ramen"] },
    ];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.get("food")).toEqual(["Sushi", "Ramen"]);
  });

  it("ignores batches for unknown category ids", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "not-real", words: ["Ghost"] }];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.has("not-real")).toBe(false);
  });

  it("trims whitespace and drops empty entries", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["  Tacos  ", "   ", ""] }];

    const result = dedupeAgainstExisting(batches, categoryIds, new Map());

    expect(result.get("food")).toEqual(["Tacos"]);
  });

  it("omits categories with no accepted words", () => {
    const batches: GeneratedBatch[] = [{ categoryId: "food", words: ["pizza"] }];
    const existing = new Map([["food", new Set(["pizza"])]]);

    const result = dedupeAgainstExisting(batches, categoryIds, existing);

    expect(result.has("food")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/admin-words/curation.test.ts`
Expected: FAIL — `curation.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// supabase/functions/admin-words/curation.ts
//
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

export function buildPrompt(
  categories: CategoryRow[],
  existingWordsByCategory: Map<string, string[]>,
  count: number
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/admin-words/curation.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin-words/curation.ts supabase/functions/admin-words/curation.test.ts
git commit -m "feat: add admin-words curation prompt/dedupe logic"
```

---

### Task 2: Gemini fetch wrapper

**Files:**
- Create: `supabase/functions/admin-words/gemini.ts`
- Test: `supabase/functions/admin-words/gemini.test.ts`

**Interfaces:**
- Consumes: `GeneratedBatch` from `./curation.ts` (Task 1)
- Produces: `callGeminiForWords(prompt: string, apiKey: string, fetchImpl?: typeof fetch): Promise<GeneratedBatch[]>` — consumed by Task 3 (`index.ts`)

- [ ] **Step 1: Write the failing tests**

```typescript
// supabase/functions/admin-words/gemini.test.ts
import { describe, expect, it, vi } from "vitest";
import { callGeminiForWords } from "./gemini";

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
    text: async () => JSON.stringify(response.jsonBody),
  } as Response);
}

describe("callGeminiForWords", () => {
  it("parses the JSON array out of candidates[0].content.parts[0].text", async () => {
    const batches = [{ categoryId: "food", words: ["Pizza"] }];
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify(batches) }] } }] },
    });

    const result = await callGeminiForWords("prompt text", "test-key", fetchImpl);

    expect(result).toEqual(batches);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("generateContent"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-goog-api-key": "test-key" }),
      })
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 500, jsonBody: { error: "boom" } });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/500/);
  });

  it("throws when the response has no text content", async () => {
    const fetchImpl = mockFetch({ jsonBody: { candidates: [] } });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/no text/i);
  });

  it("throws when the parsed text is not a JSON array", async () => {
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify({ not: "an array" }) }] } }] },
    });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/JSON array/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/admin-words/gemini.test.ts`
Expected: FAIL — `gemini.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// supabase/functions/admin-words/gemini.ts
import type { GeneratedBatch } from "./curation.ts";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export async function callGeminiForWords(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<GeneratedBatch[]> {
  const response = await fetchImpl(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response had no text content");
  }

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }
  return parsed as GeneratedBatch[];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/admin-words/gemini.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin-words/gemini.ts supabase/functions/admin-words/gemini.test.ts
git commit -m "feat: add Gemini fetch wrapper for admin-words function"
```

---

### Task 3: Edge function entrypoint (`index.ts`)

**Files:**
- Create: `supabase/functions/admin-words/index.ts`

**Interfaces:**
- Consumes: `buildPrompt`, `dedupeAgainstExisting`, `CategoryRow`, `WordRow` from `./curation.ts` (Task 1); `callGeminiForWords` from `./gemini.ts` (Task 2)
- Produces (HTTP JSON contract, consumed by Task 4 `src/utils/adminApi.ts`):
  - `POST` body `{ action: "list-pending" }` → `200 { pending: PendingWordDto[] }`
  - `POST` body `{ action: "generate", categoryId?: string, count: number }` → `200 { inserted: PendingWordDto[] }`
  - `POST` body `{ action: "approve", ids: string[] }` → `200 { approved: string[] }`
  - `POST` body `{ action: "reject", ids: string[] }` → `200 { rejected: string[] }`
  - `POST` body `{ action: "edit", id: string, text: string }` → `200 { id: string, text: string }`
  - Any action, missing/wrong `x-admin-password` header → `401 { error: string }`
  - Unknown action / bad input → `400 { error: string }`
  - Thrown error during handling → `500 { error: string }`
  - `PendingWordDto = { id: string; categoryId: string; categoryLabel: string; text: string }`

This file has no automated test (no local Deno test runner available — see plan header). It is verified manually after deployment in Task 11.

- [ ] **Step 1: Write the implementation**

```typescript
// supabase/functions/admin-words/index.ts
//
// Password-gated admin endpoint for generating, reviewing, and
// approving/rejecting candidate words before they go live in the game.
// Deployed as a Supabase Edge Function; holds SUPABASE_SERVICE_ROLE_KEY
// (auto-injected by the Edge Runtime), GEMINI_API_KEY, and ADMIN_PASSWORD
// as function secrets — none of these ever reach the client bundle. See
// docs/superpowers/specs/2026-09-12-admin-word-curation-design.md.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPrompt, dedupeAgainstExisting, type CategoryRow, type WordRow } from "./curation.ts";
import { callGeminiForWords } from "./gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-password",
};

interface PendingWordDto {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPassword || req.headers.get("x-admin-password") !== adminPassword) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { action?: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (body.action) {
      case "list-pending":
        return json({ pending: await listPending(client) });
      case "generate":
        return json({
          inserted: await generate(client, body.categoryId as string | undefined, body.count as number),
        });
      case "approve": {
        const ids = body.ids as string[];
        const { error } = await client.from("words").update({ active: true }).in("id", ids);
        if (error) throw error;
        return json({ approved: ids });
      }
      case "reject": {
        const ids = body.ids as string[];
        const { error } = await client.from("words").delete().in("id", ids);
        if (error) throw error;
        return json({ rejected: ids });
      }
      case "edit": {
        const id = body.id as string;
        const text = body.text as string;
        const { error } = await client.from("words").update({ text }).eq("id", id).eq("active", false);
        if (error) throw error;
        return json({ id, text });
      }
      default:
        return json({ error: `Unknown action "${body.action}"` }, 400);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

async function categoryLabelMap(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from("categories").select("id, label");
  if (error) throw error;
  return new Map((data ?? []).map((c: { id: string; label: string }) => [c.id, c.label]));
}

async function listPending(client: SupabaseClient): Promise<PendingWordDto[]> {
  const [wordsResult, labels] = await Promise.all([
    client.from("words").select("id, category_id, text").eq("active", false).order("category_id"),
    categoryLabelMap(client),
  ]);
  if (wordsResult.error) throw wordsResult.error;

  return (wordsResult.data ?? []).map((row: { id: string; category_id: string; text: string }) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryLabel: labels.get(row.category_id) ?? row.category_id,
    text: row.text,
  }));
}

async function generate(
  client: SupabaseClient,
  categoryId: string | undefined,
  count: number
): Promise<PendingWordDto[]> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client.from("words").select("category_id, text");
  if (wordError) throw wordError;

  const allCategories = (categoryRows ?? []) as CategoryRow[];
  const categories = categoryId ? allCategories.filter((c) => c.id === categoryId) : allCategories;
  if (categories.length === 0) {
    throw new Error(categoryId ? `Unknown category id "${categoryId}"` : "No categories found");
  }

  const existingWordsByCategory = new Map<string, string[]>();
  const existingWordSetByCategory = new Map<string, Set<string>>();
  for (const row of (wordRows ?? []) as WordRow[]) {
    const list = existingWordsByCategory.get(row.category_id) ?? [];
    list.push(row.text);
    existingWordsByCategory.set(row.category_id, list);

    const set = existingWordSetByCategory.get(row.category_id) ?? new Set();
    set.add(row.text.toLowerCase());
    existingWordSetByCategory.set(row.category_id, set);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildPrompt(categories, existingWordsByCategory, count);
  const rawBatches = await callGeminiForWords(prompt, apiKey);
  const accepted = dedupeAgainstExisting(
    rawBatches,
    new Set(categories.map((c) => c.id)),
    existingWordSetByCategory
  );

  const rows = [...accepted.entries()].flatMap(([catId, words]) =>
    words.map((text) => ({ category_id: catId, text, active: false }))
  );
  if (rows.length === 0) return [];

  const { data: inserted, error: insertError } = await client
    .from("words")
    .insert(rows)
    .select("id, category_id, text");
  if (insertError) throw insertError;

  const labels = await categoryLabelMap(client);
  return (inserted ?? []).map((row: { id: string; category_id: string; text: string }) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryLabel: labels.get(row.category_id) ?? row.category_id,
    text: row.text,
  }));
}
```

- [ ] **Step 2: Confirm the app's type-check is unaffected**

Run: `npx tsc -b`
Expected: PASS with no new errors. `tsconfig.app.json` has `"include": ["src"]` and `tsconfig.node.json` has `"include": ["vite.config.ts"]`, so `supabase/functions/**` (Deno code, not valid under the app's Node/bundler `tsconfig`) is never part of this build — no config changes needed.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/admin-words/index.ts
git commit -m "feat: add admin-words edge function entrypoint"
```

---

### Task 4: Client `adminApi` fetch wrapper

**Files:**
- Create: `src/utils/adminApi.ts`
- Test: `src/utils/adminApi.test.ts`

**Interfaces:**
- Produces: `PendingWord { id: string; categoryId: string; categoryLabel: string; text: string }`, `AdminApiError extends Error` (has `.status: number`), `listPendingWords(password: string): Promise<PendingWord[]>`, `generateWords(password: string, categoryId: string | undefined, count: number): Promise<PendingWord[]>`, `approveWords(password: string, ids: string[]): Promise<void>`, `rejectWords(password: string, ids: string[]): Promise<void>`, `editWord(password: string, id: string, text: string): Promise<void>` — consumed by Task 7 (`AdminScreen.tsx`).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/utils/adminApi.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, approveWords, generateWords, listPendingWords } from "./adminApi";

const PENDING = [{ id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" }];

function mockFetch(status: number, jsonBody: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => jsonBody,
  } as Response);
}

describe("adminApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listPendingWords sends the password header and returns pending words", async () => {
    const fetchMock = mockFetch(200, { pending: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listPendingWords("secret");

    expect(result).toEqual(PENDING);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/admin-words");
    expect(init.headers["x-admin-password"]).toBe("secret");
    expect(JSON.parse(init.body)).toEqual({ action: "list-pending" });
  });

  it("generateWords sends categoryId and count in the body", async () => {
    const fetchMock = mockFetch(200, { inserted: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWords("secret", "food", 20);

    expect(result).toEqual(PENDING);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "generate", categoryId: "food", count: 20 });
  });

  it("approveWords resolves with no value on success", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { approved: ["1"] }));

    await expect(approveWords("secret", ["1"])).resolves.toBeUndefined();
  });

  it("throws AdminApiError with the response status and server message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Unauthorized" }));

    await expect(listPendingWords("wrong")).rejects.toMatchObject({
      name: "AdminApiError",
      status: 401,
      message: "Unauthorized",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/adminApi.test.ts`
Expected: FAIL — `adminApi.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// src/utils/adminApi.ts
//
// Client for the admin-words Supabase Edge Function. Sends the shared
// admin password as a header on every call; the function itself is the
// only place that holds the real secrets (Gemini key, service-role key).
export interface PendingWord {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
}

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

type Action = "list-pending" | "generate" | "approve" | "reject" | "edit";

async function callAdminWords<T>(
  action: Action,
  payload: Record<string, unknown>,
  password: string
): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/functions/v1/admin-words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-admin-password": password,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new AdminApiError(data.error ?? "Request failed", response.status);
  }
  return data as T;
}

export async function listPendingWords(password: string): Promise<PendingWord[]> {
  const { pending } = await callAdminWords<{ pending: PendingWord[] }>("list-pending", {}, password);
  return pending;
}

export async function generateWords(
  password: string,
  categoryId: string | undefined,
  count: number
): Promise<PendingWord[]> {
  const { inserted } = await callAdminWords<{ inserted: PendingWord[] }>(
    "generate",
    { categoryId, count },
    password
  );
  return inserted;
}

export async function approveWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("approve", { ids }, password);
}

export async function rejectWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("reject", { ids }, password);
}

export async function editWord(password: string, id: string, text: string): Promise<void> {
  await callAdminWords("edit", { id, text }, password);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/adminApi.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/adminApi.ts src/utils/adminApi.test.ts
git commit -m "feat: add client wrapper for the admin-words edge function"
```

---

### Task 5: `AdminReviewQueue` component

**Files:**
- Create: `src/components/AdminReviewQueue.tsx`
- Test: `src/components/AdminReviewQueue.test.tsx`

**Interfaces:**
- Consumes: `PendingWord` from `../utils/adminApi` (Task 4)
- Produces: `AdminReviewQueue({ pendingWords, onApprove, onReject, onEditSave }: { pendingWords: PendingWord[]; onApprove: (id: string) => void; onReject: (id: string) => void; onEditSave: (id: string, text: string) => void }): JSX.Element` — consumed by Task 7 (`AdminScreen.tsx`)

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/AdminReviewQueue.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminReviewQueue } from "./AdminReviewQueue";
import type { PendingWord } from "../utils/adminApi";

const WORDS: PendingWord[] = [
  { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
  { id: "2", categoryId: "animals", categoryLabel: "Animals", text: "Lion" },
];

describe("AdminReviewQueue", () => {
  it("shows an empty state when there are no pending words", () => {
    render(
      <AdminReviewQueue pendingWords={[]} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={vi.fn()} />
    );

    expect(screen.getByText(/no pending words/i)).toBeInTheDocument();
  });

  it("groups words by category and renders each word's text", () => {
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={vi.fn()} />
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Animals")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taco")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lion")).toBeInTheDocument();
  });

  it("calls onApprove and onReject with the word's id", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={onApprove} onReject={onReject} onEditSave={vi.fn()} />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /approve/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /reject/i })[1]);

    expect(onApprove).toHaveBeenCalledWith("1");
    expect(onReject).toHaveBeenCalledWith("2");
  });

  it("calls onEditSave with the trimmed new text when the input loses focus after a change", () => {
    const onEditSave = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={onEditSave} />
    );

    const input = screen.getByDisplayValue("Taco");
    fireEvent.change(input, { target: { value: "  Burrito  " } });
    fireEvent.blur(input);

    expect(onEditSave).toHaveBeenCalledWith("1", "Burrito");
  });

  it("does not call onEditSave when the text is blurred unchanged", () => {
    const onEditSave = vi.fn();
    render(
      <AdminReviewQueue pendingWords={WORDS} onApprove={vi.fn()} onReject={vi.fn()} onEditSave={onEditSave} />
    );

    fireEvent.blur(screen.getByDisplayValue("Taco"));

    expect(onEditSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AdminReviewQueue.test.tsx`
Expected: FAIL — `AdminReviewQueue.tsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/AdminReviewQueue.tsx
import { useState } from "react";
import type { PendingWord } from "../utils/adminApi";

interface AdminReviewQueueProps {
  pendingWords: PendingWord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEditSave: (id: string, text: string) => void;
}

export function AdminReviewQueue({
  pendingWords,
  onApprove,
  onReject,
  onEditSave,
}: AdminReviewQueueProps) {
  if (pendingWords.length === 0) {
    return <p className="admin__empty">No pending words.</p>;
  }

  const byCategory = new Map<string, PendingWord[]>();
  for (const word of pendingWords) {
    const list = byCategory.get(word.categoryLabel) ?? [];
    byCategory.set(word.categoryLabel, [...list, word]);
  }

  return (
    <div className="admin__queue">
      {[...byCategory.entries()].map(([label, words]) => (
        <section key={label} className="admin__queue-group">
          <h3>{label}</h3>
          {words.map((word) => (
            <AdminReviewRow
              key={word.id}
              word={word}
              onApprove={onApprove}
              onReject={onReject}
              onEditSave={onEditSave}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

interface AdminReviewRowProps {
  word: PendingWord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEditSave: (id: string, text: string) => void;
}

function AdminReviewRow({ word, onApprove, onReject, onEditSave }: AdminReviewRowProps) {
  const [text, setText] = useState(word.text);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== word.text) {
      onEditSave(word.id, trimmed);
    }
  };

  return (
    <div className="admin__row">
      <input
        className="admin__row-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        aria-label={`Edit "${word.text}"`}
      />
      <button
        type="button"
        className="btn btn--small btn--primary"
        onClick={() => onApprove(word.id)}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn btn--small btn--outline"
        onClick={() => onReject(word.id)}
      >
        Reject
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AdminReviewQueue.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminReviewQueue.tsx src/components/AdminReviewQueue.test.tsx
git commit -m "feat: add AdminReviewQueue component"
```

---

### Task 6: `AdminGenerateForm` component

**Files:**
- Create: `src/components/AdminGenerateForm.tsx`

**Interfaces:**
- Consumes: `WordCategory` from `../data/wordCategory`
- Produces: `AdminGenerateForm({ categories, isGenerating, onGenerate }: { categories: WordCategory[]; isGenerating: boolean; onGenerate: (categoryId: string | undefined, count: number) => void }): JSX.Element` — consumed by Task 7 (`AdminScreen.tsx`)

No test file — this is a thin, purely presentational form with no branching logic beyond the value it hands to `onGenerate`; it's exercised indirectly through `AdminScreen`'s manual verification in Task 7/Task 11.

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/AdminGenerateForm.tsx
import { useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";

interface AdminGenerateFormProps {
  categories: WordCategory[];
  isGenerating: boolean;
  onGenerate: (categoryId: string | undefined, count: number) => void;
}

export function AdminGenerateForm({ categories, isGenerating, onGenerate }: AdminGenerateFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(20);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGenerate(categoryId || undefined, count);
  };

  return (
    <form className="admin__generate-form" onSubmit={handleSubmit}>
      <select
        aria-label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.emoji} {category.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Count"
        type="number"
        min={1}
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
      />
      <button type="submit" className="btn btn--primary" disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: PASS, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminGenerateForm.tsx
git commit -m "feat: add AdminGenerateForm component"
```

---

### Task 7: `AdminScreen` component (password gate + wiring)

**Files:**
- Create: `src/components/AdminScreen.tsx`
- Test: `src/components/AdminScreen.test.tsx`

**Interfaces:**
- Consumes: `fetchWordCategories` from `../data/wordDatabase`; `listPendingWords`, `generateWords`, `approveWords`, `rejectWords`, `editWord`, `PendingWord` from `../utils/adminApi` (Task 4); `AdminGenerateForm` (Task 6); `AdminReviewQueue` (Task 5)
- Produces: `AdminScreen(): JSX.Element` — consumed by Task 8 (`main.tsx`)

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/AdminScreen.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const listPendingWordsMock = vi.fn();
const fetchWordCategoriesMock = vi.fn();

vi.mock("../utils/adminApi", () => ({
  listPendingWords: (...args: unknown[]) => listPendingWordsMock(...args),
  generateWords: vi.fn(),
  approveWords: vi.fn(),
  rejectWords: vi.fn(),
  editWord: vi.fn(),
}));

vi.mock("../data/wordDatabase", () => ({
  fetchWordCategories: (...args: unknown[]) => fetchWordCategoriesMock(...args),
}));

describe("AdminScreen", () => {
  beforeEach(() => {
    listPendingWordsMock.mockReset();
    fetchWordCategoriesMock.mockReset();
    fetchWordCategoriesMock.mockResolvedValue([]);
  });

  it("shows a password prompt and does not reveal the queue up front", async () => {
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(screen.queryByText(/no pending words/i)).not.toBeInTheDocument();
  });

  it("shows an error and stays locked when the password is wrong", async () => {
    listPendingWordsMock.mockRejectedValue(new Error("Unauthorized"));
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });

  it("unlocks and shows the pending queue on a correct password", async () => {
    listPendingWordsMock.mockResolvedValue([
      { id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" },
    ]);
    const { AdminScreen } = await import("./AdminScreen");
    render(<AdminScreen />);

    fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Taco")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AdminScreen.test.tsx`
Expected: FAIL — `AdminScreen.tsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/AdminScreen.tsx
import { useEffect, useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";
import { fetchWordCategories } from "../data/wordDatabase";
import {
  approveWords,
  editWord,
  generateWords,
  listPendingWords,
  rejectWords,
  type PendingWord,
} from "../utils/adminApi";
import { AdminGenerateForm } from "./AdminGenerateForm";
import { AdminReviewQueue } from "./AdminReviewQueue";

export function AdminScreen() {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWordCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCheckingPassword(true);
    setError(null);
    try {
      const pending = await listPendingWords(passwordInput);
      setPendingWords(pending);
      setPassword(passwordInput);
      setIsUnlocked(true);
    } catch {
      setError("Incorrect password.");
    } finally {
      setIsCheckingPassword(false);
    }
  };

  const handleGenerate = async (categoryId: string | undefined, count: number) => {
    setIsGenerating(true);
    setError(null);
    try {
      const inserted = await generateWords(password, categoryId, count);
      setPendingWords((current) => [...current, ...inserted]);
    } catch {
      setError("Couldn't generate words. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      await approveWords(password, [id]);
      setPendingWords((current) => current.filter((word) => word.id !== id));
    } catch {
      setError("Couldn't approve that word. Try again.");
    }
  };

  const handleReject = async (id: string) => {
    setError(null);
    try {
      await rejectWords(password, [id]);
      setPendingWords((current) => current.filter((word) => word.id !== id));
    } catch {
      setError("Couldn't reject that word. Try again.");
    }
  };

  const handleEditSave = async (id: string, text: string) => {
    setError(null);
    try {
      await editWord(password, id, text);
      setPendingWords((current) =>
        current.map((word) => (word.id === id ? { ...word, text } : word))
      );
    } catch {
      setError("Couldn't save that edit. Try again.");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="app-shell">
        <div className="screen-container admin">
          <h1>Admin</h1>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              aria-label="Admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={isCheckingPassword}>
              {isCheckingPassword ? "Checking…" : "Unlock"}
            </button>
          </form>
          {error && <p className="home__error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container admin">
        <h1>Word Curation</h1>
        {error && <p className="home__error">{error}</p>}
        <AdminGenerateForm
          categories={categories}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
        <AdminReviewQueue
          pendingWords={pendingWords}
          onApprove={handleApprove}
          onReject={handleReject}
          onEditSave={handleEditSave}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AdminScreen.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminScreen.tsx src/components/AdminScreen.test.tsx
git commit -m "feat: add AdminScreen with password gate"
```

---

### Task 8: Wire the `#admin` route into `main.tsx`

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `AdminScreen` from `./components/AdminScreen.tsx` (Task 7)

- [ ] **Step 1: Update the implementation**

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import "./styles/screens.css";
import App from "./App.tsx";
import { AdminScreen } from "./components/AdminScreen.tsx";

registerSW({ immediate: true });

const isAdminRoute = window.location.hash === "#admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdminRoute ? <AdminScreen /> : <App />}</StrictMode>
);
```

- [ ] **Step 2: Verify the app still builds and runs**

Run: `npx tsc -b && npx vite build`
Expected: PASS

Run: `npm run dev`, open the printed URL, confirm the normal game still loads at `/`, then open the same URL with `#admin` appended and confirm the password prompt renders instead. Stop the dev server after checking.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: route #admin to AdminScreen"
```

---

### Task 9: Admin layout styles

**Files:**
- Modify: `src/styles/screens.css`

- [ ] **Step 1: Append admin styles**

Add to the end of `src/styles/screens.css`:

```css
/* Admin word curation */

.admin {
  align-items: stretch;
  gap: var(--space-4);
  padding-top: var(--space-4);
}

.admin__generate-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.admin__queue-group h3 {
  margin: var(--space-4) 0 var(--space-2);
}

.admin__row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
}

.admin__row-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-button);
  border: 1px solid var(--color-border-solid);
  font-size: 1rem;
}

.admin__empty {
  color: var(--color-text-secondary);
  text-align: center;
}
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, open `/#admin`, confirm the password form and (after unlocking against a real or temporarily faked pending-words response) the generate form and review rows are legibly laid out on a phone-width viewport (~400px, use devtools device mode).

- [ ] **Step 3: Commit**

```bash
git add src/styles/screens.css
git commit -m "style: add admin word curation layout"
```

---

### Task 10: Document deployment and usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a section**

Add to `README.md`, after the existing "Notes" section:

```markdown
## Admin word curation

`/​#admin` (not linked from the UI) opens a password-gated view for
generating, reviewing, and approving/rejecting new words with Gemini,
backed by the `admin-words` Supabase Edge Function
(`supabase/functions/admin-words`).

One-time setup, once linked to your Supabase project
(`supabase link --project-ref <ref>`):

\`\`\`bash
supabase functions deploy admin-words
supabase secrets set GEMINI_API_KEY=... ADMIN_PASSWORD=...
\`\`\`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically
inside edge functions — do not set them as secrets yourself.

After deploying, open the app and append `#admin` to the URL
(e.g. `https://<your-pages-url>/phrase-frenzy/#admin`), enter the admin
password, and use the form to generate and review words. Approved words
go live immediately; rejected ones are deleted.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document admin word curation deployment and usage"
```

---

### Task 11: Deploy and manually verify the edge function

This task is manual — it requires your Supabase login/project link, which an automated worker does not have. Not a checkbox-driven TDD task; follow it yourself after the tasks above are merged.

- [ ] **Step 1: Link the Supabase CLI to the project** (skip if already linked — check for `supabase/config.toml`)

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

- [ ] **Step 2: Set function secrets**

```bash
supabase secrets set GEMINI_API_KEY=<your-gemini-key> ADMIN_PASSWORD=<choose-a-strong-password>
```

- [ ] **Step 3: Deploy the function**

```bash
supabase functions deploy admin-words
```

- [ ] **Step 4: Verify the password gate with curl**

```bash
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/admin-words" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -H "apikey: <anon-key>" \
  -H "x-admin-password: wrong" \
  -d '{"action":"list-pending"}'
```

Expected: `401` with `{"error":"Unauthorized"}`.

- [ ] **Step 5: Verify `list-pending` and `generate` with the real password**

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/admin-words" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -H "apikey: <anon-key>" \
  -H "x-admin-password: <your-admin-password>" \
  -d '{"action":"generate","categoryId":"food","count":3}' | jq
```

Expected: `200` with `{"inserted": [...]}` containing up to 3 new food words. Confirm in the Supabase dashboard that they were inserted with `active: false`.

- [ ] **Step 6: Verify the full flow in the browser**

Open `https://<your-pages-url>/phrase-frenzy/#admin`, unlock with the admin password, generate a small batch, edit one word's text, approve one, reject one, and confirm in the Supabase dashboard that the approved word is now `active: true` and the rejected one is gone.
