---
version: 1
slug: "app"
primary_target: "app"
related_targets: []
---

# App — whole-app redesign

Scope: whole app, one committed visual world — home, team setup, game
screen, round summary, final standings, multiplayer (lobby/scoreboard/
spectator), and admin. Mode: Operate (task completion under time pressure
is the dominant surface; the home screen's invitation to play stays inside
this same world rather than swinging Persuade).

Must preserve: fast, one-handed play mid-round — the word, timer, and
pass/correct controls must stay legible and thumb-reachable at a glance
while the phone is being handed around a room. All existing functionality
and copy carry over; this is a re-skin of behavior that already works, not
a rewrite of the game.

## Direction contract

THESIS: every round plays like a buzzer round on a live TV gameshow — the
screen IS the host desk's countdown display, not a card describing a game.
The category default this refuses is the flat rounded "quiz app" card
(gradient background, generic bold sans, sticker emoji); the predictable
opposite it also refuses is a muted, glassy "premium minimalist" dark mode.
Both read as generic software; this reads as a live broadcast moment.

OWN-WORLD: warm stage-light palette — near-black stage ground, amber and
red as the working ring-in/warning colors, gold reserved for the win/round
state. Glowing bulb-and-lamp ink (soft light blooms, not flat LED
segments) for every readout: the timer is a lit numeral plinth, correct/
pass are tally lamps that light up and stay lit, not toast notifications.
Raised from two declined challengers: (1) RAISED FROM precisionist
industrial-plate challenger — inactive/off-turn state is a hard flat
graphic shadow, no soft gradient or blur, so "whose turn/light is on" is
never ambiguous; (2) RAISED FROM drum-machine step-row challenger — the
countdown carries a rhythmic chase-light pulse around the timer as seconds
run low, giving the last few seconds a felt urgency rather than a static
number change.

STORY: the passer understands instantly "I'm live, the clock is running,
my team's lamp is lit" — no onboarding needed. They believe the game is
happening right now, not idling in a menu. They act by describing the word
before the buzzer, tapping correct/pass as tally lamps light in real time,
and handing the phone off as the round light snaps to the next team.

FIRST VIEWPORT (game screen, the surface this contract is proven on): word
centered on a lit host-desk plinth at the vertical center; a segmented/lamp
timer numeral directly above it, chase-light pulsing in the final seconds;
ring-in style correct/pass controls anchored at the thumb-reachable bottom
edge; the current team's tally lamps in a strip along the top, lit lamps
warm and glowing, the other team's strip dropped into flat hard shadow per
the raised state rule. Primary actions (correct/pass) sit exactly where a
thumb rests holding the phone one-handed.

FORM: Gameshow Buzzer Board — IMPECCABLE'S PICK from the direction
concept-seed roll (assigned direction was Stadium Scoreboard Jumbotron;
this pick card was chosen instead). Seed key: d971ca58 (mode: operate).

FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, DESIGN.md, and every shipping raster
carrying its provenance.

## Unresolved decisions

- Exact accent hues, typeface pairing, and lamp/bulb texture treatment are
  build-time decisions within this world, not yet locked.
- Admin (`/#admin`) screen: in scope per user answer ("whole app, one new
  visual world") but is an internal ops tool — apply the same world's
  restrained/Operate register there (functional data density over
  spectacle), not the full game-screen theatricality.
- Multiplayer spectator/scoreboard screens: this world's "tally lamp"
  language extends naturally to a live shared scoreboard; confirm during
  build that lamp animation stays legible at a glance for a passive
  viewer, not just the active passer.
