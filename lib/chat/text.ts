/** حد طول رسالة الدردشة — قصير حتى يبقى البثّ خفيفاً على قناة الغرفة */
export const CHAT_MAX_LEN = 200;
export const CHAT_HISTORY_CAP = 80;

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * يقطع الرسالة وينظّفها قبل البثّ: بلا HTML، بلا محارف تحكّم، وبحد أقصى.
 * القيمة الفارغة بعد التنظيف تُرفض (null).
 */
export function sanitizeChatText(raw: string, max = CHAT_MAX_LEN): string | null {
  const text = raw.replace(CTRL, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

export function isOwnMessage<T extends { peerId: string }>(msg: T, myPeerId: string): boolean {
  return msg.peerId === myPeerId;
}

export function filterMutedText<T extends { peerId: string }>(
  messages: T[],
  mutedPeerIds: ReadonlySet<string>,
  myPeerId: string
): T[] {
  if (mutedPeerIds.size === 0) return messages;
  return messages.filter((m) => m.peerId === myPeerId || !mutedPeerIds.has(m.peerId));
}
