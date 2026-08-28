'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrCreatePeerId, newMessageId } from './ids';
import {
  readDeafened,
  readMicMuted,
  readMutedPeers,
  writeDeafened,
  writeMicMuted,
  writeMutedPeers,
} from './mute';
import { CHAT_HISTORY_CAP, CHAT_MAX_LEN, filterMutedText, sanitizeChatText } from './text';
import { openChatTransport, type ChatTransport } from './transport';
import type {
  ChatMessage,
  ChatPeer,
  ChatPresenceMeta,
  ChatWire,
  VoiceSignal,
  VoiceStatus,
} from './types';
import {
  ICE_SERVERS,
  captureMic,
  isOfferInitiator,
  playRemoteAudio,
  setStreamMuted,
  stopStream,
  unlockAudioPlayback,
  voiceSupported,
} from './voice';

export interface UseMatchChatOptions {
  code: string;
  myName: string;
  mySeat?: number;
}

export interface MatchChatApi {
  myPeerId: string;
  connected: boolean;
  peers: ChatPeer[];
  messages: ChatMessage[];
  visibleMessages: ChatMessage[];
  sendText: (raw: string) => boolean;
  maxLen: number;
  voiceStatus: VoiceStatus;
  voiceEnabled: boolean;
  iceFailed: boolean;
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  micMuted: boolean;
  toggleMic: () => void;
  deafened: boolean;
  toggleDeafen: () => void;
  mutedPeerIds: ReadonlySet<string>;
  toggleMutePeer: (peerId: string) => void;
  isPeerMuted: (peerId: string) => boolean;
}

interface PcSlot {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  makingOffer: boolean;
}

export function useMatchChat({ code, myName, mySeat }: UseMatchChatOptions): MatchChatApi {
  const myPeerIdRef = useRef<string>('');
  if (!myPeerIdRef.current) myPeerIdRef.current = getOrCreatePeerId();
  const myPeerId = myPeerIdRef.current;

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<ChatPeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('off');
  const [iceFailed, setIceFailed] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [mutedPeerIds, setMutedPeerIds] = useState<Set<string>>(() => new Set());

  const transportRef = useRef<ChatTransport | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef(new Map<string, PcSlot>());
  const remotesRef = useRef(new Map<string, { stream: MediaStream; el: HTMLAudioElement }>());
  const voiceOnRef = useRef(false);
  const joiningRef = useRef(false);
  const micMutedRef = useRef(true);
  const deafenedRef = useRef(false);
  const mutedRef = useRef<Set<string>>(new Set());
  const peersRef = useRef<ChatPeer[]>([]);
  const nameRef = useRef(myName);
  const seatRef = useRef(mySeat);

  nameRef.current = myName;
  seatRef.current = mySeat;
  micMutedRef.current = micMuted;
  deafenedRef.current = deafened;
  mutedRef.current = mutedPeerIds;
  peersRef.current = peers;

  const applyRemoteAudioState = useCallback((peerId: string) => {
    const remote = remotesRef.current.get(peerId);
    if (!remote) return;
    remote.el.muted = deafenedRef.current || mutedRef.current.has(peerId);
  }, []);

  const applyAllRemoteAudio = useCallback(() => {
    for (const id of remotesRef.current.keys()) applyRemoteAudioState(id);
    for (const remote of remotesRef.current.values()) void playRemoteAudio(remote.el);
  }, [applyRemoteAudioState]);

  const dropRemote = useCallback((peerId: string) => {
    const remote = remotesRef.current.get(peerId);
    if (remote) {
      remote.el.pause();
      remote.el.srcObject = null;
      remotesRef.current.delete(peerId);
    }
  }, []);

  const closePc = useCallback(
    (peerId: string) => {
      const slot = pcsRef.current.get(peerId);
      if (slot) {
        slot.pc.onicecandidate = null;
        slot.pc.ontrack = null;
        slot.pc.close();
        pcsRef.current.delete(peerId);
      }
      dropRemote(peerId);
    },
    [dropRemote]
  );

  const closeAllPcs = useCallback(() => {
    for (const id of [...pcsRef.current.keys()]) closePc(id);
  }, [closePc]);

  const attachRemoteStream = useCallback(
    (peerId: string, stream: MediaStream) => {
      let remote = remotesRef.current.get(peerId);
      if (!remote) {
        const el = document.createElement('audio');
        el.autoplay = true;
        el.setAttribute('playsinline', 'true');
        el.setAttribute('aria-hidden', 'true');
        remote = { stream, el };
        remotesRef.current.set(peerId, remote);
      }
      remote.stream = stream;
      remote.el.srcObject = stream;
      applyRemoteAudioState(peerId);
      void playRemoteAudio(remote.el);
    },
    [applyRemoteAudioState]
  );

  const ensurePc = useCallback(
    (theirId: string): PcSlot => {
      const existing = pcsRef.current.get(theirId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const slot: PcSlot = { pc, pendingIce: [], makingOffer: false };
      pcsRef.current.set(theirId, slot);

      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getTracks()) pc.addTrack(track, local);
      }

      pc.onicecandidate = (ev) => {
        transportRef.current?.send({
          type: 'voice',
          signal: {
            kind: 'ice',
            from: myPeerId,
            to: theirId,
            candidate: ev.candidate ? ev.candidate.toJSON() : null,
          },
        });
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        attachRemoteStream(theirId, stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') setIceFailed(true);
        if (pc.connectionState === 'connected') setIceFailed(false);
        if (pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
          dropRemote(theirId);
        }
      };

      return slot;
    },
    [attachRemoteStream, dropRemote, myPeerId]
  );

  const flushIce = useCallback(async (slot: PcSlot) => {
    if (!slot.pc.remoteDescription) return;
    const queued = slot.pendingIce.splice(0);
    for (const c of queued) {
      try {
        await slot.pc.addIceCandidate(c);
      } catch {
        /* مرشّح متأخر بعد الإغلاق */
      }
    }
  }, []);

  const callPeer = useCallback(
    async (theirId: string) => {
      if (!voiceOnRef.current || !isOfferInitiator(myPeerId, theirId)) return;
      const slot = ensurePc(theirId);
      if (slot.pc.signalingState !== 'stable') return;
      try {
        slot.makingOffer = true;
        const offer = await slot.pc.createOffer({ offerToReceiveAudio: true });
        await slot.pc.setLocalDescription(offer);
        transportRef.current?.send({
          type: 'voice',
          signal: { kind: 'offer', from: myPeerId, to: theirId, sdp: slot.pc.localDescription! },
        });
      } catch {
        setIceFailed(true);
      } finally {
        slot.makingOffer = false;
      }
    },
    [ensurePc, myPeerId]
  );

  const handleSignal = useCallback(
    async (signal: VoiceSignal) => {
      if (signal.kind === 'hangup') {
        closePc(signal.from);
        return;
      }
      if (signal.to !== myPeerId) return;
      if (!voiceOnRef.current) return;

      if (signal.kind === 'offer') {
        const slot = ensurePc(signal.from);
        try {
          await slot.pc.setRemoteDescription(signal.sdp);
          await flushIce(slot);
          const answer = await slot.pc.createAnswer();
          await slot.pc.setLocalDescription(answer);
          transportRef.current?.send({
            type: 'voice',
            signal: { kind: 'answer', from: myPeerId, to: signal.from, sdp: slot.pc.localDescription! },
          });
        } catch {
          setIceFailed(true);
        }
        return;
      }

      if (signal.kind === 'answer') {
        const slot = pcsRef.current.get(signal.from);
        if (!slot) return;
        try {
          if (slot.pc.signalingState === 'have-local-offer') {
            await slot.pc.setRemoteDescription(signal.sdp);
            await flushIce(slot);
          }
        } catch {
          setIceFailed(true);
        }
        return;
      }

      if (signal.kind === 'ice') {
        const slot = pcsRef.current.get(signal.from) ?? (voiceOnRef.current ? ensurePc(signal.from) : undefined);
        if (!slot || !signal.candidate) return;
        if (!slot.pc.remoteDescription) {
          slot.pendingIce.push(signal.candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(signal.candidate);
        } catch {
          /* */
        }
      }
    },
    [closePc, ensurePc, flushIce, myPeerId]
  );

  const presenceMeta = useCallback(
    (voice: boolean, muted: boolean): ChatPresenceMeta => ({
      peerId: myPeerId,
      name: nameRef.current,
      seat: seatRef.current,
      voice,
      micMuted: muted,
    }),
    [myPeerId]
  );

  useEffect(() => {
    try {
      setMicMuted(readMicMuted());
      setDeafened(readDeafened());
      setMutedPeerIds(readMutedPeers());
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    setMessages([]);
    setPeers([]);
    setConnected(false);
    setIceFailed(false);

    const transport = openChatTransport(code, myPeerId, {
      onStatus: setConnected,
      onPresence: (list) => {
        setPeers(
          list.map((p) => ({
            peerId: p.peerId,
            name: p.name,
            seat: p.seat,
            voice: p.voice,
            micMuted: p.micMuted,
            seenAt: Date.now(),
          }))
        );
      },
      onWire: (payload: ChatWire) => {
        if (payload.type === 'chat') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.msg.id)) return prev;
            const next = [...prev, payload.msg];
            return next.length > CHAT_HISTORY_CAP ? next.slice(-CHAT_HISTORY_CAP) : next;
          });
          return;
        }
        if (payload.type === 'voice') void handleSignal(payload.signal);
      },
    });
    transportRef.current = transport;
    transport.track(presenceMeta(false, true));

    return () => {
      transport.send({ type: 'voice', signal: { kind: 'hangup', from: myPeerId } });
      transport.close();
      transportRef.current = null;
      closeAllPcs();
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      voiceOnRef.current = false;
    };
    // handleSignal/presenceMeta تتجدّد؛ القناة مربوطة بالغرفة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate on room code only
  }, [code, myPeerId]);

  useEffect(() => {
    transportRef.current?.track(presenceMeta(voiceOnRef.current, micMuted));
  }, [myName, mySeat, micMuted, presenceMeta]);

  useEffect(() => {
    applyAllRemoteAudio();
  }, [deafened, mutedPeerIds, applyAllRemoteAudio]);

  // عندما يظهر ندّ صوتي جديد ونحن في الصوت، نبدأ العرض إن كنّا المبادر
  useEffect(() => {
    if (voiceStatus !== 'on') return;
    for (const p of peers) {
      if (p.voice && p.peerId !== myPeerId) void callPeer(p.peerId);
    }
  }, [peers, voiceStatus, callPeer, myPeerId]);

  const sendText = useCallback(
    (raw: string): boolean => {
      const text = sanitizeChatText(raw, CHAT_MAX_LEN);
      if (!text) return false;
      const msg: ChatMessage = {
        id: newMessageId(),
        peerId: myPeerId,
        name: nameRef.current,
        text,
        ts: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > CHAT_HISTORY_CAP ? next.slice(-CHAT_HISTORY_CAP) : next;
      });
      transportRef.current?.send({ type: 'chat', msg });
      return true;
    },
    [myPeerId]
  );

  const joinVoice = useCallback(async () => {
    if (voiceOnRef.current || joiningRef.current) return;
    if (!voiceSupported()) {
      setVoiceStatus('unsupported');
      return;
    }
    joiningRef.current = true;
    setVoiceStatus('requesting');
    try {
      await unlockAudioPlayback();
      const stream = await captureMic();
      const startMuted = readMicMuted();
      setStreamMuted(stream, startMuted);
      localStreamRef.current = stream;
      setMicMuted(startMuted);
      micMutedRef.current = startMuted;
      voiceOnRef.current = true;
      setVoiceStatus('on');
      transportRef.current?.track(presenceMeta(true, startMuted));
      for (const p of peersRef.current) {
        if (p.voice) void callPeer(p.peerId);
      }
    } catch (err) {
      const denied =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setVoiceStatus(denied ? 'denied' : 'error');
      voiceOnRef.current = false;
    } finally {
      joiningRef.current = false;
    }
  }, [callPeer, presenceMeta]);

  const leaveVoice = useCallback(() => {
    transportRef.current?.send({ type: 'voice', signal: { kind: 'hangup', from: myPeerId } });
    closeAllPcs();
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    voiceOnRef.current = false;
    setVoiceStatus('off');
    setIceFailed(false);
    transportRef.current?.track(presenceMeta(false, micMutedRef.current));
  }, [closeAllPcs, myPeerId, presenceMeta]);

  const toggleMic = useCallback(() => {
    if (!voiceOnRef.current) {
      // ضغط الميكروفون = طلب الإذن ثم الإرسال (اختيار صريح للكلام)
      void joinVoice().then(() => {
        if (!voiceOnRef.current) return;
        setMicMuted(false);
        writeMicMuted(false);
        micMutedRef.current = false;
        setStreamMuted(localStreamRef.current, false);
        transportRef.current?.track(presenceMeta(true, false));
      });
      return;
    }
    const next = !micMutedRef.current;
    setMicMuted(next);
    writeMicMuted(next);
    setStreamMuted(localStreamRef.current, next);
    transportRef.current?.track(presenceMeta(true, next));
  }, [joinVoice, presenceMeta]);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const next = !prev;
      writeDeafened(next);
      return next;
    });
  }, []);

  const toggleMutePeer = useCallback((peerId: string) => {
    setMutedPeerIds((prev) => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId);
      else next.add(peerId);
      writeMutedPeers(next);
      return next;
    });
  }, []);

  const isPeerMuted = useCallback((peerId: string) => mutedPeerIds.has(peerId), [mutedPeerIds]);

  const visibleMessages = useMemo(
    () => filterMutedText(messages, mutedPeerIds, myPeerId),
    [messages, mutedPeerIds, myPeerId]
  );

  return {
    myPeerId,
    connected,
    peers,
    messages,
    visibleMessages,
    sendText,
    maxLen: CHAT_MAX_LEN,
    voiceStatus,
    voiceEnabled: voiceStatus === 'on',
    iceFailed,
    joinVoice,
    leaveVoice,
    micMuted,
    toggleMic,
    deafened,
    toggleDeafen,
    mutedPeerIds,
    toggleMutePeer,
    isPeerMuted,
  };
}
