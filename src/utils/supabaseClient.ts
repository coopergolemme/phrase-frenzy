import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, anonKey);
}
