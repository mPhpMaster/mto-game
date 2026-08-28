import { getBrowserSupabase } from '@/lib/supabase/client';
import type { ChatPresenceMeta, ChatWire } from './types';

export interface ChatTransportHandlers {
  onWire: (payload: ChatWire) => void;
  onPresence: (peers: ChatPresenceMeta[]) => void;
  onStatus: (connected: boolean) => void;
}

export interface ChatTransport {
  send: (payload: ChatWire) => void;
  track: (meta: ChatPresenceMeta) => void;
  close: () => void;
}

function isWire(value: unknown): value is ChatWire {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return t === 'chat' || t === 'voice' || t === 'hello' || t === 'bye';
}

/**
 * قناة دردشة مستقلة عن قناة الحالة `mto-room-*` حتى لا تتصارع مع حركات اللعب.
 * - Supabase Realtime عبر الأجهزة
 * - BroadcastChannel لتبويبات نفس المتصفّح (اختبار محلي / شبكة بلا TURN)
 */
export function openChatTransport(
  code: string,
  peerId: string,
  handlers: ChatTransportHandlers
): ChatTransport {
  let closed = false;
  const seen = new Set<string>();
  const localPeers = new Map<string, ChatPresenceMeta>();

  const remember = (key: string): boolean => {
    if (seen.has(key)) return false;
    seen.add(key);
    if (seen.size > 400) {
      const first = seen.values().next().value;
      if (first !== undefined) seen.delete(first);
    }
    return true;
  };

  const wireKey = (payload: ChatWire): string => {
    if (payload.type === 'chat') return `c:${payload.msg.id}`;
    if (payload.type === 'bye') return `b:${payload.peerId}:${Math.floor(Date.now() / 400)}`;
    if (payload.type === 'hello') return `h:${payload.peer.peerId}:${payload.peer.voice}:${payload.peer.micMuted}`;
    const s = payload.signal;
    if (s.kind === 'hangup') return `v:hangup:${s.from}:${Math.floor(Date.now() / 400)}`;
    if (s.kind === 'ice') return `v:ice:${s.from}:${s.to}:${JSON.stringify(s.candidate)}`;
    return `v:${s.kind}:${s.from}:${s.to}:${'sdp' in s ? JSON.stringify(s.sdp) : ''}`;
  };

  const emitWire = (payload: ChatWire) => {
    if (closed || !isWire(payload)) return;
    if (!remember(wireKey(payload))) return;
    handlers.onWire(payload);
  };

  const publishPresence = () => {
    handlers.onPresence([...localPeers.values()].filter((p) => p.peerId !== peerId));
  };

  // --- تبويب محلي ---
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(`mto-chat-${code}`);
    bc.onmessage = (ev: MessageEvent<unknown>) => {
      if (isWire(ev.data)) {
        if (ev.data.type === 'hello' && ev.data.peer.peerId !== peerId) {
          localPeers.set(ev.data.peer.peerId, ev.data.peer);
          publishPresence();
        }
        if (ev.data.type === 'bye') {
          localPeers.delete(ev.data.peerId);
          publishPresence();
        }
        emitWire(ev.data);
      }
    };
  } catch {
    bc = null;
  }

  // --- Supabase ---
  const supabase = getBrowserSupabase();
  const channel = supabase
    ? supabase.channel(`mto-chat-${code}`, {
        config: { presence: { key: peerId }, broadcast: { ack: false } },
      })
    : null;

  if (channel) {
    channel.on('broadcast', { event: 'wire' }, ({ payload }) => {
      if (isWire(payload)) {
        if (payload.type === 'hello' && payload.peer.peerId !== peerId) {
          localPeers.set(payload.peer.peerId, payload.peer);
          publishPresence();
        }
        if (payload.type === 'bye') {
          localPeers.delete(payload.peerId);
          publishPresence();
        }
        emitWire(payload);
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const members = Object.values(channel.presenceState()).flat() as unknown as ChatPresenceMeta[];
      for (const m of members) {
        if (m?.peerId && m.peerId !== peerId) localPeers.set(m.peerId, m);
      }
      publishPresence();
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (typeof key === 'string') localPeers.delete(key);
      publishPresence();
    });

    channel.subscribe((status) => {
      if (closed) return;
      if (status === 'SUBSCRIBED') handlers.onStatus(true);
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        handlers.onStatus(Boolean(bc));
      }
    });
  } else if (bc) {
    handlers.onStatus(true);
  } else {
    handlers.onStatus(false);
  }

  const send = (payload: ChatWire) => {
    if (closed) return;
    // نعرض رسائلنا محلياً من الخطّاف، لكن إشارات الصوت وhello يجب أن تخرج
    try {
      bc?.postMessage(payload);
    } catch {
      /* */
    }
    channel?.send({ type: 'broadcast', event: 'wire', payload });
  };

  const track = (meta: ChatPresenceMeta) => {
    if (closed) return;
    localPeers.set(meta.peerId, meta);
    channel?.track(meta);
    send({ type: 'hello', peer: meta });
  };

  const close = () => {
    if (closed) return;
    closed = true;
    send({ type: 'bye', peerId });
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
