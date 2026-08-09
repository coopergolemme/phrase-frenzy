# Build Prompt: "Phrase Frenzy" — Hot Potato Word Game (MVP)

Build a single-page mobile web app for a "hot potato" party word game. One
device is passed between teammates who take turns describing words on-screen
before a timer runs out.

## Core User Flow
1. **Start** — Player taps "Start Game" and immediately sees the first word.
2. **Play** — The active player describes the word aloud; teammates guess it.
3. **Pass** — On a correct guess, the player taps **Correct**, the word
   advances, and the phone is physically passed to the next player.
4. **End** — When the 60-second timer hits zero, an audio buzzer plays and a
   "Time's Up!" screen shows whoever is holding the phone as the round loser.
5. **Score** — A post-round summary shows total words guessed correctly.

## Screens
- **Home / Start screen** — Title, "Start Game" button, brief instructions.
- **Game screen** — Large word display (dominant, center of screen), timer
  (numeric, always visible), two large tappable buttons: **Correct** and
  **Pass** (skip).
- **End screen** — "Time's Up!" message, final score (words correct this
  turn), and a "Play Again" button that resets state and returns to Home.

## Game Rules / Logic
- Fixed 60-second countdown timer per round (not configurable in MVP).
- Word bank: local array of 100–200 simple, family-friendly nouns/short
  phrases (e.g. "basketball," "pizza slice," "roller coaster"). Words should
  be shuffled at the start of each round and not repeat within that round.
- **Correct** button: increments score by 1, immediately shows the next word.
- **Pass/Skip** button: shows the next word without incrementing score, but
  is limited to **1 use per round** (disable/gray out the button after first
  use).
- Timer reaching 0 ends the round immediately, regardless of button state.
- Buzzer: a short audio clip (local file or generated tone) plays once when
  time expires.
- If the word bank runs out mid-round, reshuffle and continue rather than
  crashing.

## Tech Stack
- **Frontend:** Single-page React app (functional components + hooks),
  styled for mobile-first (large tap targets, portrait orientation,
  minimal chrome). Plain HTML/CSS/JS is an acceptable alternative if you
  prefer no build step.
- **State management:** Local component state only (`useState`/`useReducer`)
  — no backend, no global state library needed for MVP.
  - Track: `currentWordIndex`, `timeRemaining`, `score`, `passUsed` (boolean),
    `gameStatus` ('home' | 'playing' | 'ended').
- **Word bank:** Hardcoded JSON array or JS array of strings, bundled with
  the app — no external API or database.
- **Timer:** `setInterval`/`useEffect`-based countdown, cleaned up properly
  on unmount or game end to avoid leaks.
- **Audio:** A single local buzzer sound file (or Web Audio API generated
  beep) triggered on timer expiry.

## Explicit MVP Constraints (don't build these yet)
- No multiplayer networking, accounts, or persistent leaderboards.
- No difficulty levels, categories, or custom word lists.
- No randomized timer length — fixed 60 seconds only.
- No more than 1 pass per round.

## Deliverable
A working single-page app (React preferred) that runs in a mobile browser,
implements the full Start → Play → Pass → End → Score loop described above,
using only local state and a hardcoded word bank.

---

### Optional follow-up asks (once MVP works)
- Add a countdown "tick" sound in the last 5 seconds.
- Add category selection (e.g. Movies, Food, Animals) as separate word banks.
- Add a multi-round mode that tracks cumulative team scores across passes.
