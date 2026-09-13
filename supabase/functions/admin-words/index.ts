// Password-gated admin endpoint for generating and publishing candidate
// words. Generated candidates are NOT persisted — the client reviews them
// entirely client-side (approve/reject/edit are local state) and only
// calls "publish" once, with the final approved set, when the admin
// navigates away from the admin screen. A candidate's category is decided
// by the model itself from the admin's prompt: it either reuses an
// existing category or proposes a brand-new one, which only gets inserted
// into the db at publish time (and only if at least one of its words was
// approved). Deployed as a Supabase Edge Function; holds
// SUPABASE_SERVICE_ROLE_KEY (auto-injected by the Edge Runtime),
// GEMINI_API_KEY, and ADMIN_PASSWORD as function secrets — none of these
// ever reach the client bundle. See
// docs/superpowers/specs/2026-09-12-admin-word-curation-design.md.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPrompt, dedupeAgainstExisting, type KnownCategory, type WordRow } from "./curation.ts";
import { callGeminiForWords } from "./gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-password",
};

interface PendingWordDto {
  id: string;
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  isNewCategory: boolean;
  text: string;
}

interface LocalWordDto {
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  isNewCategory: boolean;
  text: string;
}

interface FlaggedWordDto {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
  active: boolean;
  flaggedCount: number;
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
  const [wordsResult, labels] = await Promise.all([
    client
      .from("words")
      .select("id, category_id, text, active, flagged_count")
      .gt("flagged_count", 0)
      .order("flagged_count", { ascending: false }),
    categoryLabelMap(client),
  ]);
  if (wordsResult.error) throw wordsResult.error;

  return (wordsResult.data ?? []).map(
    (row: { id: string; category_id: string; text: string; active: boolean; flagged_count: number }) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryLabel: labels.get(row.category_id) ?? row.category_id,
      text: row.text,
      active: row.active,
      flaggedCount: row.flagged_count,
    })
  );
}

async function generate(
  client: SupabaseClient,
  instructions: string | undefined,
  localWords: LocalWordDto[]
): Promise<PendingWordDto[]> {
  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, label, emoji, sort_order")
    .order("sort_order");
  if (categoryError) throw categoryError;

  const { data: wordRows, error: wordError } = await client.from("words").select("category_id, text");
  if (wordError) throw wordError;

  const knownCategories: KnownCategory[] = (categoryRows ?? []).map(
    (c: { id: string; label: string; emoji: string }) => ({
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      isNewCategory: false,
    })
  );
  const knownIds = new Set(knownCategories.map((c) => c.id));
  for (const local of localWords) {
    if (local.isNewCategory && !knownIds.has(local.categoryId)) {
      knownIds.add(local.categoryId);
      knownCategories.push({
        id: local.categoryId,
        label: local.categoryLabel,
        emoji: local.categoryEmoji,
        isNewCategory: true,
      });
    }
  }

  const existingWordsByCategory = new Map<string, string[]>();
  const existingWordSetByCategory = new Map<string, Set<string>>();
  const addExisting = (categoryId: string, text: string) => {
    const list = existingWordsByCategory.get(categoryId) ?? [];
    list.push(text);
    existingWordsByCategory.set(categoryId, list);

    const set = existingWordSetByCategory.get(categoryId) ?? new Set();
    set.add(text.toLowerCase());
    existingWordSetByCategory.set(categoryId, set);
  };
  for (const row of (wordRows ?? []) as WordRow[]) addExisting(row.category_id, row.text);
  // Words already generated (and possibly approved) earlier in this admin
  // session, not yet published to the db — avoid regenerating them.
  for (const local of localWords) addExisting(local.categoryId, local.text);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildPrompt(knownCategories, existingWordsByCategory, instructions);
  const rawBatches = await callGeminiForWords(prompt, apiKey);
  const accepted = dedupeAgainstExisting(rawBatches, knownCategories, existingWordSetByCategory);

  return accepted.flatMap((category) =>
    category.words.map((text) => ({
      id: crypto.randomUUID(),
      categoryId: category.categoryId,
      categoryLabel: category.label,
      categoryEmoji: category.emoji,
      isNewCategory: category.isNewCategory,
      text,
    }))
  );
}

async function resolveCategoryId(
  client: SupabaseClient,
  label: string,
  emoji: string,
  nextSortOrder: () => number
): Promise<string> {
  // Someone may have already created an equivalent category (a prior
  // publish this session, or a manual edit) — reuse it rather than making
  // a near-duplicate.
  const { data: existingByLabel, error: labelLookupError } = await client
    .from("categories")
    .select("id")
    .ilike("label", label)
    .limit(1);
  if (labelLookupError) throw labelLookupError;
  if (existingByLabel && existingByLabel.length > 0) {
    return (existingByLabel[0] as { id: string }).id;
  }

  const slug =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category";

  let candidateId = slug;
  let suffix = 2;
  for (;;) {
    const { data: collision, error: collisionError } = await client
      .from("categories")
      .select("id")
      .eq("id", candidateId)
      .limit(1);
    if (collisionError) throw collisionError;
    if (!collision || collision.length === 0) break;
    candidateId = `${slug}-${suffix}`;
    suffix += 1;
  }

  const { error: insertError } = await client
    .from("categories")
    .insert({ id: candidateId, label, emoji, sort_order: nextSortOrder() });
  if (insertError) throw insertError;

  return candidateId;
}

async function publish(client: SupabaseClient, words: LocalWordDto[]): Promise<number> {
  const trimmed = words
    .map((w) => ({ ...w, text: w.text.trim() }))
    .filter((w) => w.text.length > 0);
  if (trimmed.length === 0) return 0;

  // Resolve each distinct new-category label to a real category id once,
  // even if multiple words were approved under it.
  const resolvedIds = new Map<string, string>();
  const newCategoryWords = trimmed.filter((w) => w.isNewCategory);
  if (newCategoryWords.length > 0) {
    const { data: sortOrderRows, error: sortOrderError } = await client
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (sortOrderError) throw sortOrderError;
    let sortOrderCounter =
      ((sortOrderRows?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1;
    const nextSortOrder = () => sortOrderCounter++;

    for (const word of newCategoryWords) {
      if (resolvedIds.has(word.categoryId)) continue;
      resolvedIds.set(
        word.categoryId,
        await resolveCategoryId(client, word.categoryLabel, word.categoryEmoji, nextSortOrder)
      );
    }
  }

  const rows = trimmed.map((w) => ({
    category_id: w.isNewCategory ? resolvedIds.get(w.categoryId)! : w.categoryId,
    text: w.text,
    active: true,
  }));

  const { error } = await client.from("words").insert(rows);
  if (error) throw error;
  return rows.length;
}
