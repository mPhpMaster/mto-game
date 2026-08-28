export interface ChatMessage {
  id: string;
  peerId: string;
  name: string;
  text: string;
  ts: number;
}

export interface ChatPeer {
  peerId: string;
  name: string;
  seat?: number;
  voice: boolean;
  micMuted: boolean;
  /** آخر ظهور (لقنوات التبويب المحلي) */
  seenAt: number;
}

export type VoiceSignal =
  | { kind: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit | null }
  | { kind: 'hangup'; from: string };

export type ChatWire =
  | { type: 'chat'; msg: ChatMessage }
  | { type: 'voice'; signal: VoiceSignal }
  | { type: 'hello'; peer: Omit<ChatPeer, 'seenAt'> }
  | { type: 'bye'; peerId: string };

export type VoiceStatus = 'off' | 'requesting' | 'on' | 'denied' | 'error' | 'unsupported';

export interface ChatPresenceMeta {
  peerId: string;
  name: string;
  seat?: number;
  voice: boolean;
  micMuted: boolean;
}
