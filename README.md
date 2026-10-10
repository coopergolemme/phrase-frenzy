# Phrase Frenzy

A mobile-first "hot potato" party word game in the style of Catchphrase or
Heads Up. Teammates take turns describing the word on screen before the
countdown runs out. It installs as a PWA and needs no accounts.

## Game modes

- **Pass-the-phone (default):** one device is passed around the group. Pick
  categories, set up teams, and play rounds of a tournament (60s by default,
  with a 3s penalty for each pass). Game state lives in memory. Match
  history, per-word stats, flagged words and a cached copy of the word bank
  are saved to `localStorage`.
- **Multiplayer rooms (`/#multiplayer`):** every player uses their own
  phone. A host creates a room and players join by QR code or by a
  `#room/<code>` link. The `multiplayer` Supabase Edge Function holds the
  authoritative game state, and only the device describing the word receives
  it. Live views are available at `#scoreboard/<code>` and
  `#overlay/<code>` (the overlay is meant for streaming).
- **Admin word curation (`/#admin`):** not linked from the UI. See
  [below](#admin-word-curation).

## Word bank

Words and categories are stored in Supabase (`categories` / `words`
tables). The app fetches them on load and caches them in `localStorage`. If
the fetch fails, it uses the cached copy, or the bundled
`src/data/seedWords.ts` when there is no cache. Words that players flag in
the app are left out of their decks.

## Run locally

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

To open it on your phone, run `npm run dev -- --host` and visit the printed
LAN URL. A browser's mobile device emulator also works. Without Supabase
credentials, the local game still runs on the seed word list. Multiplayer
and admin need a Supabase project.

## Scripts

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Vite dev server                                         |
| `npm run build`          | Type-check (`tsc -b`) and production build              |
| `npm run preview`        | Serve the production build                              |
| `npm run lint`           | Lint with oxlint                                        |
| `npm test`               | Run the Vitest suite                                    |
| `npm run curate:words`   | Generate a batch of new words with Gemini, inserted inactive for review (`-- --count 50 [--category food] [--dry-run]`) |
| `npm run activate:words` | Activate every inactive word after reviewing it         |
| `npm run seed:supabase`  | One-off: seed the word tables from a legacy word list   |

Scripts that run on the server read `SUPABASE_SERVICE_ROLE_KEY` and
`GEMINI_API_KEY` from `.env`. Never prefix them with `VITE_`.

## Supabase setup

Schema and migrations are in `supabase/` (`schema.sql`, `migrations/`), and
the edge functions are in `supabase/functions/` (`admin-words`,
`multiplayer`, plus shared turn logic in `_shared/`).

```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy admin-words
supabase functions deploy multiplayer
supabase secrets set GEMINI_API_KEY=...
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside edge
functions automatically, so don't set them as secrets.

## Admin word curation

Opening `/#admin` brings up a view for generating, reviewing, approving and
rejecting new words with Gemini, through the `admin-words` edge function.
Type or speak a prompt such as "80s action movies", and Gemini picks the
category. It reuses an existing category when one fits, or proposes a new
one, shown with a "New" badge. Leave the prompt blank to add more words to
existing categories. The admin screen also shows category health, flagged
words and deactivated words. As you make more approve/reject decisions, the
guidance for each category is refined automatically.

Nothing is written to the database until you approve words and leave the
admin screen. Approved words (and any new category) are published at that
point, and rejected words are discarded.

> **Note:** `/#admin` has no password and the `admin-words` function has no
> auth of its own. Anyone who finds the route can use it.

## Deployment

GitHub Actions (`.github/workflows/`):

- `deploy.yml` builds and deploys to GitHub Pages on every push to `main`.
  It uses the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` repo variables.
  The app is served under the `/phrase-frenzy/` base path.
- `deploy-supabase-functions.yml` redeploys `admin-words` when
  `supabase/functions/**` changes. It needs the `SUPABASE_ACCESS_TOKEN`
  secret and the `SUPABASE_PROJECT_REF` variable. The `multiplayer`
  function is currently deployed by hand.

## Notes

- `public/icons/` needs real `icon-192.png`, `icon-512.png` and
  `apple-touch-icon.png` assets before "Add to Home Screen" shows a custom
  icon. The app installs and runs without them.
- `PRODUCT.md` and `DESIGN.md` describe product positioning and the design
  system.
