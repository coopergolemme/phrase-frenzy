-- Server-authoritative pause: a null paused_at means the turn's timer is
-- running normally (remainingSeconds anchors off turn_started_at as
-- before); a non-null paused_at freezes remainingSeconds at that instant
-- until togglePause resumes by shifting turn_started_at forward by the
-- elapsed pause duration, so no separate accumulated-pause column is
-- needed. See supabase/functions/multiplayer/index.ts.
alter table room_state
  add column paused_at timestamptz;

alter table room_public_state
  add column paused_at timestamptz;
