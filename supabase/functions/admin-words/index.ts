// Password-gated admin endpoint for generating, reviewing, and
// approving/rejecting candidate words before they go live in the game.
// Deployed as a Supabase Edge Function; holds SUPABASE_SERVICE_ROLE_KEY
// (auto-injected by the Edge Runtime), GEMINI_API_KEY, and ADMIN_PASSWORD
// as function secrets — none of these ever reach the client bundle. See
// docs/superpowers/specs/2026-09-12-admin-word-curation-design.md.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPrompt, dedupeAgainstExisting, type CategoryRow, type WordRow } from "./curation.ts";
import { callGeminiForWords } from "./gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-password",
};

interface PendingWordDto {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
}

interface FlaggedWordMatchDto {
  id: string;
  categoryId: string;
  categoryLabel: string;
  active: boolean;
}

interface FlaggedWordDto {
  word: string;
  flaggedAt: string;
  matches: FlaggedWordMatchDto[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPassword || req.headers.get("x-admin-password") !== adminPassword) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { action?: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (body.action) {
      case "list-pending":
        return json({ pending: await listPending(client) });
      case "list-flagged":
        return json({ flagged: await listFlagged(client) });
      case "deactivate": {
        const ids = body.ids as string[];
        const { error } = await client.from("words").update({ active: false }).in("id", ids);
        if (error) throw error;
        return json({ deactivated: ids });
      }
      case "generate":
        return json({
          inserted: await generate(
            client,
            body.categoryId as string | undefined,
            body.count as number,
            body.instructions as string | undefined
          ),
        });
      case "approve": {
        const ids = body.ids as string[];
        const { error } = await client.from("words").update({ active: true }).in("id", ids);
        if (error) throw error;
        return json({ approved: ids });
      }
      case "reject": {
        const ids = body.ids as string[];
        const { error } = await client.from("words").delete().in("id", ids);
        if (error) throw error;
        return json({ rejected: ids });
      }
      case "edit": {
        const id = body.id as string;
        const text = body.text as string;
        const { error } = await client.from("words").update({ text }).eq("id", id).eq("active", false);
        if (error) throw error;
        return json({ id, text });
      }
      default:
        return json({ error: `Unknown action "${body.action}"` }, 400);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

async function categoryLabelMap(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from("categories").select("id, label");
  if (error) throw error;
  return new Map((data ?? []).map((c: { id: string; label: string }) => [c.id, c.label]));
}

async function listPending(client: SupabaseClient): Promise<PendingWordDto[]> {
  const [wordsResult, labels] = await Promise.all([
    client.from("words").select("id, category_id, text").eq("active", false).order("category_id"),
    categoryLabelMap(client),
  ]);
  if (wordsResult.error) throw wordsResult.error;

  return (wordsResult.data ?? []).map((row: { id: string; category_id: string; text: string }) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryLabel: labels.get(row.category_id) ?? row.category_id,
    text: row.text,
  }));
}

async function listFlagged(client: SupabaseClient): Promise<FlaggedWordDto[]> {
  const [flaggedResult, wordsResult, labels] = await Promise.all([
    client.from("flagged_words").select("word, flagged_at").order("flagged_at", { ascending: false }),
    client.from("words").select("id, category_id, text, active"),
    categoryLabelMap(client),
  ]);
  if (flaggedResult.error) throw flaggedResult.error;
  if (wordsResult.error) throw wordsResult.error;

  const wordsByLowerText = new Map<
    string,
    { id: string; category_id: string; text: string; active: boolean }[]
  >();
  for (const row of (wordsResult.data ?? []) as {
    id: string;
    category_id: string;
    text: string;
    active: boolean;
  }[]) {
    const key = row.text.toLowerCase();
    const list = wordsByLowerText.get(key) ?? [];
    list.push(row);
    wordsByLowerText.set(key, list);
  }

  return (flaggedResult.data ?? []).map((row: { word: string; flagged_at: string }) => ({
    word: row.word,
    flaggedAt: row.flagged_at,
    matches: (wordsByLowerText.get(row.word.toLowerCase()) ?? []).map((match) => ({
      id: match.id,
      categoryId: match.category_id,
      categoryLabel: labels.get(match.category_id) ?? match.category_id,
      active: match.active,
    })),
  }));
}

async function generate(
  client: SupabaseClient,
  categoryId: string | undefined,
  count: number,
  instructions?: string
): Promise<PendingWordDto[]> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client.from("words").select("category_id, text");
  if (wordError) throw wordError;

  const allCategories = (categoryRows ?? []) as CategoryRow[];
  const categories = categoryId ? allCategories.filter((c) => c.id === categoryId) : allCategories;
  if (categories.length === 0) {
    throw new Error(categoryId ? `Unknown category id "${categoryId}"` : "No categories found");
  }

  const existingWordsByCategory = new Map<string, string[]>();
  const existingWordSetByCategory = new Map<string, Set<string>>();
  for (const row of (wordRows ?? []) as WordRow[]) {
    const list = existingWordsByCategory.get(row.category_id) ?? [];
    list.push(row.text);
    existingWordsByCategory.set(row.category_id, list);

    const set = existingWordSetByCategory.get(row.category_id) ?? new Set();
    set.add(row.text.toLowerCase());
    existingWordSetByCategory.set(row.category_id, set);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildPrompt(categories, existingWordsByCategory, count, instructions);
  const rawBatches = await callGeminiForWords(prompt, apiKey);
  const accepted = dedupeAgainstExisting(
    rawBatches,
    new Set(categories.map((c) => c.id)),
    existingWordSetByCategory
  );

  const rows = [...accepted.entries()].flatMap(([catId, words]) =>
    words.map((text) => ({ category_id: catId, text, active: false }))
  );
  if (rows.length === 0) return [];

  const { data: inserted, error: insertError } = await client
    .from("words")
    .insert(rows)
    .select("id, category_id, text");
  if (insertError) throw insertError;

  const labels = await categoryLabelMap(client);
  return (inserted ?? []).map((row: { id: string; category_id: string; text: string }) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryLabel: labels.get(row.category_id) ?? row.category_id,
    text: row.text,
  }));
}
