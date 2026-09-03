'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROOM_CODE_LENGTH, makeRoomCode, normalizeRoomCode } from '@/lib/multiplayer/code';
import { buildRoomJoinPath } from '@/lib/multiplayer/joinUrl';
import {
  DEFAULT_TURN_SECONDS,
  MIN_TURN_SECONDS,
  TURN_SECONDS_OPTIONS,
} from '@/lib/multiplayer/turnClock';
import { CROSS_DEVICE_READY } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Account } from '@/lib/social/types';
import LanguageSwitch from '@/components/LanguageSwitch';
import LobbyFriendsPanel from '@/components/game/LobbyFriendsPanel';
import QrScannerModal from '@/components/game/QrScannerModal';
import type { PlayerCount } from '@/lib/multiplayer/seats';

export default function RoomLobby({
  initialPlayerCount = 2,
  account,
}: {
  initialPlayerCount?: number;
  account: Account;
}) {
  const { t } = useLocale();
  const router = useRouter();
  // الاسم يأتي من الحساب: البوّابة في app/vs ضمنت وجوده قبل الوصول هنا
  const name = account.displayName;
  const [code, setCode] = useState('');
  const [turnSecs, setTurnSecs] = useState<number>(DEFAULT_TURN_SECONDS);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(
    initialPlayerCount === 3 ? 3 : 2
  );
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const ffa3 = playerCount === 3;

  function requireName(): string {
    return name;
  }

  function host() {
    const n = requireName();
    if (!n) return;
    router.push(
      buildRoomJoinPath(makeRoomCode(), {
        name: n,
        host: true,
        secs: turnSecs,
        players: ffa3 ? 3 : 2,
      })
    );
  }

  function join(targetCode?: string) {
    const c = normalizeRoomCode(targetCode ?? code);
    if (c.length !== ROOM_CODE_LENGTH) {
      setError(t('codeLength', { n: ROOM_CODE_LENGTH }));
      return;
    }
    const n = requireName();
    if (!n) return;
    router.push(buildRoomJoinPath(c, { name: n }));
  }

  function onQrScan(result: { code: string; name?: string }) {
    setCode(result.code);
    join(result.code);
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">{ffa3 ? t('onlineLobbyTitle3') : t('onlineLobbyTitle')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
            {t('menu')}
          </Link>
        </div>
      </div>

      {!CROSS_DEVICE_READY && (
        <div className="panel mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <b>{t('onlineDisabled')}</b> {t('localTabsHint')}{' '}
          <Link href="/local" className="underline">
            {t('oneDevice')}
          </Link>
          .
        </div>
      )}

      <div className="panel rounded-2xl p-5">
        <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2">
          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
            {account.level}
          </span>
          <span className="min-w-0 flex-1 truncate font-bold">{account.displayName}</span>
          <Link href="/account" className="shrink-0 text-[11px] opacity-60 hover:opacity-100">
            @{account.username}
          </Link>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-xs opacity-70">{t('playFriend')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlayerCount(2)}
              aria-pressed={playerCount === 2}
              className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                playerCount === 2 ? 'bg-sky-500 text-black' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {t('onlineModeDuel')}
            </button>
            <button
              type="button"
              onClick={() => setPlayerCount(3)}
              aria-pressed={playerCount === 3}
              className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                playerCount === 3 ? 'bg-violet-500 text-black' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {t('onlineModeFfa3')}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-xs opacity-70">{t('turnLength')}</span>
          <div className="flex flex-wrap gap-2">
            {TURN_SECONDS_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTurnSecs(sec)}
                aria-pressed={turnSecs === sec}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  turnSecs === sec ? 'bg-emerald-500 text-black' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {sec === 60 ? t('minute') : t('seconds', { n: sec })}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] opacity-55">
            {t('turnLengthHint', { min: MIN_TURN_SECONDS })}
          </p>
        </div>

        <button
          onClick={host}
          className="mt-4 w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-black hover:bg-emerald-400"
        >
          {ffa3 ? t('createRoom3') : t('createRoom')}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs opacity-45">
          <span className="h-px flex-1 bg-white/15" />
          {t('orJoin')}
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs opacity-70">{t('roomCode')}</span>
          <input
            value={code}
            onChange={(e) => {
              setCode(normalizeRoomCode(e.target.value));
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="ABC12"
            dir="ltr"
            className="w-full rounded-lg bg-black/40 px-3 py-2 text-center text-2xl font-black tracking-[0.35em] outline-none ring-1 ring-white/15 focus:ring-emerald-400"
          />
        </label>
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => join()}
            className="rounded-xl bg-white/12 px-6 py-3 font-bold hover:bg-white/20"
          >
            {t('join')}
          </button>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-500/20"
          >
            {t('scanQr')}
          </button>
        </div>
      </div>

      <LobbyFriendsPanel playerCount={playerCount} turnSeconds={turnSecs} />

      <p className="mt-4 text-[11px] leading-relaxed opacity-50">
        {ffa3 ? t('hostNote3') : t('hostNote')}
      </p>

      <QrScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onScan={onQrScan} />
    </div>
  );
}
