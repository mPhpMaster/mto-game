'use client';

import { useState } from 'react';
import { addFriend, removeFriend } from '@/lib/player/friends';
import { useFriends } from '@/lib/player/useFriends';
import { buildRoomShareUrl } from '@/lib/multiplayer/joinUrl';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function LobbyFriendsPanel({
  roomCode,
  showInvite = false,
}: {
  roomCode?: string;
  showInvite?: boolean;
}) {
  const { t } = useLocale();
  const friends = useFriends();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitedId, setInvitedId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const added = addFriend(draft);
    if (!added) {
      setError(t('nameTooShort'));
      return;
    }
    setDraft('');
    setError(null);
  }

  async function invite(friendId: string, friendName: string) {
    if (!roomCode) return;
    const url = buildRoomShareUrl(roomCode);
    const text = t('inviteFriendMessage', { name: friendName, code: roomCode, url });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('inviteShareTitle'), text, url });
        setInvitedId(friendId);
        window.setTimeout(() => setInvitedId(null), 2000);
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setInvitedId(friendId);
      window.setTimeout(() => setInvitedId(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-sm font-black">{t('friendsTitle')}</h3>
      <p className="mb-3 text-[11px] leading-relaxed opacity-55">{t('friendsHint')}</p>

      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          maxLength={20}
          placeholder={t('friendNamePlaceholder')}
          className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-violet-500 px-3 py-2 text-sm font-black text-black hover:bg-violet-400"
        >
          {t('addFriend')}
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}

      {friends.length === 0 ? (
        <p className="text-xs opacity-50">{t('friendsEmpty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {friends.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-bold">{f.name}</span>
              {showInvite && roomCode && (
                <button
                  type="button"
                  onClick={() => invite(f.id, f.name)}
                  className="shrink-0 rounded bg-emerald-500/90 px-2 py-1 text-xs font-black text-black hover:bg-emerald-400"
                >
                  {invitedId === f.id ? t('invited') : t('inviteFriend')}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeFriend(f.id)}
                className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs opacity-70 hover:bg-white/20"
                title={t('removeFriend')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
