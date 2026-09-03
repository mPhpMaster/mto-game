'use client';

import { useState } from 'react';
import { registerAccount, signIn, type AuthErrorKey } from '@/lib/auth/actions';
import { USERNAME_MAX } from '@/lib/auth/username';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { getPlayerNameSnapshot } from '@/lib/player/name';
import type { UIKey } from '@/lib/i18n/ui';

/**
 * نموذج الدخول والتسجيل. يتبع لغة اللعبة البصرية نفسها حتى لا يبدو
 * الحساب طبقةً غريبة عليها.
 */
export default function AuthForm({
  mode: initialMode = 'signIn',
  onDone,
}: {
  mode?: 'signIn' | 'signUp';
  onDone?: () => void;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'signIn' | 'signUp'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    // اسم العرض المحفوظ محلياً يصير اسم العرض الأوّل، فلا يبدأ اللاعب من فراغ
    const displayName = mode === 'signUp' ? getPlayerNameSnapshot() : undefined;
    const res =
      mode === 'signUp'
        ? await registerAccount(username, password, displayName || undefined)
        : await signIn(username, password);
    setBusy(false);
    if (res.ok) onDone?.();
    else setError(res.errorKey);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <label className="mb-1 block text-xs font-bold opacity-70" htmlFor="mto-username">
        {t('username')}
      </label>
      <input
        id="mto-username"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError(null);
        }}
        maxLength={USERNAME_MAX}
        autoComplete="username"
        placeholder={t('usernamePlaceholder')}
        className="mb-3 w-full rounded-lg bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-emerald-400"
      />

      <label className="mb-1 block text-xs font-bold opacity-70" htmlFor="mto-password">
        {t('password')}
      </label>
      <input
        id="mto-password"
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
        className="w-full rounded-lg bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-emerald-400"
      />
      <p className="mt-1 text-[11px] opacity-50">{t('passwordHint')}</p>

      {error && <p className="mt-2 text-xs text-rose-300">{t(error as UIKey)}</p>}

      {mode === 'signUp' && (
        <p className="mt-3 rounded-lg bg-amber-400/10 p-2 text-[11px] leading-relaxed text-amber-200">
          {t('registerNoRecovery')}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-black transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {mode === 'signUp' ? t('signUp') : t('signIn')}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signUp' ? 'signIn' : 'signUp');
          setError(null);
        }}
        className="mt-2 w-full rounded-lg px-3 py-2 text-xs opacity-70 transition hover:bg-white/10 hover:opacity-100"
      >
        {mode === 'signUp' ? t('haveAccount') : t('noAccount')}
      </button>
    </form>
  );
}
