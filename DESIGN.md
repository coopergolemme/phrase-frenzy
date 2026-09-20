---
name: Phrase Frenzy
description: A mobile-first pass-the-phone party word game, re-skinned as a live gameshow buzzer board.
colors:
  stage-black: "#120d0a"
  panel-solid: "#241a12"
  panel-raised: "#2f2216"
  surface-tint: "rgba(245, 234, 217, 0.1)"
  border-tint: "rgba(245, 234, 217, 0.14)"
  border-solid: "rgba(245, 234, 217, 0.24)"
  outline: "rgba(245, 234, 217, 0.2)"
  gold-win: "#ffd23f"
  gold-win-pressed: "#d9a812"
  green-correct: "#34d17a"
  green-correct-pressed: "#1c9f5b"
  amber-pass: "#ffab2e"
  amber-pass-pressed: "#d1830f"
  red-warning: "#ff4b3e"
  red-warning-pressed: "#d92c22"
  disabled: "#453a2e"
  text-primary: "#f5ead9"
  text-secondary: "#c9b8a0"
typography:
  display:
    fontFamily: "Titan One, Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontWeight: 600
    lineHeight: 1.15
rounded:
  card: "20px"
  button: "16px"
  chip: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
components:
  button-primary:
    backgroundColor: "{colors.green-correct}"
    textColor: "#08160e"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.button}"
  button-pass:
    backgroundColor: "{colors.amber-pass}"
    textColor: "#2b1a03"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  button-outline:
    backgroundColor: "{colors.panel-solid}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.button}"
  hero-card:
    backgroundColor: "{colors.panel-solid}"
    rounded: "{rounded.card}"
    padding: "24px 16px"
---

# Design System: Phrase Frenzy

## Overview

**Creative North Star: "Gameshow Buzzer Board"**

The screen is the host desk's countdown display, not a card describing a game. Every readout — the word, the timer, the tally lamps — reads as a physical lit fixture on a stage-lit desk rather than as flat app UI: soft colored bulb-glow for anything live, and a hard flat graphic shadow (`--shadow-off`, `5px 5px 0 0 rgba(0,0,0,0.5)`) for anything off or inactive, so which lamp is lit is never ambiguous. This was chosen (Impeccable's Pick) over an assigned "Stadium Scoreboard Jumbotron" direction during the direction round; it deliberately refuses both the generic "quiz app" default (gradient card, sticker emoji, generic bold sans) and the muted glassy premium-minimalist dark-mode alternative.

The build is code-led — no comp/image round ran in this environment — so every token below is read directly from `src/index.css` and `src/styles/screens.css` as shipped, not from planning intent. The world is fully committed on HomeScreen, TeamSetupScreen, GameScreen, RoundSummaryScreen, FinalStandingsScreen, the shared sheet/modal components (CategoryPickerSheet, WordStatsSheet, MatchHistorySheet, FlaggedWordsSheet, ScoreboardSheet, and the shared `review-sheet`/`hero-card`/`word-card`/`standings` classes), and MultiplayerHomeScreen/MultiplayerLobbyScreen (which inherited the world automatically through the shared tokens, plus one glow-text touch-up).

**Key Characteristics:**
- Warm stage-light palette on a near-black ground — never a cool or neutral dark mode.
- Two shadow languages that are never mixed: soft colored glow for "lit/live", hard flat offset for "off/inactive".
- A repeating marquee-bulb strip motif across every plinth-style panel (hero card, word card).
- A chase-light conic-gradient ring that sweeps the timer and accelerates in the final seconds.
- All iconography is a single hand-authored stroke-SVG set (`src/components/icons.tsx`) — no emoji, no icon font.

## Colors

A warm, near-black stage-light palette: one working ground color, four working lamp colors each with a matching pressed/active shade, and a warm off-white ink for text.

### Primary
- **Green Correct** (`#34d17a`, pressed `#1c9f5b`): the "correct" ding lamp — `.btn--primary`, the leader row on the standings list, the on-air dot on the active team's HUD plate.

### Secondary
- **Amber Pass** (`#ffab2e`, pressed `#d1830f`): the ring-in/pass lamp — `.btn--pass`.
- **Red Warning** (`#ff4b3e`, pressed `#d92c22`): the urgent/foul lamp — the timer's urgent state, the foul-call banner, the flag-active state.

### Tertiary
- **Gold Win** (`#ffd23f`, pressed `#d9a812`): reserved for the win/round-complete state — the timer numeral at rest, the marquee-bulb strip, the app title glow, and the pause button's active state. This color is deliberately rarer than the others; it marks completion, not routine action.

### Neutral
- **Stage Black** (`#120d0a`): the base background, layered under a radial-gradient stage vignette (`--color-bg-stage`).
- **Panel Solid** (`#241a12`): the solid fill for cards, HUD plates, menus, and sheets.
- **Panel Raised** (`#2f2216`): a lighter panel tone for raised/hover states.
- **Warm Ink** (`#f5ead9`): primary text.
- **Warm Ink Muted** (`#c9b8a0`): secondary/meta text (describer name, timestamps, labels).
- **Border Solid** (`rgba(245,234,217,0.24)`): the standard 1.5-2px panel/button border.

### Named Rules
**The Two-Shadow Rule.** A color only ever appears with one of two shadow treatments: a soft colored glow (`--glow-primary`, `--glow-pass`, `--glow-danger`, `--glow-gold`) for something live/lit, or the flat offset `--shadow-off` for something off/inactive/idle. Never blend the two on the same element.

**The Rare Gold Rule.** Gold is the win/round-complete color. It marks the timer's resting numeral, the marquee-bulb motif, and completion states — not general accents or default buttons.

## Typography

**Display Font:** Titan One (with Nunito, system sans fallback)
**Body Font:** Nunito (weights 400-900, with system sans fallback)

**Character:** A heavy rounded gameshow-marquee display face paired with a warm, high-weight rounded workhorse body face — nothing thin or delicate anywhere in the system; body text defaults to semibold/bold even at small sizes.

### Hierarchy
- **Display** (Titan One, weight 400, tabular numerals where numeric): the timer numeral, standings scores, screen titles in review sheets, the app name on the home screen. Reserved for numerals and short marquee-style titles, not body copy.
- **Title** (Nunito 800, `clamp(1rem, 4vmin, 1.3rem)`): team name / HUD plate title.
- **Body** (Nunito 600-800, ~0.9-1.05rem): buttons, standings rows, match cards, list items.
- **Label** (Nunito 600-700, 0.65-0.85rem, `--color-text-secondary`): meta rows (round label, timestamps, describer name), standings title.

### Named Rules
**The Numerals-Get-The-Marquee-Face Rule.** Titan One is reserved for the timer and tabular scores (`font-variant-numeric: tabular-nums`) plus short titles; body copy, buttons, and lists stay in Nunito.

## Layout

Single-column, edge-padded `.app-shell` filling the viewport (`100dvh`), padded to the safe-area insets (`max(env(safe-area-inset-*), var(--space-*))`). Base spacing rhythm is a 4/8/12/16/24/32px scale (`--space-1` … `--space-6`). A `landscape-compact` custom variant (`orientation: landscape and max-height: 2000px`) is the dominant active-play layout for this mobile-only app: the game screen switches to a three-column CSS grid (`pass | word | correct`, pass/correct columns `minmax(56px, 84px)`) so the word stays centered and the two action buttons sit as full-height vertical strips at each thumb-reachable edge, with `writing-mode: vertical-rl` labels. Review/standings sheets reflow to a two-column layout (`column-count: 2`) in the same landscape-compact breakpoint. Minimum touch target is 44px (`--touch-target-min`).

## Elevation & Depth

Hybrid, and the split is the load-bearing rule of the whole system rather than a generic elevation scale: live/lit elements get a soft colored glow (ambient, borderless, offset-free); anything off, idle, or inactive gets a hard flat graphic drop-shadow with zero blur. Backdrop blur is disabled system-wide (`--blur-glass: none`) even though several classes (`.standings__row`, `.review-row`, `.game__rotate-hint`) still carry `backdrop-filter: var(--blur-glass)` — this is dead-but-harmless CSS since the token resolves to `none`; do not read it as a live glass-blur treatment.

### Shadow Vocabulary
- **Glow — Primary** (`0 0 16px 1px rgba(52,209,122,.55), 0 0 40px 10px rgba(52,209,122,.22)`): correct/live team lamp.
- **Glow — Pass** (`0 0 16px 1px rgba(255,171,46,.55), 0 0 40px 10px rgba(255,171,46,.22)`): pass/ring-in lamp.
- **Glow — Danger** (`0 0 16px 1px rgba(255,75,62,.6), 0 0 40px 10px rgba(255,75,62,.26)`): urgent timer, foul banner, active flag.
- **Glow — Gold** (`0 0 18px 2px rgba(255,210,63,.6), 0 0 46px 12px rgba(255,210,63,.26)`): win/round-complete state.
- **Off** (`5px 5px 0 0 rgba(0,0,0,.5)`): flat, zero-blur, reserved exclusively for the off/inactive/idle state — outline buttons, icon-menu buttons, unlit lamps.
- **Panel** (`0 12px 28px -8px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.04) inset`): ambient elevation for cards, HUD plates, and menus — the only "ordinary" soft shadow in the system, used for resting depth rather than a lit/unlit signal.

### Named Rules
**The Hard-Shadow-Means-Off Rule.** `--shadow-off`'s flat offset shadow is raised, in this world, from a declined precisionist-industrial-plate challenger specifically to answer "whose turn/lamp is on" at a glance. It is a state signal, not a general decorative shadow style — don't apply it to elements that aren't communicating an off/idle state.

## Shapes

Rounded throughout, on a three-step radius scale: cards/panels use 20px (`--radius-card`), buttons/HUD plates use 16px (`--radius-button`), and pill/chip elements (category chips, outcome pills, the timer's own pill shell) use a full 999px (`--radius-chip`). Circular icon buttons (menu, pause, close, flag) are perfect circles at 36-44px. Borders are a consistent 1.5-2px solid stroke in the warm-ink-tinted border color, never a hairline or borderless card.

## Components

### Buttons
- **Shape:** 16px radius (`--radius-button`), 1.5px border, min-height 48px (56px for `.btn--large`, 44px for `.btn--small`).
- **Primary** (`.btn--primary`): green-correct fill, dark ink text (`#08160e`), primary glow shadow.
- **Pass** (`.btn--pass`): amber fill, dark ink text (`#2b1a03`), pass glow shadow.
- **Outline** (`.btn--outline`): panel-solid fill, warm-ink text, flat off-shadow (idle/unlit state).
- **Text** (`.btn--text`): transparent, underlined, secondary-ink, no shadow — for low-emphasis links.
- **Disabled:** all filled variants drop to the disabled fill/ink and switch their glow to the flat off-shadow — the disabled state visually reads as "lamp off."
- **Press behavior:** `translateY(2px) scale(0.98)` plus a brightness boost on active — a bulb confirming a physical press, not a ripple or opacity fade.

### Chips / Pills
- **Category chips** (`CategoryPickerSheet`): full-pill radius, bordered, selected/unselected states via fill and border color.
- **Outcome pills** (round summary): `--outcome-pill--correct` (green fill, dark ink) vs. `--outcome-pill--skipped` (transparent, muted ink).

### Cards / Containers — Host-Desk Plinth
- **Corner style:** 20px radius (`--radius-card`), 2px solid border.
- **Background:** panel-solid, with the ambient panel shadow (never a hard offset — panels sit on soft stage-lit elevation).
- **Signature detail:** every `.hero-card` and `.word-card` carries a repeating row of small gold dots along its top inner edge (`radial-gradient` circles at 18px spacing with a gold drop-shadow) — the marquee-bulb strip, the one motif reused across the whole board.
- **Internal padding:** 24px vertical / 16px horizontal (`--space-5 --space-4`).

### Game HUD / Timer (signature component)
The timer is a lit numeral plinth, not a plain countdown label: Titan One numeral in gold with a soft gold text-glow, sitting inside a pill shell whose ring is a **chase-light** — a conic-gradient "comet" of light that continuously rotates around the rim (3.2s cycle at rest). In the final 10 seconds (`--urgent`), the comet speeds up to a 0.55s cycle, the shell recolors to the danger/red glow, the numeral itself pulses in scale, and the enclosing word-card border flashes to danger red on a 0.9s cycle (`cardHeat`). Team identity in the left HUD plate is marked by a small circular lamp dot that flickers gently (`lampFlicker`, a brief dim-then-recover) rather than sitting perfectly static, reinforcing "this is a live fixture."

### Inputs / Fields
No distinct bespoke input styling was found beyond native form controls inside TeamSetupScreen; team-name entry uses standard text inputs styled by the shared button/panel tokens rather than a dedicated input component class.

### Navigation
No persistent nav bar; screens are full-bleed single views driven by the game state machine. In-context navigation is the circular icon-menu button (top-right HUD) opening a `.icon-menu` panel-solid dropdown with `screenEnter`-style entrance animation.

## Do's and Don'ts

### Do:
- **Do** pair every live/lit color state with its glow shadow and every off/idle state with the flat `--shadow-off` offset — never the reverse.
- **Do** use Titan One only for numerals and short marquee titles; keep body copy, lists, and buttons in Nunito.
- **Do** reuse the marquee-bulb-strip motif (`.hero-card::before` / `.word-card::before`) as the one recurring signature ornament on plinth-style panels; don't invent a second competing ornament.
- **Do** keep the landscape three-column `pass | word | correct` grid as the primary active-play layout; it is this world's answer to one-handed mid-round play.

### Don't:
- **Don't** introduce a soft blur/glass treatment as a working depth technique — `--blur-glass` is deliberately `none`; the world's material is flat-panel-plus-glow, not frosted glass. (Some component classes still reference `var(--blur-glass)`; this is inert legacy CSS, not a token to build on.)
- **Don't** use a cool, muted, or glassy dark-mode palette anywhere in this world — the direction contract explicitly rejects "premium minimalist" dark mode as a predictable opposite.
- **Don't** reintroduce emoji or an icon font for UI chrome (buttons, menus, HUD) — the system already replaced all UI emoji with the single stroke-SVG set in `src/components/icons.tsx` (24×24, 2px stroke, round caps, `currentColor`). Word-category emoji sourced from the word-bank data (e.g. category chips in `CategoryPickerSheet`) are pre-existing content, not a UI icon convention — don't extend that pattern to new UI surfaces.
- **Don't** treat `src/components/scoreboard/*View.tsx`, `StreamOverlayHUD.tsx`, or `AdminScreen.tsx`/its `Admin*` subcomponents as carrying this system — they were only mechanically touched (blur removed, worst gradient-text/bounce findings fixed) and still run their own bespoke Tailwind purple/pink/emerald gradient palette unrelated to these tokens. This is a documented, deferred gap, not part of the shipped design system: do not copy their colors or gradients into new work, and do not treat their partial token adoption (a few `font-display`/`text-yellow`/`rounded-card` classes in `AdminScreen.tsx`) as proof the whole file is on-system.
