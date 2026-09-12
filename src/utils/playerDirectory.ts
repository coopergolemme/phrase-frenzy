import { getSupabaseClient } from "./supabaseClient";

const MAX_KNOWN_PLAYERS = 100;

export async function fetchKnownPlayerNames(): Promise<string[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("players")
    .select("name")
    .order("last_played_at", { ascending: false })
    .limit(MAX_KNOWN_PLAYERS);
  if (error) throw error;

  return (data ?? []).map((row) => (row as { name: string }).name);
}
