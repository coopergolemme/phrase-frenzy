# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Phrase Frenzy — a mobile-first "hot potato" party word game (Catchphrase/Heads
Up style). One phone is passed between teammates who describe words on-screen
before a countdown timer runs out. No backend, no accounts — all state is
either in-memory (React reducer) or `localStorage`. Ships as an installable
PWA.

## Commands

```bash
npm run dev       # vite dev server (use `-- --host` to expose on LAN for phone testing)
npm run build     # tsc -b && vite build
npm run preview   # preview the production build
npm run lint      # oxlint
```

There is no test suite configured in this repo.

## Architecture

- **State machine**: `src/hooks/useGameState.ts` is the core of the app — a
  single `useReducer` driving a `gameStatus` state machine:
  `home → teamSetup → playing → roundSummary → (loop) → gameOver`.
  `App.tsx` renders one screen component per `gameStatus` value and wires
  callbacks into the reducer's action dispatchers. Turn order, word deck
  shuffling/reshuffling, and score bookkeeping all live in this reducer —
  read it first when changing game flow or scoring rules.
- **Word deck**: `drawNextWord` in `useGameState.ts` reshuffles the whole
  word bank once the deck is exhausted, with a swap to avoid immediately
  repeating the last word.
- **Countdown**: `src/hooks/useCountdown.ts` owns the timer and exposes
  `applyPenalty` (used for the pass penalty, `PASS_PENALTY_SEC` in
  `App.tsx`) separately from the reducer, since timing is a side effect
  independent of game state.
- **Word bank data**: `src/data/words.ts` exports `WORD_CATEGORIES`, an
  array of `{ id, label, emoji, words }`. This is the live source of words
  used by the app. `game_words.yaml` and `curate-word-list-prompt.md` are
  a separate offline workflow for curating/generating new word batches with
  an LLM before hand-merging them into `words.ts` — they are not read by
  the app at runtime.
- **Persistence (`localStorage`)**: three independent stores, each with its
  own hook + utils pair and `phrase-frenzy:*` key prefix:
  - `useFlaggedWords` / `utils/flaggedWords.ts` — words players can flag as
    bad/unfair; flagged words are filtered out of the deck when starting a
    tournament (`startTournament(..., flaggedWords)`).
  - `useMatchHistory` / `utils/matchHistory.ts` — past match results, capped
    at `MAX_ENTRIES`.
  - `useWordStats` / `utils/wordStats.ts` — per-word correct/skipped counts,
    updated via `recordRoundLog` at the end of each turn.
  All `localStorage` reads/writes are wrapped in try/catch and fail
  silently (private browsing, quota, etc.) — follow that pattern for any
  new persisted state.
- **Screens** (`src/components/*Screen.tsx`) are presentational and receive
  all data/callbacks as props from `App.tsx`; the `*Sheet.tsx` components
  are modal/bottom-sheet overlays (history, stats, flagged words, category
  picker) opened from `HomeScreen`.
- **PWA**: configured in `vite.config.ts` via `vite-plugin-pwa`
  (`registerType: "autoUpdate"`); `base: "/phrase-frenzy/"` since it deploys
  under a subpath. `public/manifest.json` holds the manifest;
  `public/icons/` needs real icon assets for a custom home-screen icon.

## Agent skills

### Issue tracker

Issues live as GitHub Issues in `coopergolemme/phrase-frenzy`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily as needed). See `docs/agents/domain.md`.
