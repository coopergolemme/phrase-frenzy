// Activates every word inserted as inactive by scripts/curate-words.ts, once
// you've reviewed the printed batch and are happy with it. If a batch has
// bad entries, delete those rows in Supabase before running this.
//
// Usage:
//   npm run activate:words
// Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env (falls
// back to whatever's already in the environment).
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile();
} catch {
  // No .env file — fall back to vars already present in the environment.
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  const client = createClient(url, serviceRoleKey);

  const { data, error } = await client
    .from("words")
    .update({ active: true })
    .eq("active", false)
    .select("id");
  if (error) throw error;

  console.log(`Activated ${data?.length ?? 0} word(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
