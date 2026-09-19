// Persists the current device's multiplayer identity so a reloaded or
// backgrounded tab can resubscribe and resume instead of losing its slot
// in the room. Mirrors gameStateStorage.ts's try/catch-and-fail-silently
// pattern for localStorage access (private browsing, quota, etc).
const STORAGE_KEY = "phrase-frenzy:mp-session";

export interface MultiplayerSession {
  roomCode: string;
  playerToken: string;
  playerId: string;
  name: string;
}

function isValidSession(value: unknown): value is MultiplayerSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.roomCode === "string" &&
    typeof v.playerToken === "string" &&
    typeof v.playerId === "string" &&
    typeof v.name === "string"
  );
}

export function loadMultiplayerSession(): MultiplayerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMultiplayerSession(session: MultiplayerSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearMultiplayerSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
