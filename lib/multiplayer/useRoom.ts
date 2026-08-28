'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyAutoPlay } from '@/lib/game/ai';
import { applyGameAction, createGame } from '@/lib/game/engine';
import { redactFor } from '@/lib/game/redact';
import type { GameAction, GameState } from '@/lib/game/types';
import { MULTIPLAYER_READY, getBrowserSupabase } from '@/lib/supabase/client';
import { DEFAULT_TURN_SECONDS } from './turnClock';

export type RoomRole = 'host' | 'guest';
export type RoomStatus =
  | 'unavailable'
  | 'connecting'
  | 'waiting'
  | 'playing'
  | 'error';

/** المضيف هو الخانة 0 والضيف الخانة 1 — ومن يبدأ تحدّده القرعة لا الدور في الغرفة */
export const HOST_SEAT = 0 as const;
export const GUEST_SEAT = 1 as const;

interface Options {
  code: string;
  role: RoomRole;
  myName: string;
  /** اسم افتراضي للطرف الآخر قبل أن يُعلن عن نفسه */
  fallbackOpponentName?: string;
  /** مدّة الجولة بالثواني — يضبطها المضيف ويلتزم بها الطرفان */
  turnSeconds?: number;
}

interface RoomResult {
  status: RoomStatus;
  /** الحالة المعروضة لهذا اللاعب (منقوصة عند الضيف) */
  state: GameState | null;
  mySeat: 0 | 1;
  opponentName: string | null;
  opponentPresent: boolean;
  error: string | null;
  sendAction: (action: GameAction) => void;
  /** للمضيف فقط: مباراة جديدة بنفس الغرفة */
  newMatch: () => void;
  /** لحظة انتهاء الجولة بتوقيت هذا الجهاز، أو null إن لا مؤقّت */
  turnDeadline: number | null;
  turnSeconds: number;
}

export function useRoom({
  code,
  role,
  myName,
  fallbackOpponentName = 'Guest',
  turnSeconds = DEFAULT_TURN_SECONDS,
}: Options): RoomResult {
  const isHost = role === 'host';
  const mySeat: 0 | 1 = isHost ? HOST_SEAT : GUEST_SEAT;

  // شرطان ثابتان يُعرفان وقت العرض، فلا داعي لمؤثّر جانبي يضبطهما
  const usable = MULTIPLAYER_READY && Boolean(code);
  const [status, setStatus] = useState<RoomStatus>(() =>
    !MULTIPLAYER_READY ? 'unavailable' : !code ? 'error' : 'connecting'
  );
  const [state, setState] = useState<GameState | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentPresent, setOpponentPresent] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    MULTIPLAYER_READY && !code ? 'invalidCode' : null
  );
  /**
   * المهلة تُبثّ كمدّة متبقّية لا كوقت مطلق: ساعتا الجهازين قد تختلفان،
   * فيحسب كل طرف لحظة الانتهاء بتوقيته هو.
   */
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(turnSeconds);
  const lastTurnRef = useRef(-1);

  /** الحالة الكاملة — عند المضيف فقط، فهو الحَكَم */
  const fullRef = useRef<GameState | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const opponentNameRef = useRef<string | null>(null);

  /** يبثّ للضيف نسخة منقوصة، ويعرض للمضيف النسخة الكاملة */
  const publish = useCallback(
    (next: GameState) => {
      fullRef.current = next;
      setState(next);

      // المؤقّت يُصفَّر عند تغيّر الدور فقط، لا مع كل حركة داخل الدور
      const turnChanged = next.turn !== lastTurnRef.current;
      if (turnChanged) lastTurnRef.current = next.turn;
      const running = next.phase !== 'ended' && turnSeconds > 0;
      if (turnChanged && running) setTurnDeadline(Date.now() + turnSeconds * 1000);
      if (!running) setTurnDeadline(null);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'state',
        payload: {
          state: redactFor(next, GUEST_SEAT),
          // مدّة متبقّية، لا وقت مطلق
          remainingMs: running && turnChanged ? turnSeconds * 1000 : undefined,
          turnSeconds,
          ended: next.phase === 'ended',
        },
      });
    },
    [turnSeconds]
  );

  const startMatch = useCallback(() => {
    const g = createGame({
      playerName: myName,
      opponentName: opponentNameRef.current ?? fallbackOpponentName,
      opponentIsAI: false,
      difficulty: 'hard',
    });
    publish(g);
    setStatus('playing');
  }, [myName, publish, fallbackOpponentName]);

  useEffect(() => {
    if (!usable) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase.channel(`mto-room-${code}`, {
      config: { presence: { key: `${role}-${Math.random().toString(36).slice(2, 8)}` } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const members = Object.values(channel.presenceState()).flat() as {
        role?: RoomRole;
        name?: string;
      }[];
      const other = members.find((m) => m.role && m.role !== role);
      setOpponentPresent(Boolean(other));
      if (other?.name) {
        opponentNameRef.current = other.name;
        setOpponentName(other.name);
      }
      if (!other) setStatus((s) => (s === 'playing' ? 'waiting' : s));
    });

    // الضيف يعلن حضوره؛ والمضيف يبدأ المباراة أو يعيد إرسال الحالة عند إعادة الاتصال
    channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
      const name = (payload as { name?: string })?.name;
      if (name) {
        opponentNameRef.current = name;
        setOpponentName(name);
      }
      if (!isHost) return;
      if (fullRef.current) {
        const current = fullRef.current;
        // مزامنة الاسم في الحالة الجارية ثم إعادة البثّ للضيف العائد
        if (name) current.players[GUEST_SEAT].name = name;
        publish(current);
        setStatus('playing');
      } else {
        startMatch();
      }
    });

    // الضيف يستقبل الحالة من المضيف
    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isHost) return;
      const p = payload as {
        state?: GameState;
        remainingMs?: number;
        turnSeconds?: number;
        ended?: boolean;
      };
      if (!p?.state) return;
      setState(p.state);
      setStatus('playing');
      if (p.turnSeconds) setActiveSeconds(p.turnSeconds);
      if (p.ended) setTurnDeadline(null);
      else if (typeof p.remainingMs === 'number') setTurnDeadline(Date.now() + p.remainingMs);
    });

    // المضيف يستقبل حركات الضيف ويحكم عليها
    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      if (!isHost) return;
      const action = (payload as { action?: GameAction })?.action;
      const current = fullRef.current;
      if (!action || !current) return;
      // الضيف لا يلعب إلا في دوره — الحَكَم هو المضيف
      if (current.current !== GUEST_SEAT || current.phase === 'ended') return;
      publish(applyGameAction(current, action));
    });

    channel.on('broadcast', { event: 'restart' }, () => {
      if (!isHost) return;
      startMatch();
    });

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        channel.track({ role, name: myName });
        setStatus((prev) => (prev === 'connecting' ? 'waiting' : prev));
        if (!isHost) channel.send({ type: 'broadcast', event: 'hello', payload: { name: myName } });
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('error');
        setError('roomConnectError');
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [usable, code, role, isHost, myName, publish, startMatch]);

  const sendAction = useCallback(
    (action: GameAction) => {
      if (isHost) {
        const current = fullRef.current;
        if (!current || current.current !== HOST_SEAT || current.phase === 'ended') return;
        publish(applyGameAction(current, action));
      } else {
        channelRef.current?.send({ type: 'broadcast', event: 'action', payload: { action } });
      }
    },
    [isHost, publish]
  );

  /**
   * انتهاء المهلة: المضيف وحده يشغّل اللعب التلقائي — فهو الحَكَم، ولو فعلها
   * الطرفان لأُنجز دوران في وقت واحد.
   */
  useEffect(() => {
    if (!isHost || turnDeadline === null) return;
    const delay = Math.max(0, turnDeadline - Date.now());
    const expectedTurn = lastTurnRef.current;
    const timer = window.setTimeout(() => {
      const current = fullRef.current;
      if (!current || current.phase === 'ended') return;
      if (current.turn !== expectedTurn) return;
      publish(applyAutoPlay(current));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isHost, turnDeadline, publish]);

  const newMatch = useCallback(() => {
    if (isHost) startMatch();
    else channelRef.current?.send({ type: 'broadcast', event: 'restart', payload: {} });
  }, [isHost, startMatch]);

  return {
    status,
    state,
    mySeat,
    opponentName,
    opponentPresent,
    error,
    sendAction,
    newMatch,
    turnDeadline,
    turnSeconds: isHost ? turnSeconds : activeSeconds,
  };
}
