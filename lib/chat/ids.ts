const PEER_KEY = 'mto-chat-peer';

/** معرّف ثابت لهذه الجلسة (تبويب المتصفّح) حتى تبقى كتم الأطراف متسقة أثناء المباراة */
export function getOrCreatePeerId(): string {
  try {
    const existing = sessionStorage.getItem(PEER_KEY);
    if (existing && existing.length >= 8 && existing.length <= 40) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(PEER_KEY, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
