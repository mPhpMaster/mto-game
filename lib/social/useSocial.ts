'use client';

import { useSyncExternalStore } from 'react';
import {
  getServerSocialSnapshot,
  getSocialSnapshot,
  subscribeSocial,
  type SocialState,
} from './store';

export function useSocial(): SocialState {
  return useSyncExternalStore(subscribeSocial, getSocialSnapshot, getServerSocialSnapshot);
}
