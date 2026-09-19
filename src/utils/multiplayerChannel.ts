import { getSupabaseClient } from "./supabaseClient";

// Subscribes to Postgres Changes on room_events for this room. The edge
// function upserts that row (see touchRoomEvent in
// supabase/functions/multiplayer/index.ts) after every action that
// changes lobby or game state; the row itself carries no game data, so
// this is just a "something changed, go re-fetch" signal delivered by
// Supabase's built-in Realtime CDC instead of a custom broadcast push —
// the caller reacts by re-fetching the real (redacted) state from the
// multiplayer edge function's getLobby/getState actions.
export function subscribeToRoomEvents(roomCode: string, onChange: () => void): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`room-events:${roomCode}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_events", filter: `room_code=eq.${roomCode}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
