'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { refreshAuth } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/useSession';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { respondToInvite } from '@/lib/social/api';
import { openSocialChannel } from '@/lib/social/realtime';
import { dismissInvite, reloadAll, resetSocial, totalUnread } from '@/lib/social/store';
import { useSocial } from '@/lib/social/useSocial';

/**
 * طبقة الإشعارات الاجتماعية: تفتح قناة المستخدم الحيّة وتعرض دعوات اللعب
 * وعدّاد الرسائل غير المقروءة في كل الصفحات.
 *
 * ترسو أسفل-**البداية** لأن رصيف دردشة المباراة يملك أسفل-النهاية، فلا
 * يتراكبان في العربية ولا في الإنجليزية.
 *
 * تعيد `null` للضيوف: اللعب بلا حساب يبقى بلا أي أثر في الواجهة.
 */
export default function SocialHub() {
  const { t } = useLocale();
  const router = useRouter();
  const { status, account } = useSession();
  const social = useSocial();
  const [busy, setBusy] = useState(false);

  // محاولة واحدة عند الإقلاع لمعرفة صاحب الجلسة
  useEffect(() => {
    void refreshAuth();
  }, []);

  // المعرّف لا الكائن: عدّادات الحساب تتغيّر بعد كل مباراة، ولا معنى
  // لإعادة فتح القناة الحيّة لأجلها.
  const accountId = account?.id ?? null;
  useEffect(() => {
    if (status !== 'signedIn' || !accountId) {
      resetSocial();
      return;
    }
    void reloadAll();
    return openSocialChannel(accountId);
  }, [status, accountId]);

  if (status !== 'signedIn' || !account) return null;

  const invite = social.invites[0];
  const unread = totalUnread(social);

  async function join() {
    if (!invite || busy) return;
    setBusy(true);
    const res = await respondToInvite(invite.id, 'accepted');
    setBusy(false);
    dismissInvite(invite.id);
    if (res) router.push(`/vs/${res.roomCode}?players=${res.playerCount}&secs=${res.turnSeconds}`);
  }

  async function decline() {
    if (!invite) return;
    await respondToInvite(invite.id, 'declined');
    dismissInvite(invite.id);
  }

  return (
    <div className="pointer-events-none fixed bottom-3 start-3 z-40 flex flex-col items-start gap-2">
      {invite && (
        <div className="pointer-events-auto w-64 rounded-xl border border-emerald-400/40 bg-[#0b1020] p-3 shadow-lg">
          <p className="text-sm font-black">
            {t('inviteReceivedToast', { name: invite.fromName ?? '' })}
          </p>
          <p className="mt-0.5 text-[11px] opacity-60">
            {t('inviteSeats', { taken: invite.seatsTaken, total: invite.playerCount })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={join}
              disabled={busy}
              className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {t('joinInvite')}
            </button>
            <button
              type="button"
              onClick={decline}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              {t('dismissInvite')}
            </button>
          </div>
        </div>
      )}

      {unread > 0 && (
        <button
          type="button"
          onClick={() => router.push('/friends')}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-2 text-xs font-black text-black shadow-lg hover:bg-sky-400"
        >
          ✉️ {t('unreadCount', { n: unread })}
        </button>
      )}
    </div>
  );
}
