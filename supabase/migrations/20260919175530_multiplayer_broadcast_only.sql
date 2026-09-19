-- Live updates now go over Realtime Broadcast (pushed directly by the
-- multiplayer edge function after each write, see
-- supabase/functions/multiplayer/index.ts) instead of Postgres Changes,
-- which was adding CDC/WAL-tailing latency to every update. These tables
-- are still read directly via RLS on initial load/reconnect, but no
-- longer need to be in the Realtime publication.
alter publication supabase_realtime drop table rooms;
alter publication supabase_realtime drop table room_roster;
alter publication supabase_realtime drop table room_public_state;
