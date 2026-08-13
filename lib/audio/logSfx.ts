import type { LogEntry } from '@/lib/game/types';
import type { SfxName } from './sfx';

/**
 * ربط أحداث السجل بالمؤثّرات الصوتية.
 * الاعتماد على السجل يعني أن كل حدث في اللعبة يصدر صوته تلقائياً —
 * بما فيه ما يقع في دور الخصم — دون نثر نداءات صوت في المحرّك.
 */
const BY_KEY: Record<string, SfxName> = {
  drew: 'draw',
  summoned: 'summon',
  played: 'play',
  played_wild: 'play',
  trap_set: 'play',
  fragment_gained: 'fragment',
  monster_fell: 'death',
  attack_face: 'attack',
  attack_monster: 'attack',
  combo_face: 'combo',
  combo_monster: 'combo',
  attack_blocked: 'hit',
  attack_failed: 'error',
  mirror_reflect: 'hit',
  pierce_extra: 'hit',
  venom_bite: 'hit',
  drain_heal: 'fragment',
  titan_summon: 'titan',
  healed: 'fragment',
  boosted: 'play',
  storm: 'attack',
  gained_energy: 'play',
  search_revealed: 'draw',
  bounced: 'play',
  amplify: 'play',
  revived: 'summon',
  purged: 'hit',
  fatigue: 'hit',
  ability_rush: 'summon',
  ability_scout: 'draw',
  ability_charge: 'fragment',
  ability_guard: 'hit',
};

export function sfxForLog(entry: LogEntry, mySeat: 0 | 1, winner: 0 | 1 | null): SfxName | null {
  if (entry.key === 'win') return winner === mySeat ? 'win' : 'lose';
  // بداية دورك وحدها تستحقّ تنبيهاً؛ دور الخصم لا
  if (entry.key === 'turn_start') return entry.side === mySeat ? 'turn' : null;
  if (entry.kind === 'trap' && entry.key.startsWith('trap_')) return 'trap';
  return BY_KEY[entry.key] ?? null;
}

/** أصوات كثيرة في لحظة واحدة تتحوّل إلى ضجيج، فيُكتفى بأهمّها */
const PRIORITY: SfxName[] = [
  'titan',
  'win',
  'lose',
  'combo',
  'death',
  'trap',
  'attack',
  'summon',
  'fragment',
  'hit',
  'draw',
  'play',
  'turn',
  'error',
];

export function pickSfx(entries: LogEntry[], mySeat: 0 | 1, winner: 0 | 1 | null): SfxName[] {
  const found = new Set<SfxName>();
  for (const e of entries) {
    const s = sfxForLog(e, mySeat, winner);
    if (s) found.add(s);
  }
  // على الأكثر مؤثّران: الأهمّ ثم الذي يليه
  return PRIORITY.filter((p) => found.has(p)).slice(0, 2);
}
