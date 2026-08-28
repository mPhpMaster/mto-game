'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { GameOutcome, LogEntry } from '@/lib/game/types';
import { LOCALE_META, type Locale, type Localized, tx } from './locale';
import { RULES } from '@/lib/game/engine';
import { playerName, renderLog, renderOutcome } from './messages';
import {
  getLocaleSnapshot,
  getServerLocaleSnapshot,
  subscribeLocale,
  writeLocale,
} from './store';
import { REASONS, UI, type UIKey } from './ui';

type Params = Record<string, string | number>;

export interface LocaleApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** نصّ واجهة بمفتاحه */
  t: (key: UIKey, params?: Params) => string;
  /** نصّ ثنائي اللغة قادم من بيانات اللعبة (اسم كارت مثلاً) */
  L: (value: Localized) => string;
  logText: (entry: LogEntry) => string;
  outcomeText: (outcome: GameOutcome | null) => string;
  /** سبب المنع كما يعيده المحرّك */
  reason: (key: string | undefined) => string;
  /** اسم لاعب: يُترجَم إن كان مدمجاً، ويُعرض كما هو إن كتبه صاحبه */
  name: (value: string) => string;
}

function fill(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/**
 * لا نحتاج Context: المخزن خارج React أصلاً، فكل مكوّن يشترك فيه مباشرة.
 * هذا يتجنّب تمرير مزوّد حول كل صفحة ويبقي التحديث فورياً عند تغيير اللغة.
 */
export function useLocale(): LocaleApi {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot
  );

  // مزامنة سمتَي lang وdir مع الوثيقة — كتابة في الـDOM فقط، بلا حالة
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => writeLocale(next), []);

  return useMemo(
    () => ({
      locale,
      setLocale,
      t: (key, params) => fill(tx(UI[key], locale), params),
      L: (value) => tx(value, locale),
      logText: (entry) => renderLog(entry, locale),
      outcomeText: (outcome) => renderOutcome(outcome, locale),
      reason: (key) => {
        if (!key || !REASONS[key]) return '';
        const caps: Params = { n: key === 'traps_full' ? RULES.MAX_TRAPS : RULES.MAX_FIELD };
        return fill(tx(REASONS[key], locale), caps);
      },
      name: (value) => playerName(value, locale),
    }),
    [locale, setLocale]
  );
}
