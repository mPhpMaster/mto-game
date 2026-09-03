'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAutoPlay } from '@/lib/game/ai';
import { applyGameAction, createGame } from '@/lib/game/engine';
import { redactFor } from '@/lib/game/redact';
import type { GameAction, GameState, Seat } from '@/lib/game/types';
import { CROSS_DEVICE_READY } from '@/lib/supabase/client';
import { DEFAULT_TURN_SECONDS } from './turnClock';
import {
  HOST_SEAT,
  canStart,
  claimSeat,
  fillEmptyWithAi,
  makeLobby,
  normalizePlayerCount,
  occupantByClient,
  publicSeats,
  setPresent,
  toRoster,
  type PlayerCount,
  type SeatOccupant,
} from './seats';
import {
  getRoomClientId,
  openRoomTransport,
  type ActionPayload,
  type AssignPayload,
  type ConfigPayload,
  type HelloPayload,
  type PresenceMember,
  type RosterPayload,
  type RoomTransport,
  type StatePayload,
} from './roomTransport';

export type RoomRole = 'host' | 'guest';
export type RoomStatus = 'unavailable' | 'connecting' | 'waiting' | 'playing' | 'error';
export type RoomVia = 'supabase' | 'local' | 'none';

export { HOST_SEAT, GUEST_SEAT } from './seats';

export type PublicSeat = {
  seat: Seat;
  name: string | null;
  present: boolean;
  isAI: boolean;
  isMe: boolean;
};

interface Options {
  code: string;
  role: RoomRole;
  myName: string;
  /** اسم افتراضي للطرف الآخر قبل أن يُعلن عن نفسه */
  fallbackOpponentName?: string;
  /** مدّة الجولة بالثواني — يضبطها المضيف ويلتزم بها الطرفان */
  turnSeconds?: number;
  /** 2 = 1 ضد 1، 3 = 1 ضد 1 ضد 1 — المضيف يفرضها عبر البثّ */
  playerCount?: number;
}

interface RoomResult {
  status: RoomStatus;
  state: GameState | null;
  mySeat: Seat;
  playerCount: PlayerCount;
  seats: PublicSeat[];
  opponentName: string | null;
  opponentPresent: boolean;
  error: string | null;
  via: RoomVia;
  crossDevice: boolean;
  sendAction: (action: GameAction) => void;
  newMatch: () => void;
  fillEmptyWithAi: () => void;
  turnDeadline: number | null;
  turnSeconds: number;
}

export function useRoom({
  code,
  role,
  myName,
  fallbackOpponentName = 'Guest',
  turnSeconds = DEFAULT_TURN_SECONDS,
  playerCount: requestedCount = 2,
}: Options): RoomResult {
  const isHost = role === 'host';
  const clientIdRef = useRef('');
  if (!clientIdRef.current) clientIdRef.current = getRoomClientId();

  const [status, setStatus] = useState<RoomStatus>(() => (!code ? 'error' : 'connecting'));
  const [state, setState] = useState<GameState | null>(null);
  const [mySeat, setMySeat] = useState<Seat>(isHost ? HOST_SEAT : -1);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(() =>
    isHost ? normalizePlayerCount(requestedCount) : 2
  );
  const [lobby, setLobby] = useState<SeatOccupant[]>(() =>
    isHost
      ? makeLobby(normalizePlayerCount(requestedCount), {
          clientId: clientIdRef.current,
          name: myName,
        })
      : []
  );
  const [error, setError] = useState<string | null>(() => (!code ? 'invalidCode' : null));
  const [via, setVia] = useState<RoomVia>('none');
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(turnSeconds);
  const lastEpochRef = useRef(-1);

  const fullRef = useRef<GameState | null>(null);
  const transportRef = useRef<RoomTransport | null>(null);
  const lobbyRef = useRef<SeatOccupant[]>(
    isHost
      ? makeLobby(normalizePlayerCount(requestedCount), {
          clientId: clientIdRef.current,
          name: myName,
        })
      : []
  );
  const mySeatRef = useRef<Seat>(isHost ? HOST_SEAT : -1);
  const playerCountRef = useRef<PlayerCount>(isHost ? normalizePlayerCount(requestedCount) : 2);
  const fillAiRef = useRef(false);
  const pendingViews = useRef<Map<Seat, StatePayload>>(new Map());
  const myNameRef = useRef(myName);
  myNameRef.current = myName;

  const syncLobby = useCallback((next: SeatOccupant[]) => {
    lobbyRef.current = next;
    setLobby(next);
  }, []);

  const applyView = useCallback((p: StatePayload) => {
    setState(p.state);
    setStatus('playing');
    if (p.turnSeconds) setActiveSeconds(p.turnSeconds);
    if (p.ended) setTurnDeadline(null);
    else if (typeof p.remainingMs === 'number') setTurnDeadline(Date.now() + p.remainingMs);
  }, []);

  const publish = useCallback(
    (next: GameState) => {
      fullRef.current = next;
      setState(next);
      setStatus('playing');

      // حقبة العدّاد لا رقم الدور: «تخطي» يزيد الدور دون أن ينقله لشخص آخر،
      // فلو صُفِّرت المهلة على رقم الدور لربح صاحبه مهلة كاملة مجاناً.
      const clockChanged = next.clockEpoch !== lastEpochRef.current;
      if (clockChanged) lastEpochRef.current = next.clockEpoch;
      const running = next.phase !== 'ended' && turnSeconds > 0;
      if (clockChanged && running) setTurnDeadline(Date.now() + turnSeconds * 1000);
      if (!running) setTurnDeadline(null);

      const n = next.players.length;
      for (let seat = 0; seat < n; seat++) {
        if (seat === HOST_SEAT) continue;
        transportRef.current?.send('state', {
          forSeat: seat,
          state: redactFor(next, seat),
          remainingMs: running && clockChanged ? turnSeconds * 1000 : undefined,
          turnSeconds,
          ended: next.phase === 'ended',
        } satisfies StatePayload);
      }
    },
    [turnSeconds]
  );

  const broadcastRoster = useCallback(
    (next: SeatOccupant[]) => {
      transportRef.current?.send('roster', {
        seats: next,
        playerCount: playerCountRef.current,
        fillAi: fillAiRef.current,
      } satisfies RosterPayload);
      transportRef.current?.send('config', {
        playerCount: playerCountRef.current,
        turnSeconds,
        fillAi: fillAiRef.current,
      } satisfies ConfigPayload);
    },
    [turnSeconds]
  );

  const startMatch = useCallback(() => {
    const roster = toRoster(lobbyRef.current);
    if (roster.length < 2) return;
    const g = createGame({
      playerName: roster[0]?.name ?? myNameRef.current,
      opponentName: roster[1]?.name ?? fallbackOpponentName,
      opponentIsAI: roster.some((p) => p.isAI),
      difficulty: 'hard',
      playerCount: roster.length,
      roster,
    });
    publish(g);
  }, [fallbackOpponentName, publish]);

  const tryStart = useCallback(() => {
    if (!isHost) return;
    if (fullRef.current) {
      const current = fullRef.current;
      for (const seat of lobbyRef.current) {
        if (seat.name && current.players[seat.seat]) {
          current.players[seat.seat].name = seat.name;
        }
      }
      publish(current);
      return;
    }
    if (canStart(lobbyRef.current, fillAiRef.current)) startMatch();
  }, [isHost, publish, startMatch]);

  useEffect(() => {
    if (!code) return;

    // نسخة محلّية للتنظيف: المرجع لا يُعاد إسناده أبداً، لكن قراءته في دالة
    // التنظيف تقرأ ما استقرّ عليه وقت الإغلاق لا وقت التركيب.
    const views = pendingViews.current;

    const transport = openRoomTransport(code, clientIdRef.current, {
      onStatus: (connected, nextVia) => {
        setVia(nextVia);
        if (!connected) {
          setStatus('error');
          setError('roomConnectError');
          return;
        }
        setStatus((prev) => (prev === 'connecting' || prev === 'error' ? 'waiting' : prev));
      },
      onPresence: (members: PresenceMember[]) => {
        if (!isHost) return;
        const mine = clientIdRef.current;
        const presentIds = new Set(
          members.filter((m) => m.clientId && m.clientId !== mine).map((m) => m.clientId)
        );
        if (presentIds.size === 0 && members.every((m) => m.clientId === mine || !m.clientId)) {
          // لا تمسح الضيوف الذين انضمّوا عبر البثّ قبل اكتمال حضور Supabase
          return;
        }
        let next = lobbyRef.current;
        for (const seat of next) {
          if (seat.seat === HOST_SEAT || seat.isAI || !seat.clientId) continue;
          const here = presentIds.has(seat.clientId);
          if (seat.present !== here) next = setPresent(next, seat.clientId, here);
        }
        if (next !== lobbyRef.current) {
          syncLobby(next);
          broadcastRoster(next);
        }
      },
      onEvent: (wire) => {
        if (wire.event === 'hello') {
          if (!isHost) return;
          const p = wire.payload as HelloPayload;
          if (!p?.clientId) return;
          const claimed = claimSeat(lobbyRef.current, p.clientId, p.name);
          syncLobby(claimed.lobby);
          transport.send('assign', {
            clientId: p.clientId,
            seat: claimed.seat,
            name: p.name,
            reason: claimed.reason,
          } satisfies AssignPayload);
          broadcastRoster(claimed.lobby);
          if (claimed.seat !== null) tryStart();
          return;
        }

        if (wire.event === 'bye') {
          if (!isHost) return;
          const id = (wire.payload as { clientId?: string })?.clientId;
          if (!id) return;
          const next = setPresent(lobbyRef.current, id, false);
          syncLobby(next);
          broadcastRoster(next);
          return;
        }

        if (wire.event === 'config') {
          if (isHost) return;
          const p = wire.payload as ConfigPayload;
          if (p?.playerCount) {
            playerCountRef.current = normalizePlayerCount(p.playerCount);
            setPlayerCount(playerCountRef.current);
          }
          if (p?.turnSeconds) setActiveSeconds(p.turnSeconds);
          return;
        }

        if (wire.event === 'assign') {
          if (isHost) return;
          const p = wire.payload as AssignPayload;
          if (p?.clientId !== clientIdRef.current) return;
          if (p.seat === null) {
            setStatus('error');
            setError('roomFull');
            return;
          }
          mySeatRef.current = p.seat;
          setMySeat(p.seat);
          const stashed = pendingViews.current.get(p.seat);
          if (stashed) {
            pendingViews.current.delete(p.seat);
            applyView(stashed);
          }
          transport.track({
            role: 'guest',
            name: myNameRef.current,
            clientId: clientIdRef.current,
            seat: p.seat,
          });
          return;
        }

        if (wire.event === 'roster') {
          const p = wire.payload as RosterPayload;
          if (!p?.seats?.length) return;
          if (!isHost) {
            syncLobby(p.seats);
            playerCountRef.current = normalizePlayerCount(p.playerCount);
            setPlayerCount(playerCountRef.current);
          }
          return;
        }

        if (wire.event === 'state') {
          if (isHost) return;
          const p = wire.payload as StatePayload;
          if (!p?.state) return;
          if (mySeatRef.current < 0) {
            if (typeof p.forSeat === 'number') pendingViews.current.set(p.forSeat, p);
            return;
          }
          if (typeof p.forSeat === 'number' && p.forSeat !== mySeatRef.current) {
            pendingViews.current.set(p.forSeat, p);
            return;
          }
          applyView(p);
          return;
        }

        if (wire.event === 'action') {
          if (!isHost) return;
          const p = wire.payload as ActionPayload;
          const current = fullRef.current;
          if (!p?.action || !current || current.phase === 'ended') return;
          const who = occupantByClient(lobbyRef.current, p.clientId);
          if (!who || current.current !== who.seat || who.isAI) return;
          publish(applyGameAction(current, p.action));
          return;
        }

        if (wire.event === 'restart') {
          if (!isHost) return;
          startMatch();
          return;
        }

        if (wire.event === 'fill-ai') {
          if (!isHost) return;
          fillAiRef.current = true;
          const filled = fillEmptyWithAi(lobbyRef.current);
          syncLobby(filled);
          broadcastRoster(filled);
          tryStart();
        }
      },
    });

    transportRef.current = transport;
    transport.track({
      role,
      name: myNameRef.current,
      clientId: clientIdRef.current,
      seat: isHost ? HOST_SEAT : mySeatRef.current,
    });
    if (isHost) {
      if (lobbyRef.current.length === 0) {
        syncLobby(
          makeLobby(playerCountRef.current, {
            clientId: clientIdRef.current,
            name: myNameRef.current,
          })
        );
      }
      broadcastRoster(lobbyRef.current);
    } else {
      transport.send('hello', {
        clientId: clientIdRef.current,
        name: myNameRef.current,
      } satisfies HelloPayload);
    }

    return () => {
      transport.send('bye', { clientId: clientIdRef.current });
      transport.close();
      transportRef.current = null;
      fullRef.current = null;
      views.clear();
    };
    // الغرفة مربوطة بالرمز والدور فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, role, isHost]);

  useEffect(() => {
    if (isHost || !code || status === 'playing' || status === 'error' || status === 'unavailable') {
      return;
    }
    const tick = () => {
      transportRef.current?.send('hello', {
        clientId: clientIdRef.current,
        name: myNameRef.current,
      } satisfies HelloPayload);
    };
    tick();
    const id = window.setInterval(tick, 1600);
    return () => window.clearInterval(id);
  }, [isHost, code, status]);

  useEffect(() => {
    if (!isHost || status === 'playing' || status === 'error' || status === 'unavailable') return;
    const id = window.setInterval(() => {
      if (lobbyRef.current.length) broadcastRoster(lobbyRef.current);
    }, 2000);
    return () => window.clearInterval(id);
  }, [isHost, status, broadcastRoster]);

  const sendAction = useCallback(
    (action: GameAction) => {
      if (isHost) {
        const current = fullRef.current;
        if (!current || current.current !== HOST_SEAT || current.phase === 'ended') return;
        publish(applyGameAction(current, action));
      } else {
        transportRef.current?.send('action', {
          action,
          clientId: clientIdRef.current,
        } satisfies ActionPayload);
      }
    },
    [isHost, publish]
  );

  useEffect(() => {
    if (!isHost || turnDeadline === null) return;
    const delay = Math.max(0, turnDeadline - Date.now());
    const expectedEpoch = lastEpochRef.current;
    const timer = window.setTimeout(() => {
      const current = fullRef.current;
      if (!current || current.phase === 'ended') return;
      if (current.clockEpoch !== expectedEpoch) return;
      publish(applyAutoPlay(current));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isHost, turnDeadline, publish]);

  /** الخصم الآلي في الخانات الفارغة — المضيف وحده يشغّله */
  useEffect(() => {
    if (!isHost || !state || state.phase === 'ended') return;
    if (!state.players[state.current]?.isAI) return;
    const expectedTurn = state.turn;
    const timer = window.setTimeout(() => {
      const current = fullRef.current;
      if (!current || current.phase === 'ended') return;
      if (current.turn !== expectedTurn) return;
      if (!current.players[current.current]?.isAI) return;
      publish(applyAutoPlay(current));
    }, 480);
    return () => window.clearTimeout(timer);
  }, [isHost, state, publish]);

  const newMatch = useCallback(() => {
    if (isHost) startMatch();
    else transportRef.current?.send('restart', {});
  }, [isHost, startMatch]);

  const fillEmpty = useCallback(() => {
    if (!isHost) return;
    fillAiRef.current = true;
    const filled = fillEmptyWithAi(lobbyRef.current);
    syncLobby(filled);
    broadcastRoster(filled);
    tryStart();
  }, [isHost, syncLobby, broadcastRoster, tryStart]);

  const seats = publicSeats(lobby.length ? lobby : lobbyRef.current, mySeat);
  const others = seats.filter((s) => !s.isMe && !s.isAI);
  const opponentName =
    others.find((s) => s.name)?.name ?? (others.length ? null : null);
  const opponentPresent = others.length === 0 ? false : others.every((s) => s.present);

  return {
    status,
    state,
    mySeat,
    playerCount,
    seats,
    opponentName,
    opponentPresent,
    error,
    via,
    crossDevice: CROSS_DEVICE_READY,
    sendAction,
    newMatch,
    fillEmptyWithAi: fillEmpty,
    turnDeadline,
    turnSeconds: isHost ? turnSeconds : activeSeconds,
  };
}
