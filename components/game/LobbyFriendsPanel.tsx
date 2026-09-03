'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/useSession';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { makeRoomCode } from '@/lib/multiplayer/code';
import { buildRoomJoinPath } from '@/lib/multiplayer/joinUrl';
import { DEFAULT_TURN_SECONDS } from '@/lib/multiplayer/turnClock';
import { createInvite } from '@/lib/social/api';
import { acceptedFriends, reloadFriends } from '@/lib/social/store';
import { useSocial } from '@/lib/social/useSocial';

/**
 * دعوة الأصدقاء. الوضع يُشتقّ من الخصائص فلا يحتاج مفتاحاً:
 *
 *  - **بلا `roomCode`** (شاشة `/vs` قبل وجود غرفة): «ادعُ إلى لوبي جديد» —
 *    يولّد رمزاً، يُدرج الدعوة، ثم يدخل الغرفة مضيفاً.
 *  - **مع `roomCode` ومقعد شاغر**: «ادعُ إلى هذا اللوبي» — يُدرج الدعوة
 *    بالرمز الحالي **بلا تنقّل**، فيبقى المضيف في غرفته منتظراً. وهذا ما
 *    يجعل 1×1×1 قابلاً للتكوين: ادعُ الأول، وحين ينضمّ ادعُ الثاني.
 *
 * التسابق على آخر مقعد لا يحتاج حجزاً: `claimSeat` يردّ الثاني بـ«الغرفة
 * ممتلئة» وتعرضها `OnlineGame` عبر فرع الخطأ القائم.
 */
export default function LobbyFriendsPanel({
  roomCode,
  playerCount = 2,
  turnSeconds = DEFAULT_TURN_SECONDS,
  seatsTaken = 1,
  hasFreeSeat = true,
  matchStarted = false,
}: {
  roomCode?: string;
  playerCount?: number;
  turnSeconds?: number;
  seatsTaken?: number;
  hasFreeSeat?: boolean;
  matchStarted?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { status, account } = useSession();
  const social = useSocial();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'signedIn') void reloadFriends();
  }, [status]);

  if (status !== 'signedIn' || !account) return null;

  const friends = acceptedFriends(social);
  const inRoom = Boolean(roomCode);
  const count = playerCount === 3 ? 3 : 2;
  const blocked = inRoom && (matchStarted || !hasFreeSeat);
  const blockedReason = matchStarted ? t('inviteStarted') : t('inviteNoSeat');

  async function invite(friendId: string) {
    if (busy || blocked) return;
    setBusy(true);
    const code = roomCode ?? makeRoomCode();
    const ok = await createInvite({
      toUserId: friendId,
      roomCode: code,
      playerCount: count as 2 | 3,
      turnSeconds,
      seatsTaken,
    });
    setBusy(false);
    if (!ok) return;
    setSentTo(friendId);
    window.setTimeout(() => setSentTo(null), 2500);

    // لوبي جديد: ادخله مضيفاً. لوبي قائم: ابقَ مكانك وانتظر الصديق.
    if (!roomCode) {
      router.push(
        buildRoomJoinPath(code, {
          name: account!.displayName,
          host: true,
          secs: turnSeconds,
          players: count,
        })
      );
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-sm font-black">{t('friendsPageTitle')}</h3>
      <p className="mb-3 text-[11px] leading-relaxed opacity-55">
        {inRoom ? t('inviteToThisLobby') : t('inviteToNewLobby')}
        {inRoom && ` — ${t('inviteSeats', { taken: seatsTaken, total: count })}`}
      </p>

      {blocked && <p className="mb-2 text-[11px] text-amber-200">{blockedReason}</p>}

      {friends.length === 0 ? (
        <p className="text-xs opacity-50">
          {t('noFriendsYet')}{' '}
          <Link href="/friends" className="underline">
            {t('openFriends')}
          </Link>
        </p>
      ) : (
        <ul className="space-y-1.5">
          {friends.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
            >
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
                {f.profile.level}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">{f.profile.displayName}</span>
              <button
                type="button"
                onClick={() => invite(f.profile.id)}
                disabled={busy || blocked}
                className="shrink-0 rounded bg-emerald-500/90 px-2 py-1 text-xs font-black text-black hover:bg-emerald-400 disabled:opacity-40"
              >
                {sentTo === f.profile.id ? t('invited') : t('inviteFriend')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
