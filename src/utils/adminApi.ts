// Client for the admin-words Supabase Edge Function. The function itself
// is the only place that holds the real secrets (Gemini key, service-role
// key); it has no auth of its own, so anything reachable from #admin is
// reachable by anyone who finds that route.
export interface PendingWord {
  id: string;
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  isNewCategory: boolean;
  text: string;
}

export interface LocalWord {
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  isNewCategory: boolean;
  text: string;
}

export interface FlaggedWord {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
  active: boolean;
  flaggedCount: number;
}

export interface DeactivatedWord {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
  flaggedCount: number;
}

export interface SimilarWord {
  id: string;
  text: string;
}

// UI-side wrapper around a suggest-similar request for one deactivated
// word: not part of the wire format, but shared between AdminScreen (which
// fetches it) and AdminFlaggedWordsQueue (which renders it).
export interface SimilarWordSuggestions {
  status: "loading" | "done" | "error";
  items: SimilarWord[];
  // The reason the admin gave for deactivating the word these were
  // suggested from, if any — inherited when logging a decision for an
  // accepted suggestion, since it shares the same underlying problem.
  reason?: string;
}

export interface CategoryHealth {
  categoryId: string;
  categoryLabel: string;
  categoryEmoji: string;
  totalWords: number;
  activeWords: number;
  flaggedWords: number;
  correct: number;
  skipped: number;
  guidance: string | null;
  decisionsSinceGuidance: number;
}

export type CurationDecision = "approved" | "rejected" | "deactivated";

export interface CategoryWord {
  id: string;
  text: string;
  active: boolean;
}

// UI-side wrapper around a list-category-words request for one category —
// not part of the wire format, shared between AdminScreen (which fetches
// it) and AdminCategoryHealth (which renders it).
export interface CategoryWordsState {
  status: "loading" | "done" | "error";
  items: CategoryWord[];
}

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

type Action =
  | "generate"
  | "publish"
  | "list-flagged"
  | "list-deactivated"
  | "deactivate"
  | "reactivate"
  | "suggest-similar"
  | "category-health"
  | "list-category-words"
  | "record-decision"
  | "refine-guidance";

async function callAdminWords<T>(action: Action, payload: Record<string, unknown>): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/functions/v1/admin-words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new AdminApiError(data.error ?? "Request failed", response.status);
  }
  return data as T;
}

export async function generateWords(
  instructions?: string,
  localWords?: LocalWord[]
): Promise<PendingWord[]> {
  const { candidates } = await callAdminWords<{ candidates: PendingWord[] }>("generate", {
    instructions,
    localWords,
  });
  return candidates;
}

export async function publishWords(words: LocalWord[]): Promise<number> {
  const { published } = await callAdminWords<{ published: number }>("publish", { words });
  return published;
}

export async function listFlaggedWords(): Promise<FlaggedWord[]> {
  const { flagged } = await callAdminWords<{ flagged: FlaggedWord[] }>("list-flagged", {});
  return flagged;
}

export async function deactivateWords(ids: string[]): Promise<void> {
  await callAdminWords("deactivate", { ids });
}

export async function listDeactivatedWords(): Promise<DeactivatedWord[]> {
  const { deactivated } = await callAdminWords<{ deactivated: DeactivatedWord[] }>(
    "list-deactivated",
    {}
  );
  return deactivated;
}

export async function reactivateWords(ids: string[]): Promise<void> {
  await callAdminWords("reactivate", { ids });
}

export async function suggestSimilarWords(wordId: string, reason?: string): Promise<SimilarWord[]> {
  const { suggestions } = await callAdminWords<{ suggestions: SimilarWord[] }>("suggest-similar", {
    wordId,
    reason,
  });
  return suggestions;
}

export async function getCategoryHealth(): Promise<CategoryHealth[]> {
  const { categories } = await callAdminWords<{ categories: CategoryHealth[] }>("category-health", {});
  return categories;
}

export async function listCategoryWords(categoryId: string): Promise<CategoryWord[]> {
  const { words } = await callAdminWords<{ words: CategoryWord[] }>("list-category-words", {
    categoryId,
  });
  return words;
}

export async function recordCurationDecision(
  categoryId: string,
  text: string,
  decision: CurationDecision,
  reason?: string
): Promise<void> {
  await callAdminWords("record-decision", { categoryId, text, decision, reason });
}

export async function refineCategoryGuidance(categoryId: string): Promise<string> {
  const { guidance } = await callAdminWords<{ guidance: string }>("refine-guidance", { categoryId });
  return guidance;
}
