'use client';

export const FRIENDS_STORAGE_KEY = 'mto-friends';

export type Friend = {
  id: string;
  name: string;
  /** Optional last-known online id if the system exposes one later. */
  playerId?: string;
};

let current: Friend[] | null = null;
const listeners = new Set<() => void>();

function readStoredFriends(): Friend[] {
  try {
    const raw = window.localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (f): f is Friend =>
          typeof f === 'object' &&
          f !== null &&
          typeof (f as Friend).id === 'string' &&
          typeof (f as Friend).name === 'string'
      )
      .map((f) => ({
        id: f.id,
        name: f.name.trim().slice(0, 20),
        playerId: typeof f.playerId === 'string' ? f.playerId : undefined,
      }))
      .filter((f) => f.name.length >= 2);
  } catch {
    return [];
  }
}

function persistFriends(list: Friend[]): void {
  current = list;
  try {
    window.localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage disabled — list still works this session
  }
  for (const l of listeners) l();
}

export function getFriendsSnapshot(): Friend[] {
  if (current === null) current = readStoredFriends();
  return current;
}

export const getServerFriendsSnapshot = (): Friend[] => [];

export function subscribeFriends(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addFriend(name: string, playerId?: string): Friend | null {
  const trimmed = name.trim().slice(0, 20);
  if (trimmed.length < 2) return null;
  const list = [...getFriendsSnapshot()];
  const existing = list.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const friend: Friend = {
    id: crypto.randomUUID(),
    name: trimmed,
    playerId: playerId?.trim() || undefined,
  };
  persistFriends([friend, ...list]);
  return friend;
}

export function removeFriend(id: string): void {
  persistFriends(getFriendsSnapshot().filter((f) => f.id !== id));
}
