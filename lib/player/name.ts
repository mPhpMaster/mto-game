'use client';

/** Persisted display name for online play. */
export const PLAYER_NAME_KEY = 'mto-player-name';
const LEGACY_NAME_KEY = 'mto-name';

export const PLAYER_NAME_MIN = 2;
export const PLAYER_NAME_MAX = 20;

let current: string | null = null;
const listeners = new Set<() => void>();

function readStoredName(): string {
  try {
    const saved =
      window.localStorage.getItem(PLAYER_NAME_KEY) ??
      window.localStorage.getItem(LEGACY_NAME_KEY);
    return saved ?? '';
  } catch {
    return '';
  }
}

export function normalizePlayerName(raw: string): string {
  return raw.trim().slice(0, PLAYER_NAME_MAX);
}

/** Returns an i18n key for the validation error, or null when valid. */
export function playerNameErrorKey(raw: string): 'nameRequired' | 'nameTooShort' | 'nameTooLong' | null {
  const n = normalizePlayerName(raw);
  if (!n) return 'nameRequired';
  if (n.length < PLAYER_NAME_MIN) return 'nameTooShort';
  if (n.length > PLAYER_NAME_MAX) return 'nameTooLong';
  return null;
}

export function isValidPlayerName(raw: string): boolean {
  return playerNameErrorKey(raw) === null;
}

export function getPlayerNameSnapshot(): string {
  if (current === null) current = readStoredName();
  return current;
}

export const getServerPlayerNameSnapshot = (): string => '';

export function subscribePlayerName(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writePlayerName(raw: string): string {
  const next = normalizePlayerName(raw);
  current = next;
  try {
    if (next) {
      window.localStorage.setItem(PLAYER_NAME_KEY, next);
      window.localStorage.removeItem(LEGACY_NAME_KEY);
    } else {
      window.localStorage.removeItem(PLAYER_NAME_KEY);
    }
  } catch {
    // local storage may be disabled — name still applies this session
  }
  for (const l of listeners) l();
  return next;
}
