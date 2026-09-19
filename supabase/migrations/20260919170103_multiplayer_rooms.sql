-- Distributed multiplayer: every player on their own device, no shared
-- display. All three tables are written only by the multiplayer edge
-- function's service-role client — RLS is enabled with zero policies, so
-- an anon client can never read room_players.player_token (the only thing
-- standing in for auth here) or peek at room_state's word bank/current
-- word. Clients get everything they're allowed to see through edge
-- function responses (lobby snapshot, realtime broadcast of redacted
-- public state) instead of direct table access.

create table rooms (
  code text primary key,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'roundSummary', 'gameOver')),
  rounds_per_team int not null,
  round_duration_sec int not null,
  category_ids text[] not null,
  team_names text[] not null,
  created_at timestamptz not null default now()
);

create table room_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  player_token uuid not null default gen_random_uuid(),
  name text not null,
  team_index int not null,
  join_order int not null,
  created_at timestamptz not null default now()
);

create index room_players_room_code_idx on room_players(room_code);

-- Full authoritative game state, including the parts that must never
-- reach a client directly: word_bank, deck_order, current_word. The edge
-- function reads this row to run turnLogic, writes the result back, and
-- derives a redacted payload (no word_bank/deck_order/current_word) for
-- the realtime broadcast and for any client-facing "get state" response.
create table room_state (
  room_code text primary key references rooms(code) on delete cascade,
  turn_order int[] not null,
  turn_index int not null,
  teams jsonb not null,
  round_score int not null default 0,
  round_log jsonb not null default '[]'::jsonb,
  word_bank text[] not null,
  deck_order text[] not null,
  deck_index int not null,
  current_word text not null,
  turn_started_at timestamptz not null default now(),
  penalty_sec int not null default 0,
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table room_players enable row level security;
alter table room_state enable row level security;
