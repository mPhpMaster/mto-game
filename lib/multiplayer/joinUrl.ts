import { pathFromDeepLink, toAppUrl } from '@/lib/deep-link';
import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from './code';

export function buildRoomShareUrl(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (base) return `${base.replace(/\/$/, '')}/vs/${code}`;
  return toAppUrl(`/vs/${code}`);
}

export function buildRoomJoinPath(
  code: string,
  params?: { name?: string; host?: boolean; secs?: number; players?: number }
): string {
  const sp = new URLSearchParams();
  if (params?.name) sp.set('name', params.name);
  if (params?.host) sp.set('host', '1');
  if (params?.secs != null) sp.set('secs', String(params.secs));
  if (params?.players === 3) sp.set('players', '3');
  const q = sp.toString();
  return `/vs/${code}${q ? `?${q}` : ''}`;
}

/**
 * Parse a scanned QR / pasted invite into a room code (and optional name).
 * Accepts bare codes, /vs/CODE paths, and full https URLs.
 */
export function parseRoomJoinUrl(raw: string): { code: string; name?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const bare = normalizeRoomCode(trimmed);
  if (isValidRoomCode(bare) && trimmed.replace(/\s/g, '').length <= ROOM_CODE_LENGTH) {
    return { code: bare };
  }

  try {
    let pathname: string;
    let search = '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const deep = pathFromDeepLink(trimmed);
      if (deep) {
        const u = new URL(trimmed);
        pathname = u.pathname;
        search = u.search;
      } else {
        const url = new URL(trimmed);
        pathname = url.pathname;
        search = url.search;
      }
    } else {
      const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      pathname = path.split('?')[0].split('#')[0];
      const q = path.indexOf('?');
      search = q >= 0 ? path.slice(q) : '';
    }

    const match = pathname.match(/\/vs\/([A-Za-z0-9]+)/i);
    if (!match) return null;
    const code = normalizeRoomCode(match[1]);
    if (!isValidRoomCode(code)) return null;

    const name = new URLSearchParams(search).get('name')?.trim();
    return { code, name: name || undefined };
  } catch {
    return null;
  }
}
