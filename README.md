# Phrase Frenzy

A mobile-first "hot potato" party word game. One device is passed between
teammates who take turns describing words on-screen before a 60-second timer
runs out.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL on your phone (use `npm run dev -- --host` to expose it
on your local network) or in a browser's mobile device emulator.

## Build

```bash
npm run build
npm run preview
```

## Notes

- No backend, no accounts, no persistence — all state is local to the current
  round.
- `public/icons/` needs real `icon-192.png`, `icon-512.png`, and
  `apple-touch-icon.png` assets before "Add to Home Screen" shows a custom
  icon; the app installs and runs fine without them in the meantime.

## Admin word curation

`/#admin` (not linked from the UI) opens a password-gated view for
generating, reviewing, and approving/rejecting new words with Gemini,
backed by the `admin-words` Supabase Edge Function
(`supabase/functions/admin-words`). Type or speak a prompt describing what
you want (e.g. "80s action movies") and Gemini decides the category
itself — reusing an existing one if it fits, or proposing a brand-new one
(shown with a "New" badge) if it doesn't. Leave the prompt blank to add
more words to existing categories instead.

One-time setup, once linked to your Supabase project
(`supabase link --project-ref <ref>`):

```bash
supabase functions deploy admin-words
supabase secrets set GEMINI_API_KEY=... ADMIN_PASSWORD=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically
inside edge functions — do not set them as secrets yourself.

After deploying, open the app and append `#admin` to the URL
(e.g. `https://<your-pages-url>/phrase-frenzy/#admin`), enter the admin
password, and use the form to generate and review words. Nothing is
written to the database until you approve words and leave the admin
screen — approved words (and any new category they belong to) are
published then; rejected ones are simply discarded.
