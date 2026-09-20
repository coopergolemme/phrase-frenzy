# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Party groups playing a Catchphrase/Heads Up-style word game. The core mode is
pass-the-phone: teammates on one device take turns describing words on-screen
before a countdown runs out. Multiplayer rooms (Supabase-backed, QR join) are
an added mode for groups who prefer or need separate phones per player/team
rather than passing one device — not a replacement for the local game.

## Product Purpose

A mobile-first party word game people can start playing immediately —
install as a PWA, no accounts, and jump straight into a round. Success is a
group finishing a full tournament (multiple rounds across teams) without
friction, with a word bank that stays fresh and fair over repeat play.

## Positioning

The differentiator is the word bank itself, not just the turn/timer
mechanic: an AI-assisted (Gemini-backed) curation pipeline lets an admin
generate, review, and approve new words and categories on demand, and the
app tracks word health over time (per-word correct/skip stats, player
flags for bad/unfair words, category health, deactivation queue). Other
party word-game apps ship a static word list; this one has a live content
pipeline behind it.

## Operating Context

- Primary flow: local pass-the-phone game — home → team setup → playing →
  round summary → (loop) → game over. All state in a `useReducer` state
  machine (`useGameState.ts`).
- Secondary flow: multiplayer rooms — host creates a room, players join via
  QR/link, live scoreboard and spectator view broadcast round activity via
  Supabase Realtime.
- Admin flow (`/#admin`, not linked from the UI): password-gated screen for
  generating word batches with Gemini, reviewing/approving/rejecting them,
  and monitoring category health / flagged / deactivated words. Nothing
  writes to the database until an admin approves.
- No accounts for players in either mode; the admin flow is the only
  password-gated surface.

## Capabilities and Constraints

- No traditional backend for the core local game — game state is in-memory
  (React reducer) plus `localStorage` for flagged words, match history, and
  word stats (each independently persisted, capped where noted in
  CLAUDE.md).
- Multiplayer rooms and the admin word pipeline are backed by Supabase
  (Edge Functions + Realtime + Postgres) — this is newer than the original
  "no backend" framing in README.md, which is stale and should be updated
  when someone next touches multiplayer docs.
- Ships as an installable PWA (`vite-plugin-pwa`, autoUpdate) under a
  subpath base path.
- Word bank source of truth is `src/data/words.ts`; `game_words.yaml` and
  the curate-word-list prompt are an offline/admin authoring workflow, not
  runtime-read.

## Brand Commitments

- Name is fixed: "Phrase Frenzy."
- Tone is playful/energetic, fitting a party game — not otherwise locked
  (no specific palette, typography, or mascot commitments yet).

## Evidence on Hand

- `public/icons/` is missing real `icon-192.png`, `icon-512.png`, and
  `apple-touch-icon.png` — a known asset gap, not a design decision. The
  app installs and runs without them but won't show a custom home-screen
  icon until they exist.
- No testimonials, case studies, or external press exist; do not fabricate
  any.

## Product Principles

- Zero friction to start: no accounts, install-and-play, works fully
  offline for the local game.
- The word bank is a living asset, not a static list — design and product
  decisions should treat word curation/health tooling as core, not
  incidental admin plumbing.
- Local pass-the-phone stays the default, low-ceremony mode; multiplayer is
  additive, for groups who need separate devices, and shouldn't add
  friction to the local flow.
- Fail silently and locally: persistence failures (private browsing, quota)
  degrade gracefully rather than blocking play.
