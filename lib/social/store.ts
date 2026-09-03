'use client';

import { fetchFriends, fetchInvites } from './api';
import type { FriendEdge, GameInvite } from './types';

/**
 * حالة الطبقة الاجتماعية في مخزن خارج React — نفس نمط بقيّة المشروع.
 *
 * `getSnapshot` يعيد **المرجع نفسه** ما لم تتغيّر الحالة فعلاً، وإلا دار
 * useSyncExternalStore بلا نهاية. المخزن يحمل عدّة مجموعات، فهذا أسهل خطأً
 * هنا من مخازن السلسلة الواحدة.
 */
export interface SocialState {
  edges: FriendEdge[];
  invites: GameInvite[];
  /** معرّف الصديق ← عدد رسائله غير المقروءة */
  unread: Record<string, number>;
  loaded: boolean;
}

const EMPTY: SocialState = Object.freeze({
  edges: [],
  invites: [],
  unread: {},
  loaded: false,
});

let current: SocialState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<SocialState>) {
  current = { ...current, ...next };
  emit();
}

export function getSocialSnapshot(): SocialState {
  return current;
}

export const getServerSocialSnapshot = (): SocialState => EMPTY;

export function subscribeSocial(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetSocial(): void {
  current = EMPTY;
  emit();
}

export async function reloadFriends(): Promise<void> {
  const edges = await fetchFriends();
  set({ edges, loaded: true });
}

export async function reloadInvites(): Promise<void> {
  set({ invites: await fetchInvites() });
}

export async function reloadAll(): Promise<void> {
  await Promise.all([reloadFriends(), reloadInvites()]);
}

export function bumpUnread(peerId: string, by = 1): void {
  const next = { ...current.unread, [peerId]: (current.unread[peerId] ?? 0) + by };
  set({ unread: next });
}

export function clearUnread(peerId: string): void {
  if (!current.unread[peerId]) return;
  const next = { ...current.unread };
  delete next[peerId];
  set({ unread: next });
}

export function setUnreadCounts(counts: Record<string, number>): void {
  set({ unread: counts });
}

export function dismissInvite(id: string): void {
  const invites = current.invites.filter((i) => i.id !== id);
  if (invites.length === current.invites.length) return;
  set({ invites });
}

/** الأصدقاء المقبولون وحدهم، مرتّبين بالاسم المعروض */
export function acceptedFriends(state: SocialState): FriendEdge[] {
  return state.edges
    .filter((e) => e.status === 'accepted')
    .sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
}

export function incomingRequests(state: SocialState): FriendEdge[] {
  return state.edges.filter((e) => e.status === 'pending' && e.direction === 'incoming');
}

export function outgoingRequests(state: SocialState): FriendEdge[] {
  return state.edges.filter((e) => e.status === 'pending' && e.direction === 'outgoing');
}

export function totalUnread(state: SocialState): number {
  return Object.values(state.unread).reduce((a, b) => a + b, 0);
}
