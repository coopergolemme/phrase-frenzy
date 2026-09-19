-- The deck order is fully determined by (word_bank, deck_seed) via a
-- deterministic shuffle (see shuffleWithSeed in
-- supabase/functions/_shared/turnLogic.ts) — persisting the entire
-- shuffled word_bank a second time as deck_order was redundant. Only the
-- seed + a pointer into it need to survive across requests/reshuffles.
alter table room_state
  drop column deck_order,
  add column deck_seed bigint not null default 0;
