import { getSupabaseClient } from "./supabaseClient";
import type { Lobby, PublicGameState } from "./multiplayerApi";

// Subscribes to the broadcast-only realtime channel the multiplayer edge
// function pushes to after every action. No RLS/auth needed on this
// channel — it's ephemeral pub/sub, not a table read, and only ever
// carries the already-redacted payloads the edge function builds (see
// toPublicState in supabase/functions/multiplayer/index.ts).
export function subscribeToRoomChannel(
  roomCode: string,
  handlers: {
    onLobby?: (lobby: Lobby) => void;
    onState?: (state: PublicGameState) => void;
  }
): () => void {
  const client = getSupabaseClient();
  const channel = client.channel(`room:${roomCode}`);

  if (handlers.onLobby) {
    channel.on("broadcast", { event: "lobby" }, ({ payload }) => {
      handlers.onLobby!(payload as Lobby);
    });
  }
  if (handlers.onState) {
    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      handlers.onState!(payload as PublicGameState);
    });
  }

  channel.subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
