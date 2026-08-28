const MIC_KEY = 'mto-chat-mic-muted';
const DEAFEN_KEY = 'mto-chat-deafen';
const PEERS_KEY = 'mto-chat-muted-peers';

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = sessionStorage.getItem(key);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* التخزين قد يكون معطّلاً */
  }
  return fallback;
}

function writeFlag(key: string, value: boolean): void {
  try {
    sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* يبقى للتذكرة في الذاكرة فقط */
  }
}

/** الميكروفون يبدأ مكتوماً حتى يختار اللاعب الإرسال */
export function readMicMuted(): boolean {
  return readFlag(MIC_KEY, true);
}

export function writeMicMuted(muted: boolean): void {
  writeFlag(MIC_KEY, muted);
}

export function readDeafened(): boolean {
  return readFlag(DEAFEN_KEY, false);
}

export function writeDeafened(on: boolean): void {
  writeFlag(DEAFEN_KEY, on);
}

export function readMutedPeers(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PEERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0));
  } catch {
    return new Set();
  }
}

export function writeMutedPeers(ids: ReadonlySet<string>): void {
  try {
    sessionStorage.setItem(PEERS_KEY, JSON.stringify([...ids]));
  } catch {
    /* */
  }
}
