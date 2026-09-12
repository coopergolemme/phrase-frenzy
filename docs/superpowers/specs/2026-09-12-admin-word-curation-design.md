# Admin Word Curation View — Design

**Date:** 2026-09-12
**Status:** Approved, pending implementation

## Problem

`scripts/curate-words.ts` and `scripts/activate-words.ts` already let us
generate new candidate words with Gemini and bulk-activate everything
pending. But review is all-or-nothing (activate-words activates every
inactive row) and requires running CLI scripts locally with a `.env` file.
We want a lightweight in-app admin view to generate, review, edit, and
approve/reject words individually, reachable from the deployed PWA without
exposing `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the client
bundle.

## Constraints

- The app deploys as a static PWA to GitHub Pages
  (`.github/workflows/deploy.yml`) — no server-side rendering, no Node
  backend of our own.
- `src/data/wordDatabase.ts` reads only `active = true` words with the
  public anon key; RLS (`supabase/schema.sql`) only grants public `select`.
  Nothing about this changes.
- Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must never reach
  the client bundle.
- Single admin (the user), no accounts — a single shared password is
  sufficient. No rate-limiting is being built for this; if someone finds
  the hidden route and brute-forces the password, the worst case is junk
  rows inserted as `active: false`/deleted, since activating still requires
  the same password. Accepted tradeoff.

## Architecture

Two new pieces:

1. **Supabase Edge Function** `supabase/functions/admin-words/index.ts`
   (Deno). Holds `GEMINI_API_KEY` and `ADMIN_PASSWORD` as function secrets;
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the
   Supabase Edge Runtime. Every request must include a matching
   `x-admin-password` header, checked before any Gemini or DB write.
   Calls the Gemini REST API directly via `fetch` (no `@google/genai` SDK —
   it's Node-only, not Deno-compatible).

2. **Admin screen in the existing React app**, reached at
   `/phrase-frenzy/#admin`. `App.tsx` checks
   `window.location.hash === "#admin"` once at the top (no router
   dependency) and renders `AdminScreen` instead of the normal
   `gameStatus` state machine when true. Not linked from any nav — direct
   URL only.

## Edge Function API

One function, `action` field in the POST body selects behavior:

| action | payload | behavior |
|---|---|---|
| `generate` | `{ categoryId?: string, count: number }` | Fetches categories + existing words, builds the same prompt as `curate-words.ts`'s `CURATION_RULES`, calls Gemini, dedupes against existing words (case-insensitive, per category, and within the batch), inserts as `{ active: false }`, returns inserted rows |
| `list-pending` | `{}` | Returns all `active = false` rows, joined with category label, for the review queue |
| `approve` | `{ ids: string[] }` | `update words set active = true where id in (...)` |
| `reject` | `{ ids: string[] }` | `delete from words where id in (...)` |
| `edit` | `{ id: string, text: string }` | `update words set text = ... where id = ... and active = false` |

Auth: the function keeps Supabase's default JWT check (client sends the
anon key as `Authorization: Bearer`, same as any other Supabase call from
this app) *and* the custom `x-admin-password` header check. Wrong/missing
password → `401` with a generic message (no detail on which check failed).

## Client Components

- `src/utils/adminApi.ts` — thin fetch wrapper:
  `callAdminWords(action, payload, password)` → posts to
  `${VITE_SUPABASE_URL}/functions/v1/admin-words` with the anon key and
  password headers, throws on non-2xx.
- `src/components/AdminScreen.tsx` — holds the password in component state
  only (not persisted to `localStorage`/`sessionStorage`); shows a password
  prompt until a `list-pending` call succeeds, then renders the generate
  form and review queue. Owns the pending-words list and loading/error
  state, passes callbacks down.
- `src/components/AdminGenerateForm.tsx` — category `<select>` (sourced
  from the existing public categories read, same client as
  `wordDatabase.ts`), a count `<input type="number">`, and a Generate
  button; calls back up to `AdminScreen` to trigger `generate` and merge
  results into the pending list.
- `src/components/AdminReviewQueue.tsx` — pending words grouped by
  category; each row has editable text (inline `<input>`, saved on blur
  via `edit`), an Approve button, and a Reject button. No bulk
  approve/reject-all — YAGNI for a single-admin tool reviewing tens of
  words at a time.

## Data Flow

1. Admin opens `#admin`, enters password.
2. `AdminScreen` calls `list-pending` to populate the queue (also acts as
   the password check).
3. Admin picks a category + count in `AdminGenerateForm`, hits Generate →
   `generate` call → new pending rows appended to the queue.
4. Admin edits/approves/rejects rows individually; each action is a single
   edge function call affecting just that row's `active` state.

## Error Handling

- Wrong password: inline message "Incorrect password", form stays.
- Gemini or Supabase failure inside `generate`: edge function returns
  `500` with a short message; `AdminScreen` shows an inline error banner
  matching the existing `wordCategoriesRefreshError` pattern in
  `HomeScreen`, and the queue stays as it is (no partial state to
  reconcile since nothing was inserted).
- Network failure on `approve`/`reject`/`edit`: inline error banner,
  row stays in its previous state so the admin can retry.

## Testing

- Unit tests (Vitest) for `AdminReviewQueue`'s approve/reject/edit
  interactions, mocking `adminApi`.
- Unit test for the edge function's dedupe logic — duplicated (not
  shared) from `curate-words.ts`'s `dedupeAgainstExisting`, since sharing
  one ~15-line function across a Deno edge function and a Node script
  isn't worth a shared-module setup. Tested directly in Deno via
  `deno test` if convenient, otherwise ported to a small pure function and
  tested with Vitest alongside the rest of the suite.
- No E2E coverage — low-traffic internal tool, manual verification against
  a real Supabase project is sufficient.

## Out of Scope

- Bulk approve/reject-all.
- Rate limiting / brute-force protection on the password.
- Replacing `scripts/curate-words.ts` / `scripts/activate-words.ts` — they
  stay as a CLI escape hatch.
