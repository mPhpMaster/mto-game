'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRoom, type PublicSeat, type RoomRole } from '@/lib/multiplayer/useRoom';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEFAULT_TURN_SECONDS } from '@/lib/multiplayer/turnClock';
import MatchChatDock from '@/components/chat/MatchChatDock';
import OpenInAppButton from '@/components/OpenInAppButton';
import GameBoard from './GameBoard';
import TurnClock from './TurnClock';

export default function OnlineGame({
  code,
  role,
  myName,
  turnSeconds = DEFAULT_TURN_SECONDS,
  playerCount = 2,
}: {
  code: string;
  role: RoomRole;
  myName: string;
  turnSeconds?: number;
  playerCount?: number;
}) {
  const { t, name: pname } = useLocale();
  const room = useRoom({
    code,
    role,
    myName,
    fallbackOpponentName: t('guest'),
    turnSeconds,
    playerCount,
  });
  const [copied, setCopied] = useState(false);
  const isHost = role === 'host';
  const ffa3 = room.playerCount >= 3;

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/vs/${code}` : `/vs/${code}`;

  const showChat = room.status !== 'unavailable' && room.status !== 'error';
  const humansHere = room.seats.filter((s) => !s.isAI && s.present).length;
  const humansNeed = room.seats.filter((s) => !s.isAI).length || room.playerCount;

  let body: ReactNode;

  if (room.status === 'unavailable') {
    body = (
      <Shell title={t('onlineUnavailable')} wide={ffa3}>
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
      <Shell title={t('connectFailed')} wide={ffa3}>
        <p className="mb-4 text-sm opacity-75">
          {room.error === 'invalidCode'
            ? t('invalidCode')
            : room.error === 'roomFull'
              ? t('roomFull')
              : t('roomConnectError')}
        </p>
        <Link href="/vs" className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-black">
          {t('backToRooms')}
        </Link>
      </Shell>
    );
  } else if (!room.state) {
    body = (
      <Shell title={isHost ? t('roomReady') : t('joining')} wide={ffa3}>
        {isHost ? (
          <>
            <p className="mb-3 text-sm opacity-75">{ffa3 ? t('giveCode3') : t('giveCode')}</p>
            <div className="mb-3 rounded-xl bg-black/50 p-4 text-center">
              <div className="text-5xl font-black tracking-[0.3em] text-emerald-300">{code}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="mb-3 w-full rounded-lg bg-white/12 px-4 py-2 text-sm font-bold hover:bg-white/20"
            >
              {copied ? t('copied') : t('copyInvite')}
            </button>
            <div className="mb-4">
              <OpenInAppButton path={`/vs/${code}`} />
            </div>
          </>
        ) : (
          <p className="mb-4 text-sm opacity-75">
            <b className="tracking-[0.2em] text-emerald-300">{code}</b>
          </p>
        )}

        <SeatRoster seats={room.seats.length ? room.seats : placeholderSeats(room.playerCount)} />

        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-3 text-sm">
          <span className="inline-block size-2 animate-pulse rounded-full bg-amber-400" />
          {ffa3
            ? t('waitingPlayers', { here: humansHere, need: humansNeed || room.playerCount })
            : isHost
              ? t('waitingFriend')
              : t('waitingHost')}
        </div>

        {isHost && ffa3 && room.seats.some((s) => !s.isMe && !s.name && !s.isAI) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={room.fillEmptyWithAi}
              className="w-full rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-black text-black hover:bg-violet-400"
            >
              {t('fillWithAi')}
            </button>
            <p className="mt-1 text-[11px] opacity-55">{t('fillWithAiHint')}</p>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed opacity-50">
          {room.via === 'local' ? t('viaLocal') : room.via === 'supabase' ? t('viaRealtime') : null}{' '}
          {t('roomLifetime')}
        </p>

        <Link
          href={ffa3 ? '/vs?players=3' : '/vs'}
          className="mt-4 inline-block rounded-lg bg-white/12 px-4 py-2 text-sm font-bold"
        >
          {t('cancel')}
        </Link>
      </Shell>
    );
  } else {
    const waitingForOpponent = !room.opponentPresent;
    const others = room.seats.filter((s) => !s.isMe);
    const otherNames = others
      .map((s) => (s.name ? pname(s.name) : t('seatEmpty')))
      .join(' · ');
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
                {isHost ? t('youAreHost') : t('youAreSeat', { n: room.mySeat + 1 })}
              </span>
              <span className="min-w-0 opacity-75">
                {ffa3
                  ? t('opponentsAre', { names: otherNames || t('guest') })
                  : t('opponentIs', {
                      name: room.opponentName ?? (isHost ? t('guest') : t('host')),
                    })}
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
            {ffa3 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {room.seats.map((s) => (
                  <li
                    key={s.seat}
                    className={`rounded px-1.5 py-0.5 ${
                      s.isMe ? 'bg-emerald-400/20' : s.present ? 'bg-white/8' : 'bg-amber-400/15'
                    }`}
                  >
                    {t('seatLabel', { n: s.seat + 1 })}:{' '}
                    {s.isMe ? t('you') : s.name ? pname(s.name) : t('seatEmpty')}
                    {s.isAI ? ` (${t('aiOpponent')})` : ''}
                  </li>
                ))}
              </ul>
            )}
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

function placeholderSeats(n: number): PublicSeat[] {
  return Array.from({ length: n === 3 ? 3 : 2 }, (_, seat) => ({
    seat,
    name: null,
    present: false,
    isAI: false,
    isMe: false,
  }));
}

function SeatRoster({ seats }: { seats: PublicSeat[] }) {
  const { t, name: pname } = useLocale();
  if (!seats.length) return null;
  return (
    <ul className="mb-3 space-y-1.5">
      {seats.map((s) => (
        <li
          key={s.seat}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
        >
          <span
            className={`size-2 shrink-0 rounded-full ${
              s.present ? 'bg-emerald-400' : 'bg-white/25'
            }`}
          />
          <span className="font-bold">{t('seatLabel', { n: s.seat + 1 })}</span>
          <span className="ms-auto min-w-0 truncate opacity-80">
            {s.isMe
              ? t('you')
              : s.isAI
                ? t('aiOpponent')
                : s.name
                  ? pname(s.name)
                  : t('seatEmpty')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Shell({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full px-4 py-12 ${wide ? 'max-w-lg' : 'max-w-md'}`}>
      <div className="panel rounded-2xl p-6">
        <h1 className="mb-4 text-2xl font-black">{title}</h1>
        {children}
      </div>
    </div>
  );
}
