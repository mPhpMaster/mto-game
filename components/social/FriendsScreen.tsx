'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DirectChatPanel from '@/components/social/DirectChatPanel';
import LocalFriendsImport from '@/components/social/LocalFriendsImport';
import { primeAuth } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/useSession';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { buildRoomJoinPath } from '@/lib/multiplayer/joinUrl';
import { makeRoomCode } from '@/lib/multiplayer/code';
import { DEFAULT_TURN_SECONDS } from '@/lib/multiplayer/turnClock';
import {
  createInvite,
  removeFriendEdge,
  respondToRequest,
  searchProfile,
  sendFriendRequest,
} from '@/lib/social/api';
import {
  acceptedFriends,
  clearUnread,
  incomingRequests,
  outgoingRequests,
  reloadAll,
  reloadFriends,
} from '@/lib/social/store';
import { useSocial } from '@/lib/social/useSocial';
import type { Account, PublicProfile } from '@/lib/social/types';

type Tab = 'friends' | 'requests' | 'messages';

export default function FriendsScreen({
  initialAccount,
  initialPeer,
}: {
  initialAccount: Account;
  initialPeer?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { account } = useSession();
  const social = useSocial();
  const [tab, setTab] = useState<Tab>(initialPeer ? 'messages' : 'friends');
  /**
   * نحفظ المعرّف لا الملفّ: قائمة الأصدقاء تصل بعد أول رسم، فاشتقاق الملفّ
   * منها أثناء الرسم يغني عن مؤثّر يكتب الحالة (ويكتب دورة رسم زائدة).
   * `username` هو المفتاح ليعمل رابط ‎/friends?with=… مباشرةً.
   */
  const [peerName, setPeerName] = useState<string | null>(initialPeer ?? null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = account ?? initialAccount;

  useEffect(() => {
    primeAuth(initialAccount);
    void reloadAll();
  }, [initialAccount]);

  const friends = acceptedFriends(social);
  const incoming = incomingRequests(social);
  const outgoing = outgoingRequests(social);

  const peer: PublicProfile | null =
    friends.find((f) => f.profile.username === peerName)?.profile ?? null;

  async function addByUsername(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    setNotice(null);
    const found = await searchProfile(draft);
    if (!found) {
      setBusy(false);
      setNotice(t('friendNotFound'));
      return;
    }
    if (friends.some((f) => f.profile.id === found.id)) {
      setBusy(false);
      setNotice(t('alreadyFriends'));
      return;
    }
    const outcome = await sendFriendRequest(found.id);
    setBusy(false);
    setDraft('');
    setNotice(outcome === 'failed' ? t('authFailed') : t('requestSent'));
    await reloadFriends();
  }

  /** «العب مع» من هنا يعني دائماً لوبي جديد — لا غرفة مفتوحة في هذه الصفحة */
  async function playWith(friendId: string) {
    if (busy) return;
    setBusy(true);
    const code = makeRoomCode();
    await createInvite({
      toUserId: friendId,
      roomCode: code,
      playerCount: 2,
      turnSeconds: DEFAULT_TURN_SECONDS,
      seatsTaken: 1,
    });
    setBusy(false);
    router.push(
      buildRoomJoinPath(code, {
        name: me.displayName,
        host: true,
        secs: DEFAULT_TURN_SECONDS,
        players: 2,
      })
    );
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'friends', label: t('tabFriends'), badge: friends.length || undefined },
    { id: 'requests', label: t('tabRequests'), badge: incoming.length || undefined },
    { id: 'messages', label: t('tabMessages') },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{t('friendsPageTitle')}</h1>
        <Link href="/" className="panel rounded-lg px-3 py-1.5 text-xs font-bold">
          {t('home')}
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === x.id ? 'bg-emerald-500 text-black' : 'bg-white/8 hover:bg-white/15'
            }`}
          >
            {x.label}
            {x.badge ? (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{x.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <>
          <form onSubmit={addByUsername} className="panel mb-3 rounded-2xl p-4">
            <label className="mb-2 block text-sm font-black" htmlFor="mto-add-friend">
              {t('addByUsername')}
            </label>
            <div className="flex gap-2">
              <input
                id="mto-add-friend"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setNotice(null);
                }}
                maxLength={20}
                placeholder={t('usernamePlaceholder')}
                className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-emerald-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-lg bg-violet-500 px-4 py-2 text-sm font-black text-black hover:bg-violet-400 disabled:opacity-50"
              >
                {t('addFriend')}
              </button>
            </div>
            {notice && <p className="mt-2 text-xs opacity-80">{notice}</p>}
          </form>

          <LocalFriendsImport />

          {friends.length === 0 ? (
            <p className="panel rounded-2xl p-6 text-center text-sm opacity-60">{t('noFriendsYet')}</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li key={f.id} className="panel flex items-center gap-2 rounded-xl p-3">
                  <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
                    {f.profile.level}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{f.profile.displayName}</span>
                    <span className="block truncate text-[11px] opacity-50">@{f.profile.username}</span>
                  </span>
                  {social.unread[f.profile.id] ? (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                      {social.unread[f.profile.id]}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => playWith(f.profile.id)}
                    disabled={busy}
                    className="shrink-0 rounded bg-emerald-500/90 px-2 py-1 text-xs font-black text-black hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {t('playWithFriend')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeerName(f.profile.username);
                      setTab('messages');
                      clearUnread(f.profile.id);
                    }}
                    className="shrink-0 rounded bg-sky-500/85 px-2 py-1 text-xs font-black text-black hover:bg-sky-400"
                  >
                    {t('messageFriend')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeFriendEdge(f.id);
                      await reloadFriends();
                      if (peer?.id === f.profile.id) setPeerName(null);
                    }}
                    className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs opacity-70 hover:bg-white/20"
                    title={t('removeFriend')}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-black">{t('requestsIncoming')}</h2>
            {incoming.length === 0 ? (
              <p className="panel rounded-xl p-4 text-xs opacity-60">{t('noRequests')}</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map((r) => (
                  <li key={r.id} className="panel flex items-center gap-2 rounded-xl p-3">
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {r.profile.displayName}
                      <span className="ms-2 text-[11px] opacity-50">@{r.profile.username}</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await respondToRequest(r.id, true);
                        await reloadFriends();
                      }}
                      className="rounded bg-emerald-500 px-3 py-1 text-xs font-black text-black"
                    >
                      {t('acceptRequest')}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await respondToRequest(r.id, false);
                        await reloadFriends();
                      }}
                      className="rounded bg-white/10 px-3 py-1 text-xs"
                    >
                      {t('declineRequest')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-black">{t('requestsOutgoing')}</h2>
            {outgoing.length === 0 ? (
              <p className="panel rounded-xl p-4 text-xs opacity-60">{t('noRequests')}</p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((r) => (
                  <li key={r.id} className="panel flex items-center gap-2 rounded-xl p-3">
                    <span className="min-w-0 flex-1 truncate opacity-80">
                      {r.profile.displayName}
                      <span className="ms-2 text-[11px] opacity-50">@{r.profile.username}</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeFriendEdge(r.id);
                        await reloadFriends();
                      }}
                      className="rounded bg-white/10 px-3 py-1 text-xs"
                    >
                      {t('cancelRequest')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'messages' &&
        (peer ? (
          <div>
            <button
              type="button"
              onClick={() => setPeerName(null)}
              className="mb-2 rounded-lg px-2 py-1 text-xs opacity-70 hover:bg-white/10"
            >
              {t('backToFriends')}
            </button>
            <DirectChatPanel
              me={{ id: me.id, displayName: me.displayName }}
              peer={peer}
              incomingTick={social.unread[peer.id] ?? 0}
            />
          </div>
        ) : friends.length === 0 ? (
          <p className="panel rounded-2xl p-6 text-center text-sm opacity-60">{t('noFriendsYet')}</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPeerName(f.profile.username);
                    clearUnread(f.profile.id);
                  }}
                  className="panel flex w-full items-center gap-2 rounded-xl p-3 text-start transition hover:bg-white/10"
                >
                  <span className="min-w-0 flex-1 truncate font-bold">{f.profile.displayName}</span>
                  {social.unread[f.profile.id] ? (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                      {t('unreadCount', { n: social.unread[f.profile.id] })}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
