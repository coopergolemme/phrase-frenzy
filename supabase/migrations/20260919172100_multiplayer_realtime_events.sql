-- Switches multiplayer's client push from the edge function manually
-- POSTing to Realtime's stateless Broadcast REST endpoint over to
-- Supabase's built-in Postgres Changes (CDC): the edge function just
-- writes an UPDATE to this tiny per-room row after anything changes, and
-- Realtime delivers that change event to subscribers itself — no
-- custom fetch/topic bookkeeping in application code.
--
-- room_events carries no game data at all (not even a monotonic counter —
-- see the edge function's touchRoomEvent, which relies on the fact that
-- Postgres emits a change event for every UPDATE statement executed,
-- whether or not any column's value actually differs). It's purely a
-- "something changed in this room, go re-fetch" signal, which sidesteps
-- the word-secrecy problem entirely: there's nothing here to leak, so a
-- public read policy is safe. Clients still fetch the real (redacted)
-- lobby/game state from the multiplayer edge function, same as before.
create table room_events (
  room_code text primary key references rooms(code) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table room_events enable row level security;

create policy "public read room_events" on room_events
  for select using (true);

-- Realtime only streams changes for tables added to this publication.
alter publication supabase_realtime add table room_events;
