'use client';

import { getBrowserSupabase } from '@/lib/supabase/client';
import { writePlayerName } from '@/lib/player/name';
import type { Account } from '@/lib/social/types';

/**
 * جلسة الحساب في مخزن خارج React تقرأه الواجهة بـuseSyncExternalStore —
 * نفس نمط lib/i18n/store.ts وlib/player/name.ts، فلا مزوّد Context في الشجرة.
 *
 * ثلاث حالات لا حالتان: `loading` ضرورية لأن الخادم يرسم الصفحة قبل أن
 * يُعرف صاحبها، فلو بدأنا بـ`guest` لومض زرّ «سجّل الدخول» في كل صفحة
 * لمن هو داخلٌ فعلاً.
 */
export type AuthStatus = 'loading' | 'guest' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  account: Account | null;
}

/**
 * مراجع ثابتة: `getSnapshot` يجب أن يعيد المرجع نفسه ما لم تتغيّر الحالة،
 * وإلا دار useSyncExternalStore بلا نهاية.
 */
const LOADING: AuthState = Object.freeze({ status: 'loading', account: null });
const GUEST: AuthState = Object.freeze({ status: 'guest', account: null });

let current: AuthState = LOADING;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getAuthSnapshot(): AuthState {
  return current;
}

/** الخادم لا يعرف صاحب الجلسة، فيبدأ الجميع من نفس المرجع المجمَّد */
export const getServerAuthSnapshot = (): AuthState => LOADING;

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAccount(account: Account | null): void {
  const next: AuthState = account ? { status: 'signedIn', account } : GUEST;
  if (next.status === current.status && next.account?.id === current.account?.id) {
    // نفس الحساب — لكن قد تتغيّر العدّادات، فنبدّل المرجع عند اختلاف المحتوى
    if (account && current.account && sameAccount(account, current.account)) return;
  }
  current = next;
  // اسم العرض يتبع الحساب حتى لا يظهر اسمان للاعب واحد في الجهاز الواحد
  if (account) {
    try {
      writePlayerName(account.displayName);
    } catch {
      // التخزين معطّل — الاسم يبقى فعّالاً لهذه الجلسة
    }
  }
  emit();
}

function sameAccount(a: Account, b: Account): boolean {
  return (
    a.id === b.id &&
    a.username === b.username &&
    a.displayName === b.displayName &&
    a.wins === b.wins &&
    a.losses === b.losses &&
    a.matchesPlayed === b.matchesPlayed &&
    a.level === b.level &&
    a.titanSummons === b.titanSummons &&
    a.trapsSet === b.trapsSet
  );
}

/**
 * يملأ المخزن من لقطة الخادم قبل أول رسم عميل. يُنادى من مؤثّر جانبي لا
 * أثناء الرسم، وإلا تعارض الترطيب.
 */
export function primeAuth(account: Account | null): void {
  setAccount(account);
}

let inFlight: Promise<Account | null> | null = null;

/** يقرأ الحساب من الخادم ويحدّث المخزن. لا يرمي: غياب الجلسة حالة ضيف. */
export async function refreshAuth(): Promise<Account | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setAccount(null);
      return null;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAccount(null);
        return null;
      }
      const { data } = await supabase
        .from('profiles')
        .select(
          'id, username, display_name, wins, losses, matches_played, titan_summons, traps_set, level, created_at'
        )
        .eq('id', user.id)
        .maybeSingle();
      if (!data) {
        setAccount(null);
        return null;
      }
      const account: Account = {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        wins: data.wins,
        losses: data.losses,
        matchesPlayed: data.matches_played,
        titanSummons: data.titan_summons,
        trapsSet: data.traps_set,
        level: data.level,
        createdAt: data.created_at,
      };
      setAccount(account);
      return account;
    } catch {
      setAccount(null);
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** بعد الخروج: أي صفحة محميّة مخزَّنة في عامل الخدمة يجب أن تُمحى */
export async function clearPageCache(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.includes('-pages')).map((k) => caches.delete(k)));
  } catch {
    // لا دعم للذاكرة المؤقتة — لا شيء يُمحى
  }
}
