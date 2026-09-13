// Client for the admin-words Supabase Edge Function. Sends the shared
// admin password as a header on every call; the function itself is the
// only place that holds the real secrets (Gemini key, service-role key).
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
  | "category-health";

async function callAdminWords<T>(
  action: Action,
  payload: Record<string, unknown>,
  password: string
): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/functions/v1/admin-words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-admin-password": password,
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
  password: string,
  instructions?: string,
  localWords?: LocalWord[]
): Promise<PendingWord[]> {
  const { candidates } = await callAdminWords<{ candidates: PendingWord[] }>(
    "generate",
    { instructions, localWords },
    password
  );
  return candidates;
}

export async function publishWords(password: string, words: LocalWord[]): Promise<number> {
  const { published } = await callAdminWords<{ published: number }>("publish", { words }, password);
  return published;
}

export async function listFlaggedWords(password: string): Promise<FlaggedWord[]> {
  const { flagged } = await callAdminWords<{ flagged: FlaggedWord[] }>("list-flagged", {}, password);
  return flagged;
}

export async function deactivateWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("deactivate", { ids }, password);
}

export async function listDeactivatedWords(password: string): Promise<DeactivatedWord[]> {
  const { deactivated } = await callAdminWords<{ deactivated: DeactivatedWord[] }>(
    "list-deactivated",
    {},
    password
  );
  return deactivated;
}

export async function reactivateWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("reactivate", { ids }, password);
}

export async function suggestSimilarWords(
  password: string,
  wordId: string,
  reason?: string
): Promise<SimilarWord[]> {
  const { suggestions } = await callAdminWords<{ suggestions: SimilarWord[] }>(
    "suggest-similar",
    { wordId, reason },
    password
  );
  return suggestions;
}

export async function getCategoryHealth(password: string): Promise<CategoryHealth[]> {
  const { categories } = await callAdminWords<{ categories: CategoryHealth[] }>(
    "category-health",
    {},
    password
  );
  return categories;
}
