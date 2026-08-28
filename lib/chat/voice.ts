/**
 * شبكة WebRTC صوتية بين لاعبي الغرفة (2–3 أطراف).
 *
 * الإشارة تمرّ على قناة الدردشة (Supabase Broadcast + BroadcastChannel).
 * الاتصال المباشر يستخدم STUN العام فقط — بلا خادم TURN مدفوع.
 * الشبكات الصارمة (NAT متماثل / بعض الجوالات) قد تفشل في الصوت؛ النص يبقى يعمل.
 */
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

export function voiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof RTCPeerConnection === 'function' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** Some mobile WebViews suspend audio until a user gesture unlocks playback. */
export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined') return;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    await ctx.close();
  } catch {
    /* optional unlock — remote <audio> play() is retried separately */
  }
}

export async function playRemoteAudio(el: HTMLAudioElement): Promise<void> {
  try {
    await el.play();
  } catch {
    /* may succeed after the next user gesture (join voice / unmute) */
  }
}

export async function captureMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

export function setStreamMuted(stream: MediaStream | null, muted: boolean): void {
  if (!stream) return;
  for (const track of stream.getAudioTracks()) track.enabled = !muted;
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/** الطرف ذو المعرّف الأصغر يبدأ العرض حتى لا يتصادم عرضان */
export function isOfferInitiator(myPeerId: string, theirPeerId: string): boolean {
  return myPeerId < theirPeerId;
}
