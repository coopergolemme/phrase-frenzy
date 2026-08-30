# Word Database — Design

GitHub issue: [#3 Add word database](https://github.com/coopergolemme/phrase-frenzy/issues/3)

## Problem

`src/data/words.ts` is a single ~1500-line hardcoded TypeScript array of
word categories. Growing or auditing the word bank requires editing this
file and shipping a new build/deploy for every change, and there's no way
to review or fix words (e.g. in response to flagged-word feedback) without
a code change.

## Goals

- Let word content be added, edited, or retired without an app rebuild/deploy.
- Give an easy way to browse/audit the word bank outside of reading a TS file.
- Keep the app's "no backend, no accounts" character for gameplay — this is
  a content data source only, not a service the app depends on for players
  to sign in or persist anything server-side.
- Keep the game playable offline (PWA, often used at parties on bad wifi),
  including on a fresh install with no prior cache.

## Non-goals

- No player accounts, auth, or server-side game logic.
- No admin UI built into the app — content editing happens directly in the
  Supabase dashboard.
- No real-time sync while a game is in progress — word data is fetched once
  per session (on load), not subscribed to.

## Approach

Use Supabase (hosted Postgres) purely as a read-only content store:

- The app ships a public anon key that can only `select` from the word
  tables (enforced via Row-Level Security). No write path exists from the
  client.
- Editing/auditing content happens through the Supabase Table Editor
  dashboard directly — no custom admin tooling needed.
- The app fetches word categories once at startup, caches the result in
  `localStorage`, and falls back to a small bundled seed list if the fetch
  fails and no cache exists yet (fresh install, offline).

This was chosen over (a) a larger local-only dataset (doesn't solve
"update without a rebuild") and (b) a fully custom backend service (more
to build/host/maintain than the "low lift" requirement calls for).

## Data Model

Two Supabase tables:

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

No `insert`/`update`/`delete` policies are created for the `anon` role —
the anon key can only read. Content changes happen via the Supabase
dashboard using the project's own authenticated access, which bypasses RLS.

Splitting into two tables (vs. one denormalized `category_id, words[]`
row per category) means a category can be added, relabeled, or reordered
without touching word rows, and individual words can be flipped inactive
without deleting them (keeps an audit trail).

## Client Architecture

### Data layer

`src/data/wordDatabase.ts` — thin Supabase client wrapper:

```ts
export interface WordCategory {
  id: string;
  label: string;
  emoji: string;
  words: string[];
}

export async function fetchWordCategories(): Promise<WordCategory[]>
```

Internally: create the Supabase client from `import.meta.env.VITE_SUPABASE_URL`
/ `VITE_SUPABASE_ANON_KEY`, select categories ordered by `sort_order`, select
active words ordered by `category_id`, and assemble them into the existing
`WordCategory[]` shape. The shape is unchanged from today's `words.ts`
export so every consumer downstream is unaffected by the source swap.

### Loading, caching, fallback

`src/hooks/useWordCategories.ts`:

- On mount: synchronously read `localStorage["phrase-frenzy:word-categories"]`
  (wrapped in try/catch per existing localStorage conventions) and use it as
  initial state if present and non-empty.
- Kick off `fetchWordCategories()` regardless (even if cache was used) to
  refresh in the background.
- On fetch success: update state and overwrite the cache.
- On fetch failure:
  - If cache was available, keep showing cached data (already the initial
    state) — no user-visible error, just skip the refresh silently (this is
    a game people are trying to play right now; don't block or error toast
    for a background sync failure).
  - If no cache and no successful fetch yet, fall back to the bundled
    `SEED_WORD_CATEGORIES` from `src/data/seedWords.ts`.
- Exposes `{ categories: WordCategory[], isLoading: boolean }`. `isLoading`
  is true only in the narrow window before either cache or fetch has
  resolved on a cold start with no cache.

### Consumer changes

Today, `WORD_CATEGORIES` is imported directly as a module-level constant in:
- `src/hooks/useGameState.ts` (initial state, `drawNextWord`, `startTournament`)
- `src/components/TeamSetupScreen.tsx`
- `src/components/CategoryPickerSheet.tsx`

These switch to receiving categories as data instead of importing a
constant:

- `App.tsx` calls `useWordCategories()` once and passes `categories` down as
  a prop to whatever needs it, and to the `useGameState` hook.
- `useGameState(categories: WordCategory[])` takes categories as a
  parameter; the reducer's initial state and any action handlers that read
  `WORD_CATEGORIES` today read from the passed-in `categories` (via a ref or
  closed-over value, matching how `useGameState` already takes other
  runtime config) instead of the static import.
- `TeamSetupScreen` and `CategoryPickerSheet` receive `categories` as a
  prop instead of importing `WORD_CATEGORIES`.
- While `isLoading` is true, `App.tsx` renders the existing home screen with
  a lightweight inline loading state in place of the category list (this
  only matters on a cold start with no cache and a live network fetch in
  flight — the common case is cache-first and instant).

`useFlaggedWords` and `useWordStats` are keyed by word text already and are
unaffected — the word strings themselves don't change shape or meaning.

## Migration

- `src/data/seedWords.ts`: a small trimmed fallback list (representative
  words across each existing category, enough to actually play a game
  offline — not the full 1500-line bank), committed to git as the offline
  safety net. `src/data/words.ts` is deleted once this exists.
- `scripts/seed-supabase.ts`: one-off Node script, run manually and not
  part of CI/app runtime. Reads the current (pre-deletion) `words.ts`,
  connects to Supabase using the **service-role key** (never shipped to the
  client), and inserts all categories + words. Run once to populate the
  database from the existing hardcoded list; not needed again afterward
  since future edits happen in the dashboard.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` added to
  `.env.example` (placeholder values) and set for real in `.env.local`
  (gitignored, already covered by the standard Vite `.env*.local` ignore
  pattern — verify `.gitignore` covers it). The seed script additionally
  needs `SUPABASE_SERVICE_ROLE_KEY`, documented as a script-only, never-committed
  secret.

## Error Handling

- All `localStorage` reads/writes wrapped in try/catch, matching existing
  convention in `utils/flaggedWords.ts` etc. — a cache read/write failure
  never blocks gameplay.
- A Supabase fetch failure is caught and never surfaces as a user-facing
  error; it just means "don't refresh the word list this session," per the
  Goals (offline resilience for a party game).
- The seed script (`scripts/seed-supabase.ts`) is a dev-only tool — it can
  fail loudly (throw, non-zero exit) since a human is watching it run.

## Testing

- Unit test `fetchWordCategories()` against a mocked Supabase client
  response, including the empty/error case.
- Unit test `useWordCategories()` for all three paths: cache hit, cache
  miss + fetch success, cache miss + fetch failure (seed fallback).
- Existing `useGameState` behavior (deck shuffling, category filtering)
  re-verified with categories passed as a parameter instead of the static
  import — same test cases, new call signature.
- No test suite currently exists in this repo (per CLAUDE.md); this
  feature introduces the first tests using Vitest (pairs naturally with
  Vite) plus React Testing Library for the hook. Add `npm run test` script.

## Open Questions / Risks

- This introduces the project's first test tooling and its first external
  network dependency — both are meaningful additions to a previously
  fully static app. Flagged here for visibility, not blocking.
- Supabase free-tier project needs to be created by the user (has account
  access); not something this agent can provision.
