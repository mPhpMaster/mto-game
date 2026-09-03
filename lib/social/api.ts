'use client';

import type { DirectMessageRow, FriendEdge, GameInvite, PublicProfile } from './types';

async function json<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const POST = (url: string, body: unknown): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export async function fetchFriends(): Promise<FriendEdge[]> {
  const res = await fetch('/api/friends').catch(() => null);
  if (!res) return [];
  const body = await json<{ edges?: FriendEdge[] }>(res);
  return body?.edges ?? [];
}

export async function searchProfile(username: string): Promise<PublicProfile | null> {
  const res = await POST('/api/friends/search', { username }).catch(() => null);
  if (!res) return null;
  const body = await json<{ found: boolean; profile?: PublicProfile }>(res);
  return body?.found ? (body.profile ?? null) : null;
}

export type RequestOutcome = 'pending' | 'accepted' | 'failed';

export async function sendFriendRequest(toUserId: string): Promise<RequestOutcome> {
  const res = await POST('/api/friends', { toUserId }).catch(() => null);
  if (!res || !res.ok) return 'failed';
  const body = await json<{ status?: string }>(res);
  return body?.status === 'accepted' ? 'accepted' : 'pending';
}

export async function respondToRequest(id: string, accept: boolean): Promise<boolean> {
  const res = accept
    ? await fetch(`/api/friends/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      }).catch(() => null)
    : await fetch(`/api/friends/${id}`, { method: 'DELETE' }).catch(() => null);
  return Boolean(res?.ok);
}

export async function removeFriendEdge(id: string): Promise<boolean> {
  const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' }).catch(() => null);
  return Boolean(res?.ok);
}

export async function fetchConversation(peerId: string): Promise<DirectMessageRow[]> {
  const res = await fetch(`/api/messages?peer=${encodeURIComponent(peerId)}`).catch(() => null);
  if (!res) return [];
  const body = await json<{ messages?: DirectMessageRow[] }>(res);
  return body?.messages ?? [];
}

export async function sendDirectMessage(
  toUserId: string,
  text: string
): Promise<DirectMessageRow | null> {
  const res = await POST('/api/messages', { toUserId, text }).catch(() => null);
  if (!res) return null;
  const body = await json<{ message?: DirectMessageRow }>(res);
  return body?.message ?? null;
}

export async function markConversationRead(peerId: string): Promise<void> {
  await fetch('/api/messages', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ peerId }),
  }).catch(() => null);
}

export async function fetchInvites(): Promise<GameInvite[]> {
  const res = await fetch('/api/invites').catch(() => null);
  if (!res) return [];
  const body = await json<{ invites?: GameInvite[] }>(res);
  return body?.invites ?? [];
}

export async function createInvite(input: {
  toUserId: string;
  roomCode: string;
  playerCount: 2 | 3;
  turnSeconds: number;
  seatsTaken: number;
}): Promise<boolean> {
  const res = await POST('/api/invites', input).catch(() => null);
  return Boolean(res?.ok);
}

export interface AcceptedInvite {
  roomCode: string;
  playerCount: 2 | 3;
  turnSeconds: number;
}

export async function respondToInvite(
  id: string,
  status: 'accepted' | 'declined'
): Promise<AcceptedInvite | null> {
  const res = await fetch(`/api/invites/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = await json<AcceptedInvite>(res);
  return status === 'accepted' ? body : null;
}
