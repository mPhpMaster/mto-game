'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROOM_CODE_LENGTH, makeRoomCode, normalizeRoomCode } from '@/lib/multiplayer/code';
import {
  DEFAULT_TURN_SECONDS,
  MIN_TURN_SECONDS,
  TURN_SECONDS_OPTIONS,
} from '@/lib/multiplayer/turnClock';
import { MULTIPLAYER_READY } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '@/components/LanguageSwitch';

export default function RoomLobby() {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [turnSecs, setTurnSecs] = useState<number>(DEFAULT_TURN_SECONDS);
  const [error, setError] = useState<string | null>(null);

  function saveName(): string {
    const n = name.trim() || t('player');
    try {
      window.localStorage.setItem('mto-name', n);
    } catch {
      // التخزين المحلي قد يكون معطّلاً — الاسم يُمرَّر في الرابط على أي حال
    }
    return n;
  }

  function host() {
    const n = saveName();
    router.push(`/vs/${makeRoomCode()}?host=1&name=${encodeURIComponent(n)}&secs=${turnSecs}`);
  }

  function join() {
    const c = normalizeRoomCode(code);
    if (c.length !== ROOM_CODE_LENGTH) {
      setError(t('codeLength', { n: ROOM_CODE_LENGTH }));
      return;
    }
    const n = saveName();
    router.push(`/vs/${c}?name=${encodeURIComponent(n)}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t('onlineLobbyTitle')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
            {t('menu')}
          </Link>
        </div>
      </div>

      {!MULTIPLAYER_READY && (
        <div className="panel mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <b>{t('onlineDisabled')}</b> {t('needsSupabase')}{' '}
          <Link href="/local" className="underline">
            {t('oneDevice')}
          </Link>
          .
        </div>
      )}

      <div className="panel rounded-2xl p-5">
        <label className="block">
          <span className="mb-1 block text-xs opacity-70">{t('yourName')}</span>
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('yourNamePlaceholder')}
            className="w-full rounded-lg bg-black/40 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-emerald-400"
          />
        </label>

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
          disabled={!MULTIPLAYER_READY}
          className="mt-4 w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          {t('createRoom')}
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

        <button
          onClick={join}
          disabled={!MULTIPLAYER_READY}
          className="mt-3 w-full rounded-xl bg-white/12 px-6 py-3 font-bold hover:bg-white/20 disabled:opacity-40"
        >
          {t('join')}
        </button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed opacity-50">
{t('hostNote')}
      </p>
    </div>
  );
}
