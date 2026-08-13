// دوال خالصة لرمز الغرفة — بلا 'use client' حتى تُستعمل على الخادم أيضاً

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 5;

/** رمز غرفة قصير بلا حروف يسهل الخلط بينها (0/O، 1/I) */
export function makeRoomCode(length = ROOM_CODE_LENGTH): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH;
}
