'use client';

import { getBrowserSupabase } from '@/lib/supabase/client';
import { clearPageCache, refreshAuth, setAccount } from './session';
import {
  passwordErrorKey,
  syntheticEmail,
  usernameErrorKey,
  type PasswordErrorKey,
  type UsernameErrorKey,
} from './username';
import type { Account } from '@/lib/social/types';

export type AuthErrorKey =
  | UsernameErrorKey
  | PasswordErrorKey
  | 'usernameTaken'
  | 'wrongCredentials'
  | 'authUnavailable'
  | 'authFailed';

export type AuthResult = { ok: true; account: Account } | { ok: false; errorKey: AuthErrorKey };

function validate(username: string, password: string): AuthErrorKey | null {
  return usernameErrorKey(username) ?? passwordErrorKey(password);
}

/**
 * التسجيل يمرّ بمسار خادم لأنه يحتاج صلاحية الخدمة لنداء `auth.admin`،
 * ثم يسجّل المتصفّح الدخول بنفسه — فلا تُسلَّم كوكي جلسة بين مسار ومتصفّح.
 */
export async function registerAccount(
  username: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  const invalid = validate(username, password);
  if (invalid) return { ok: false, errorKey: invalid };

  let res: Response;
  try {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
  } catch {
    return { ok: false, errorKey: 'authUnavailable' };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { errorKey?: AuthErrorKey } | null;
    return { ok: false, errorKey: body?.errorKey ?? 'authFailed' };
  }
  // 202 = Supabase غير مهيّأ؛ اللعبة تعمل بدونه لكن لا حساب يُنشأ
  if (res.status === 202) return { ok: false, errorKey: 'authUnavailable' };

  return signIn(username, password);
}

export async function signIn(username: string, password: string): Promise<AuthResult> {
  const invalid = validate(username, password);
  if (invalid) return { ok: false, errorKey: invalid };

  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: false, errorKey: 'authUnavailable' };

  const email = await syntheticEmail(username);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // لا نميّز «اسم غير موجود» عن «كلمة مرور خاطئة»: التمييز يكشف من سجّل
  if (error) return { ok: false, errorKey: 'wrongCredentials' };

  const account = await refreshAuth();
  if (!account) return { ok: false, errorKey: 'authFailed' };
  return { ok: true, account };
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserSupabase();
  try {
    await supabase?.auth.signOut();
  } catch {
    // حتى لو فشل النداء، الحالة المحلّية تصبح «ضيف»
  }
  setAccount(null);
  // صفحات الحساب قد تكون مخزَّنة في عامل الخدمة — لا تُعرض لمن يأتي بعده
  await clearPageCache();
}
