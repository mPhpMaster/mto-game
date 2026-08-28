'use client';

import { useSyncExternalStore } from 'react';
import { getFriendsSnapshot, getServerFriendsSnapshot, subscribeFriends } from './friends';

export function useFriends() {
  return useSyncExternalStore(subscribeFriends, getFriendsSnapshot, getServerFriendsSnapshot);
}
