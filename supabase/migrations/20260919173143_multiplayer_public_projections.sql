-- Cuts multiplayer update latency by having Realtime deliver the actual
-- state in the change payload instead of a bare "something changed" ping
-- that the client then had to go fetch over HTTP (room_events, from the
-- previous migration — superseded and dropped here). Reads (initial load
-- and every live update) now go straight from Postgres to the client via
-- RLS + Postgres Changes; only writes still go through the multiplayer
-- edge function.
--
-- None of these three tables carry anything secret: rooms' config
-- columns, the roster (name/team, no player_token), and room_public_state
-- (the same redacted projection the edge function used to broadcast — no
-- word_bank/deck_order/current_word). room_players and room_state stay
-- exactly as locked down as before.
drop table if exists room_events;

create policy "public read rooms" on rooms
  for select using (true);

create table room_roster (
  id uuid primary key,
  room_code text not null references rooms(code) on delete cascade,
  name text not null,
  team_index int not null,
  join_order int not null
);

create index room_roster_room_code_idx on room_roster(room_code);

alter table room_roster enable row level security;

create policy "public read room_roster" on room_roster
  for select using (true);

create table room_public_state (
  room_code text primary key references rooms(code) on delete cascade,
  status text not null,
  teams jsonb not null,
  turn_order int[] not null,
  turn_index int not null,
  rounds_per_team int not null,
  round_score int not null,
  round_log jsonb not null,
  turn_started_at timestamptz not null,
  duration_sec int not null,
  penalty_sec int not null,
  updated_at timestamptz not null default now()
);

alter table room_public_state enable row level security;

create policy "public read room_public_state" on room_public_state
  for select using (true);

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_roster;
alter publication supabase_realtime add table room_public_state;
