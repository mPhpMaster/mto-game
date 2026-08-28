import { getBrowserSupabase } from '@/lib/supabase/client';
import type { GameAction, GameState, Seat } from '@/lib/game/types';
import type { PlayerCount, SeatOccupant } from './seats';

export type RoomEventName =
  | 'hello'
  | 'bye'
  | 'config'
  | 'assign'
  | 'roster'
  | 'state'
  | 'action'
  | 'restart'
  | 'fill-ai';

export interface HelloPayload {
  clientId: string;
  name: string;
}

export interface ConfigPayload {
  playerCount: PlayerCount;
  turnSeconds: number;
  fillAi: boolean;
}

export interface AssignPayload {
  clientId: string;
  seat: Seat | null;
  name: string;
  reason?: 'full';
}

export interface RosterPayload {
  seats: SeatOccupant[];
  playerCount: PlayerCount;
  fillAi: boolean;
}

export interface StatePayload {
  forSeat: Seat;
  state: GameState;
  remainingMs?: number;
  turnSeconds?: number;
  ended?: boolean;
}

export interface ActionPayload {
  action: GameAction;
  clientId: string;
}

export type RoomPayload =
  | HelloPayload
  | ConfigPayload
  | AssignPayload
  | RosterPayload
  | StatePayload
  | ActionPayload
  | Record<string, never>
  | { clientId: string };

export interface RoomWire {
  v: 1;
  id: string;
  event: RoomEventName;
  payload: unknown;
}

export interface PresenceMember {
  role: 'host' | 'guest';
  name: string;
  clientId: string;
  seat?: Seat | null;
}

export interface RoomTransport {
  send: (event: RoomEventName, payload: unknown) => void;
  track: (meta: PresenceMember) => void;
  close: () => void;
}

export interface RoomTransportHandlers {
  onEvent: (wire: RoomWire) => void;
  onStatus: (connected: boolean, via: 'supabase' | 'local' | 'none') => void;
  onPresence: (members: PresenceMember[]) => void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isWire(value: unknown): value is RoomWire {
  if (!value || typeof value !== 'object') return false;
  const w = value as RoomWire;
  return w.v === 1 && typeof w.id === 'string' && typeof w.event === 'string';
}

function isPresence(value: unknown): value is PresenceMember {
  if (!value || typeof value !== 'object') return false;
  const m = value as PresenceMember;
  return (m.role === 'host' || m.role === 'guest') && typeof m.clientId === 'string';
}

/**
 * قناة غرفة اللعب:
 * - Supabase Realtime عبر الأجهزة إن ضُبطت المفاتيح
 * - BroadcastChannel لتبويبات نفس الأصل (اختبار 1 ضد 1 ضد 1 بلا أسرار)
 */
export function openRoomTransport(
  code: string,
  clientId: string,
  handlers: RoomTransportHandlers
): RoomTransport {
  let closed = false;
  const seen = new Set<string>();
  const localPeers = new Map<string, PresenceMember>();

  const remember = (id: string): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    if (seen.size > 500) {
      const first = seen.values().next().value;
      if (first !== undefined) seen.delete(first);
    }
    return true;
  };

  const emit = (wire: RoomWire) => {
    if (closed || !isWire(wire) || !remember(wire.id)) return;
    handlers.onEvent(wire);
  };

  const publishPresence = () => {
    handlers.onPresence([...localPeers.values()]);
  };

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(`mto-room-${code}`);
    bc.onmessage = (ev: MessageEvent<unknown>) => {
      if (isWire(ev.data)) emit(ev.data);
    };
  } catch {
    bc = null;
  }

  const supabase = getBrowserSupabase();
  const channel = supabase
    ? supabase.channel(`mto-room-${code}`, {
        config: { presence: { key: clientId || 'anon' }, broadcast: { ack: false } },
      })
    : null;

  if (channel) {
    channel.on('broadcast', { event: 'wire' }, ({ payload }) => {
      if (isWire(payload)) emit(payload);
    });

    channel.on('presence', { event: 'sync' }, () => {
      const raw = Object.values(channel.presenceState()).flat() as unknown[];
      for (const item of raw) {
        if (isPresence(item)) localPeers.set(item.clientId, item);
      }
      publishPresence();
    });

    channel.subscribe((status) => {
      if (closed) return;
      if (status === 'SUBSCRIBED') handlers.onStatus(true, 'supabase');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        handlers.onStatus(Boolean(bc), bc ? 'local' : 'none');
      }
    });
  } else if (bc) {
    handlers.onStatus(true, 'local');
  } else {
    handlers.onStatus(false, 'none');
  }

  const send = (event: RoomEventName, payload: unknown) => {
    if (closed) return;
    const wire: RoomWire = { v: 1, id: newId(), event, payload };
    remember(wire.id);
    try {
      bc?.postMessage(wire);
    } catch {
      /* */
    }
    channel?.send({ type: 'broadcast', event: 'wire', payload: wire });
  };

  const track = (meta: PresenceMember) => {
    if (closed) return;
    localPeers.set(meta.clientId, meta);
    channel?.track(meta);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      bc?.close();
    } catch {
      /* */
    }
    bc = null;
    if (channel && supabase) {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    }
  };

  return { send, track, close };
}

export function getRoomClientId(): string {
  try {
    const key = 'mto-room-client';
    const existing = sessionStorage.getItem(key);
    if (existing && existing.length >= 6 && existing.length <= 80) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
