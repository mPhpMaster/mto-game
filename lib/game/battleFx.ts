import type { LogEntry } from './types';

/**
 * أحداث بصرية تُشتقّ من سجل المباراة — نفس فكرة الأصوات:
 * كل هجوم أو لعب يظهر حركته حتى في دور الخصم، دون نثر منطق في المحرّك.
 */
export type BattleFx =
  | {
      type: 'strike';
      strikers: string[];
      target: string | 'face';
      damage: number;
      blocked: boolean;
      entry: LogEntry;
    }
  | {
      type: 'play';
      defId: string;
      dest: 'field' | 'flow' | 'trap';
      entry: LogEntry;
    };

const STRIKE_KEYS = new Set([
  'attack_monster',
  'combo_monster',
  'attack_face',
  'combo_face',
  'attack_blocked',
]);

function uids(value: string | number | undefined): string[] {
  if (typeof value !== 'string' || !value) return [];
  return value.split(',').filter(Boolean);
}

export function pickBattleFx(entries: LogEntry[]): BattleFx | null {
  const strike = [...entries].reverse().find((e) => STRIKE_KEYS.has(e.key));
  if (strike) {
    const damage = Number(strike.params?.damage ?? 0);
    return {
      type: 'strike',
      strikers: uids(strike.params?.strikers),
      target: typeof strike.params?.target === 'string' ? strike.params.target : 'face',
      damage,
      blocked: strike.key === 'attack_blocked',
      entry: strike,
    };
  }

  const play = [...entries].reverse().find(
    (e) => e.key === 'summoned' || e.key === 'played' || e.key === 'played_wild' || e.key === 'trap_set'
  );
  if (!play) return null;
  const defId = typeof play.params?.card === 'string' ? play.params.card : '';
  return {
    type: 'play',
    defId,
    dest: play.key === 'summoned' ? 'field' : play.key === 'trap_set' ? 'trap' : 'flow',
    entry: play,
  };
}
