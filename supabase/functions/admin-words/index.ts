// Password-gated admin endpoint for generating and publishing candidate
// words. Generated candidates are NOT persisted — the client reviews them
// entirely client-side (approve/reject/edit are local state) and only
// calls "publish" once, with the final approved set, when the admin
// navigates away from the admin screen. Deployed as a Supabase Edge
// Function; holds SUPABASE_SERVICE_ROLE_KEY (auto-injected by the Edge
// Runtime), GEMINI_API_KEY, and ADMIN_PASSWORD as function secrets — none
// of these ever reach the client bundle. See
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

interface LocalWordDto {
  categoryId: string;
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

// Catches non-Error throws too (DOMException from a failed/aborted fetch,
// for example, doesn't pass `instanceof Error` in every runtime) so the
// client always gets the real failure reason instead of a generic message.
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
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
          candidates: await generate(
            client,
            body.categoryId as string | undefined,
            body.count as number,
            body.instructions as string | undefined,
            (body.localWords as LocalWordDto[] | undefined) ?? []
          ),
        });
      case "publish": {
        const words = (body.words as LocalWordDto[] | undefined) ?? [];
        return json({ published: await publish(client, words) });
      }
      default:
        return json({ error: `Unknown action "${body.action}"` }, 400);
    }
  } catch (error) {
    console.error("admin-words error", error);
    return json({ error: extractErrorMessage(error) }, 500);
  }
});

async function categoryLabelMap(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from("categories").select("id, label");
  if (error) throw error;
  return new Map((data ?? []).map((c: { id: string; label: string }) => [c.id, c.label]));
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
  instructions: string | undefined,
  localWords: LocalWordDto[]
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
  const addExisting = (row: { category_id: string; text: string }) => {
    const list = existingWordsByCategory.get(row.category_id) ?? [];
    list.push(row.text);
    existingWordsByCategory.set(row.category_id, list);

    const set = existingWordSetByCategory.get(row.category_id) ?? new Set();
    set.add(row.text.toLowerCase());
    existingWordSetByCategory.set(row.category_id, set);
  };
  for (const row of (wordRows ?? []) as WordRow[]) addExisting(row);
  // Words already generated (and possibly approved) earlier in this admin
  // session, not yet published to the db — avoid regenerating them.
  for (const local of localWords) addExisting({ category_id: local.categoryId, text: local.text });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildPrompt(categories, existingWordsByCategory, count, instructions);
  const rawBatches = await callGeminiForWords(prompt, apiKey);
  const accepted = dedupeAgainstExisting(
    rawBatches,
    new Set(categories.map((c) => c.id)),
    existingWordSetByCategory
  );

  const labels = await categoryLabelMap(client);
  return [...accepted.entries()].flatMap(([catId, words]) =>
    words.map((text) => ({
      id: crypto.randomUUID(),
      categoryId: catId,
      categoryLabel: labels.get(catId) ?? catId,
      text,
    }))
  );
}

async function publish(client: SupabaseClient, words: LocalWordDto[]): Promise<number> {
  const rows = words
    .map((w) => ({ category_id: w.categoryId, text: w.text.trim(), active: true }))
    .filter((w) => w.text.length > 0);
  if (rows.length === 0) return 0;

  const { error } = await client.from("words").insert(rows);
  if (error) throw error;
  return rows.length;
}
