'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { refreshAuth } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/useSession';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { MULTIPLAYER_READY } from '@/lib/supabase/client';

/** شارة الحساب في الترويسة: المستوى والاسم، أو زرّ الدخول. */
export default function AccountMenuButton() {
  const { t } = useLocale();
  const { status, account } = useSession();

  useEffect(() => {
    void refreshAuth();
  }, []);

  if (!MULTIPLAYER_READY) return null;

  // هيكل محايد أثناء الانتظار — لا «دخول» يومض لمن هو داخلٌ فعلاً
  if (status === 'loading') {
    return <span className="h-7 w-24 animate-pulse rounded-lg bg-white/10" aria-hidden />;
  }

  if (status === 'guest' || !account) {
    return (
      <Link
        href="/friends"
        className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-black text-black transition hover:bg-emerald-400"
      >
        {t('signIn')}
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold transition hover:bg-white/20"
      title={t('openAccount')}
    >
      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
        {account.level}
      </span>
      <span className="max-w-24 truncate">{account.displayName}</span>
    </Link>
  );
}
