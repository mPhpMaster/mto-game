'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useFriends } from '@/lib/player/useFriends';
import { searchProfile, sendFriendRequest } from '@/lib/social/api';
import { reloadFriends } from '@/lib/social/store';

const IMPORTED_KEY = 'mto-friends-imported';

/**
 * الأسماء المحفوظة محلياً قبل وجود الحسابات هي **أسماء عرض غير موثّقة**
 * لا أسماء مستخدمين، فإرسال طلبات آلية منها يزعج غرباء تصادف أن أسماءهم
 * مطابقة. لذلك البحث يدويّ لكل اسم، والبطاقة تُعرض مرّة وتُصرَف.
 * المصفوفة المحلّية لا تُحذف أبداً.
 */
export default function LocalFriendsImport() {
  const { t } = useLocale();
  const local = useFriends();
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem(IMPORTED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [results, setResults] = useState<Record<string, 'none' | 'sent' | 'missing'>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (hidden || local.length === 0) return null;

  async function lookup(id: string, name: string) {
    setBusy(id);
    const found = await searchProfile(name);
    if (!found) {
      setResults((r) => ({ ...r, [id]: 'missing' }));
      setBusy(null);
      return;
    }
    await sendFriendRequest(found.id);
    setResults((r) => ({ ...r, [id]: 'sent' }));
    setBusy(null);
    await reloadFriends();
  }

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(IMPORTED_KEY, '1');
    } catch {
      // التخزين معطّل — تختفي البطاقة لهذه الجلسة فقط
    }
  }

  return (
    <section className="panel mb-3 rounded-2xl p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="text-sm font-black">{t('importLocalFriends')}</h2>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded px-2 py-1 text-xs opacity-60 hover:bg-white/10 hover:opacity-100"
        >
          {t('dismissImport')}
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed opacity-60">{t('importLocalFriendsBody')}</p>
      <ul className="space-y-1.5">
        {local.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            {results[f.id] === 'sent' ? (
              <span className="text-xs text-emerald-300">{t('requestSent')}</span>
            ) : results[f.id] === 'missing' ? (
              <span className="text-xs opacity-50">{t('friendNotFound')}</span>
            ) : (
              <button
                type="button"
                disabled={busy === f.id}
                onClick={() => lookup(f.id, f.name)}
                className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
              >
                {t('searchThisName')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
