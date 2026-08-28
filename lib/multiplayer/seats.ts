import type { Seat } from '@/lib/game/types';

export const HOST_SEAT = 0 as const;
export const GUEST_SEAT = 1 as const;

export type PlayerCount = 2 | 3;

export interface SeatOccupant {
  seat: Seat;
  clientId: string | null;
  name: string | null;
  present: boolean;
  isAI: boolean;
}

export function normalizePlayerCount(n: number | undefined | null): PlayerCount {
  return n === 3 ? 3 : 2;
}

export function makeLobby(
  playerCount: number,
  host: { clientId: string; name: string }
): SeatOccupant[] {
  const n = normalizePlayerCount(playerCount);
  return Array.from({ length: n }, (_, seat) =>
    seat === HOST_SEAT
      ? { seat, clientId: host.clientId, name: host.name, present: true, isAI: false }
      : { seat, clientId: null, name: null, present: false, isAI: false }
  );
}

function aiNameFor(seat: Seat): string {
  return seat <= 1 ? '@ai' : '@ai2';
}

/**
 * يمنح الضيف أول خانة بشرية فارغة، أو يعيد خانة نفس المعرّف إن عاد للغرفة.
 */
export function claimSeat(
  lobby: SeatOccupant[],
  clientId: string,
  name: string
): { lobby: SeatOccupant[]; seat: Seat | null; reason?: 'full' } {
  if (!clientId) return { lobby, seat: null, reason: 'full' };

  const existing = lobby.find((s) => s.clientId === clientId && !s.isAI);
  if (existing) {
    return {
      lobby: lobby.map((s) =>
        s.seat === existing.seat
          ? { ...s, name: name || s.name, present: true, isAI: false }
          : s
      ),
      seat: existing.seat,
    };
  }

  const empty = lobby.find((s) => s.seat !== HOST_SEAT && !s.clientId && !s.isAI);
  if (!empty) return { lobby, seat: null, reason: 'full' };

  return {
    lobby: lobby.map((s) =>
      s.seat === empty.seat
        ? { ...s, clientId, name: name || s.name, present: true, isAI: false }
        : s
    ),
    seat: empty.seat,
  };
}

export function setPresent(
  lobby: SeatOccupant[],
  clientId: string,
  present: boolean
): SeatOccupant[] {
  return lobby.map((s) => (s.clientId === clientId && !s.isAI ? { ...s, present } : s));
}

/** يملأ الخانات البشرية الفارغة بخصم آلي — الخانات المشغولة لا تُمسّ */
export function fillEmptyWithAi(lobby: SeatOccupant[]): SeatOccupant[] {
  return lobby.map((s) => {
    if (s.seat === HOST_SEAT || s.clientId || s.isAI) return s;
    return {
      ...s,
      clientId: null,
      name: aiNameFor(s.seat),
      present: true,
      isAI: true,
    };
  });
}

export function connectedHumans(lobby: SeatOccupant[]): number {
  return lobby.filter((s) => !s.isAI && s.present && s.clientId).length;
}

export function emptyHumanSeats(lobby: SeatOccupant[]): number {
  return lobby.filter((s) => !s.isAI && !s.clientId).length;
}

export function allHumansPresent(lobby: SeatOccupant[]): boolean {
  const humans = lobby.filter((s) => !s.isAI && s.clientId);
  return humans.length > 0 && humans.every((s) => s.present);
}

export function canStart(lobby: SeatOccupant[], fillAi: boolean): boolean {
  if (fillAi) return connectedHumans(lobby) >= 1 && emptyHumanSeats(lobby) === 0;
  return emptyHumanSeats(lobby) === 0 && allHumansPresent(lobby);
}

export function toRoster(lobby: SeatOccupant[]): { name: string; isAI: boolean }[] {
  return lobby.map((s) => ({
    name: s.name || (s.isAI ? aiNameFor(s.seat) : `@p${s.seat}`),
    isAI: s.isAI,
  }));
}

export function occupantByClient(lobby: SeatOccupant[], clientId: string): SeatOccupant | undefined {
  return lobby.find((s) => s.clientId === clientId && !s.isAI);
}

export function publicSeats(
  lobby: SeatOccupant[],
  mySeat: Seat | null
): Array<{
  seat: Seat;
  name: string | null;
  present: boolean;
  isAI: boolean;
  isMe: boolean;
}> {
  return lobby.map((s) => ({
    seat: s.seat,
    name: s.name,
    present: s.present,
    isAI: s.isAI,
    isMe: mySeat !== null && s.seat === mySeat,
  }));
}
