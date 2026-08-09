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
