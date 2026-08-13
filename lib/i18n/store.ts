'use client';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, parseLocale } from './locale';

/**
 * مخزن اللغة خارج React، تقرأه الواجهة عبر useSyncExternalStore.
 * هكذا يرسم الخادم اللغة الافتراضية ويصحّحها العميل دون تعارض ترطيب،
 * وبلا setState داخل مؤثّر جانبي.
 */
let current: Locale | null = null;
const listeners = new Set<() => void>();

export function getLocaleSnapshot(): Locale {
  if (current === null) {
    try {
      current = parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
      current = DEFAULT_LOCALE;
    }
  }
  return current;
}

export const getServerLocaleSnapshot = (): Locale => DEFAULT_LOCALE;

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeLocale(next: Locale): void {
  current = next;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // التخزين قد يكون معطّلاً — اللغة تبقى فعّالة لهذه الجلسة
  }
  for (const l of listeners) l();
}
