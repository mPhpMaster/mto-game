'use client';

import { useSyncExternalStore } from 'react';
import {
  getPlayerNameSnapshot,
  getServerPlayerNameSnapshot,
  subscribePlayerName,
} from './name';

export function usePlayerName(): string {
  return useSyncExternalStore(
    subscribePlayerName,
    getPlayerNameSnapshot,
    getServerPlayerNameSnapshot
  );
}
