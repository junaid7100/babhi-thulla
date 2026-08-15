export interface StoredSession {
  roomCode: string;
  playerId: string;
  playerSecret: string;
  displayName: string;
}

const KEY = "bhabhi-thulla:session";

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function saveDisplayName(name: string): void {
  try {
    localStorage.setItem("bhabhi-thulla:displayName", name);
  } catch {
    /* ignore */
  }
}

export function loadDisplayName(): string {
  try {
    return localStorage.getItem("bhabhi-thulla:displayName") || "";
  } catch {
    return "";
  }
}
