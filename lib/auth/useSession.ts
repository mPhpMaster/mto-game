'use client';

import { useSyncExternalStore } from 'react';
import { getAuthSnapshot, getServerAuthSnapshot, subscribeAuth, type AuthState } from './session';

export function useSession(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
}
