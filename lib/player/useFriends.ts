'use client';

import { useSyncExternalStore } from 'react';
import { getFriendsSnapshot, getServerFriendsSnapshot, subscribeFriends } from './friends';

/** @deprecated انظر `lib/social/useSocial.ts` — هذا للاستيراد لمرّة واحدة فقط. */
export function useFriends() {
  return useSyncExternalStore(subscribeFriends, getFriendsSnapshot, getServerFriendsSnapshot);
}
