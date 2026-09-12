// Client for the admin-words Supabase Edge Function. Sends the shared
// admin password as a header on every call; the function itself is the
// only place that holds the real secrets (Gemini key, service-role key).
export interface PendingWord {
  id: string;
  categoryId: string;
  categoryLabel: string;
  text: string;
}

export interface FlaggedWordMatch {
  id: string;
  categoryId: string;
  categoryLabel: string;
  active: boolean;
}

export interface FlaggedWord {
  word: string;
  flaggedAt: string;
  matches: FlaggedWordMatch[];
}

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

type Action = "list-pending" | "generate" | "approve" | "reject" | "edit" | "list-flagged" | "deactivate";

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

export async function listPendingWords(password: string): Promise<PendingWord[]> {
  const { pending } = await callAdminWords<{ pending: PendingWord[] }>("list-pending", {}, password);
  return pending;
}

export async function generateWords(
  password: string,
  categoryId: string | undefined,
  count: number
): Promise<PendingWord[]> {
  const { inserted } = await callAdminWords<{ inserted: PendingWord[] }>(
    "generate",
    { categoryId, count },
    password
  );
  return inserted;
}

export async function approveWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("approve", { ids }, password);
}

export async function rejectWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("reject", { ids }, password);
}

export async function editWord(password: string, id: string, text: string): Promise<void> {
  await callAdminWords("edit", { id, text }, password);
}

export async function listFlaggedWords(password: string): Promise<FlaggedWord[]> {
  const { flagged } = await callAdminWords<{ flagged: FlaggedWord[] }>("list-flagged", {}, password);
  return flagged;
}

export async function deactivateWords(password: string, ids: string[]): Promise<void> {
  await callAdminWords("deactivate", { ids }, password);
}
