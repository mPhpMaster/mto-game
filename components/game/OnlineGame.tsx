'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRoom, type RoomRole } from '@/lib/multiplayer/useRoom';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEFAULT_TURN_SECONDS } from '@/lib/multiplayer/turnClock';
import MatchChatDock from '@/components/chat/MatchChatDock';
import GameBoard from './GameBoard';
import TurnClock from './TurnClock';

export default function OnlineGame({
  code,
  role,
  myName,
  turnSeconds = DEFAULT_TURN_SECONDS,
}: {
  code: string;
  role: RoomRole;
  myName: string;
  turnSeconds?: number;
}) {
  const { t } = useLocale();
  const room = useRoom({ code, role, myName, fallbackOpponentName: t('guest'), turnSeconds });
  const [copied, setCopied] = useState(false);
  const isHost = role === 'host';

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/vs/${code}` : `/vs/${code}`;

  const showChat = room.status !== 'unavailable' && room.status !== 'error';

  let body: ReactNode;

  if (room.status === 'unavailable') {
    body = (
      <Shell title={t('onlineUnavailable')}>
        <p className="text-sm leading-relaxed opacity-75">
          {t('needsSupabase')}{' '}
          <Link href="/local" className="underline">
            {t('oneDevice')}
          </Link>
          .
        </p>
      </Shell>
    );
  } else if (room.status === 'error') {
    body = (
      <Shell title={t('connectFailed')}>
        <p className="mb-4 text-sm opacity-75">
          {room.error === 'invalidCode' ? t('invalidCode') : t('roomConnectError')}
        </p>
        <Link href="/vs" className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-black">
          {t('backToRooms')}
        </Link>
      </Shell>
    );
  } else if (!room.state) {

    body = (
      <Shell title={isHost ? t('roomReady') : t('joining')}>
        {isHost ? (
          <>
            <p className="mb-3 text-sm opacity-75">{t('giveCode')}</p>
            <div className="mb-3 rounded-xl bg-black/50 p-4 text-center">
              <div className="text-5xl font-black tracking-[0.3em] text-emerald-300">{code}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="mb-4 w-full rounded-lg bg-white/12 px-4 py-2 text-sm font-bold hover:bg-white/20"
            >
              {copied ? t('copied') : t('copyInvite')}
            </button>
          </>
        ) : (
          <p className="mb-4 text-sm opacity-75">
            <b className="tracking-[0.2em] text-emerald-300">{code}</b>
          </p>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-3 text-sm">
          <span className="inline-block size-2 animate-pulse rounded-full bg-amber-400" />
          {isHost ? t('waitingFriend') : t('waitingHost')}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed opacity-50">
{t('roomLifetime')}
        </p>

        <Link
          href="/vs"
          className="mt-4 inline-block rounded-lg bg-white/12 px-4 py-2 text-sm font-bold"
        >
          {t('cancel')}
        </Link>
      </Shell>
    );
  } else {
    const waitingForOpponent = !room.opponentPresent;
    body = (
      <GameBoard
        externalState={room.state}
        onAction={room.sendAction}
        mySeat={room.mySeat}
        banner={
          <section
            className={`rounded-xl border p-2 text-xs ${
              waitingForOpponent
                ? 'border-amber-400/40 bg-amber-400/10'
                : 'border-emerald-400/30 bg-emerald-400/8'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-black/30 px-2 py-0.5 font-black tracking-[0.2em]">
                {code}
              </span>
              <span className="font-bold">
                {isHost ? t('youAreHost') : t('youAreGuest')}
              </span>
              <span className="opacity-75">
                {t('opponentIs', { name: room.opponentName ?? (isHost ? t('guest') : t('host')) })}
              </span>
              <TurnClock
                deadline={room.turnDeadline}
                seconds={room.turnSeconds}
                isMyTurn={room.state.current === room.mySeat}
              />
              <span
                className={`ms-auto flex items-center gap-1.5 rounded px-2 py-0.5 ${
                  waitingForOpponent ? 'bg-amber-400/20 text-amber-100' : 'bg-emerald-400/20 text-emerald-100'
                }`}
              >
                <span
                  className={`inline-block size-2 rounded-full ${
                    waitingForOpponent ? 'motion-safe:animate-pulse bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                {waitingForOpponent ? t('disconnected') : t('connected')}
              </span>
            </div>
          </section>
        }
        endActions={
          <>
            {isHost && (
              <button
                onClick={room.newMatch}
                className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-black"
              >
                {t('newMatch')}
              </button>
            )}
            {!isHost && (
              <button
                onClick={room.newMatch}
                className="rounded-lg bg-white/15 px-4 py-2 font-bold"
                title={t('requestNewMatchTip')}
              >
                {t('requestNewMatch')}
              </button>
            )}
            <Link href="/" className="rounded-lg bg-white/15 px-4 py-2 font-bold">
              {t('home')}
            </Link>
          </>
        }
      />
    );
  }

  return (
    <>
      {body}
      {showChat && (
        <MatchChatDock
          code={code}
          myName={myName}
          mySeat={room.mySeat}
          defaultOpen={!room.state}
        />
      )}
    </>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="panel rounded-2xl p-6">
        <h1 className="mb-4 text-2xl font-black">{title}</h1>
        {children}
      </div>
    </div>
  );
}
