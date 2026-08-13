import { def } from './cards';
import { DIFFICULTIES } from './difficulty';
import {
  canPlayCard,
  canSummonTitan,
  evaluateAttack,
  hasAnyPlayable,
  opponentOf,
} from './engine';
import { nextRandom } from './rng';
import type { CardDef, GameAction, GameState, PlayableElement } from './types';

const level = (s: GameState) => DIFFICULTIES[s.difficulty];

/**
 * عشوائية مشتقّة من الحالة دون تعديلها — تبقى `aiChooseAction` دالة خالصة،
 * وتتغيّر القيمة مع كل تغيّر في الحالة فلا تعلق على نفس القرار.
 */
function aiRandom(s: GameState, salt: number): number {
  const p = s.players[s.current];
  const mix =
    (s.rng ^
      (s.turn * 2654435761) ^
      (salt * 40503) ^
      (p.hand.length * 97) ^
      (p.energy * 1031) ^
      (p.field.length * 131)) |
    0;
  return nextRandom(mix)[0];
}

/** يختار الأفضل عادةً، وأحياناً حركة أضعف بحسب مستوى الصعوبة */
function pickMaybeMistake<T>(s: GameState, sorted: T[], salt: number): T {
  const chance = level(s).mistakeChance;
  if (sorted.length < 2 || chance <= 0) return sorted[0];
  if (aiRandom(s, salt) >= chance) return sorted[0];
  const idx = 1 + Math.floor(aiRandom(s, salt + 977) * (sorted.length - 1));
  return sorted[Math.min(idx, sorted.length - 1)];
}

/** العنصر الأكثر تكراراً في يد اللاعب — يُستخدم لاختيار عنصر الكارت البري */
function bestElement(s: GameState, side: 0 | 1): PlayableElement {
  const counts: Record<string, number> = {};
  for (const c of s.players[side].hand) {
    const d = def(c.defId);
    if (d.element !== 'wild') counts[d.element] = (counts[d.element] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as PlayableElement) ?? 'fire';
}

function isTurnEnding(d: CardDef): boolean {
  return (
    d.kind === 'action' &&
    (d.action === 'skip' || d.action === 'reverse' || d.action === 'draw2' || d.action === 'wild4')
  );
}

function scoreCard(s: GameState, side: 0 | 1, d: CardDef): number {
  const me = s.players[side];
  const foe = s.players[opponentOf(side)];

  const cfg = level(s);

  switch (d.kind) {
    case 'fragment':
      return 1000 * cfg.fragmentWeight;
    case 'monster': {
      let v = 60 + d.atk! * 3 + d.hp! * 2 - d.cost * 3;
      if (d.ability === 'rush') v += 12;
      if (d.ability === 'charge') v += 8;
      if (me.field.length === 0) v += 25; // نحتاج مدافعاً
      return v;
    }
    case 'trap':
      return me.traps.length < 2 ? 55 : 20;
    case 'spell':
      switch (d.spell) {
        case 'heal':
          return me.hp <= 16 ? 210 : 15;
        case 'storm':
          return foe.field.length >= 2 ? 190 : foe.field.length === 1 ? 70 : 5;
        case 'surge':
          return 95;
        case 'boost':
          return me.field.length ? 80 : 0;
        case 'swap':
          return foe.field.length ? 85 : 0;
        case 'revive':
          return 105;
        case 'purge':
          return foe.traps.length ? 90 : 0;
        case 'amplify':
          return me.field.filter((m) => !m.sick && !m.exhausted).length >= 2 ? 100 : 10;
        case 'search':
          return 60;
        default:
          return 30;
      }
    case 'action':
      // كروت التعطيل أكثر ما يُحبط اللاعب، فيُخفَّض وزنها في المستويات السهلة
      switch (d.action) {
        case 'wild4':
          return 150 * cfg.denialWeight;
        case 'draw2':
          return 140 * cfg.denialWeight;
        case 'skip':
          return 130 * cfg.denialWeight;
        case 'reverse':
          return 120 * cfg.denialWeight;
        case 'wild':
          return hasAnyPlayable(s, side) ? 10 : 40;
        default:
          return 30;
      }
  }
  return 0;
}

/** أفضل مجموعة مهاجمين: يفضّل قتل وحش الخصم، ثم الضرب المباشر، ثم الدمج */
function chooseAttack(s: GameState, side: 0 | 1): GameAction | null {
  const me = s.players[side];
  const foeIdx = opponentOf(side);
  const foe = s.players[foeIdx];
  const ready = me.field.filter((m) => !m.sick && !m.exhausted);
  if (ready.length === 0 || me.attackLocked) return null;

  type Option = { action: GameAction; value: number };
  const options: Option[] = [];

  // مجموعات مرشحة: كل وحش منفرداً + مجموعات الدمج
  const groups: string[][] = ready.map((m) => [m.uid]);
  if (level(s).combo && !me.comboUsed && ready.length >= 2) {
    // كل الجاهزين معاً
    groups.push(ready.map((m) => m.uid));
    // أزواج
    for (let i = 0; i < ready.length; i++) {
      for (let j = i + 1; j < ready.length; j++) {
        groups.push([ready[i].uid, ready[j].uid]);
      }
    }
  }

  for (const g of groups) {
    const evalRes = evaluateAttack(s, side, g);
    if (!evalRes.ok) continue;
    const dmg = evalRes.damage;

    if (foe.field.length === 0) {
      // ضرب مباشر
      const lethal = dmg >= foe.hp;
      options.push({ action: { type: 'ATTACK', attackers: g, target: 'face' }, value: dmg * 2 + (lethal ? 10000 : 0) - g.length });
    } else {
      for (const t of foe.field) {
        const td = def(t.defId);
        const effective = td.ability === 'guard' ? dmg - 1 : dmg;
        const kills = effective >= t.hp;
        const overkill = Math.max(0, effective - t.hp);
        let value = kills ? 120 + td.atk! * 4 - overkill * 2 : effective * 2;
        value -= g.length * 3; // لا تُهدر الوحوش دون داعٍ
        options.push({ action: { type: 'ATTACK', attackers: g, target: t.uid }, value });
      }
    }
  }

  if (options.length === 0) return null;
  options.sort((a, b) => b.value - a.value);
  // الضربة القاضية لا تُفوَّت مهما كان المستوى، وما عداها قد يُخطئ فيه
  if (options[0].value >= 10000) return options[0].action;
  return pickMaybeMistake(s, options, 31).action;
}

/** يعيد الحركة التالية للذكاء الاصطناعي، أو null إذا لم يبقَ شيء (ينهي الدور) */
export function aiChooseAction(s: GameState): GameAction {
  const side = s.current;
  const me = s.players[side];
  const foeIdx = opponentOf(side);
  const foe = s.players[foeIdx];

  // الرد على عقوبة السحب
  if (s.phase === 'respond') {
    const stackable = me.hand
      .filter((c) => canPlayCard(s, side, c.uid).ok)
      .sort((a, b) => def(b.defId).cost - def(a.defId).cost)[0];
    // في السهل يقبل الخصم العقوبة غالباً بدل ردّها مضاعفة إليك
    if (stackable && aiRandom(s, 11) < level(s).denialWeight) {
      const d = def(stackable.defId);
      return {
        type: 'PLAY',
        uid: stackable.uid,
        chosenElement: d.element === 'wild' ? bestElement(s, side) : undefined,
      };
    }
    return { type: 'ACCEPT_DRAW' };
  }

  if (s.reveal && s.reveal.side === side) {
    const best = s.reveal.cards
      .map((c) => ({ c, v: scoreCard(s, side, def(c.defId)) }))
      .sort((a, b) => b.v - a.v)[0];
    return { type: 'PICK_REVEAL', uid: best.c.uid };
  }

  // 1) حسم فوري بالوحش الأعظم
  if (canSummonTitan(s, side).ok) return { type: 'SUMMON_TITAN' };

  // 2) الكروت غير المنهية للدور (قطع، وحوش، سحر، فخاخ)
  const playable = me.hand
    .filter((c) => canPlayCard(s, side, c.uid).ok)
    .map((c) => ({ inst: c, d: def(c.defId) }));

  const nonEnding = playable
    .filter((x) => !isTurnEnding(x.d))
    .map((x) => ({ ...x, score: scoreCard(s, side, x.d) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (nonEnding.length) {
    const pick = pickMaybeMistake(s, nonEnding, 7);
    let targetUid: string | undefined;
    if (pick.d.needsTarget === 'own_monster') {
      targetUid = me.field.slice().sort((a, b) => b.atk - a.atk)[0]?.uid;
    } else if (pick.d.needsTarget === 'enemy_monster') {
      targetUid = foe.field.slice().sort((a, b) => b.atk - a.atk)[0]?.uid;
    } else if (pick.d.needsTarget === 'enemy_trap') {
      targetUid = foe.traps[0]?.uid;
    } else if (pick.d.needsTarget === 'discard_monster') {
      targetUid = s.discard
        .filter((c) => def(c.defId).kind === 'monster')
        .sort((a, b) => (def(b.defId).atk ?? 0) - (def(a.defId).atk ?? 0))[0]?.uid;
    }
    return {
      type: 'PLAY',
      uid: pick.inst.uid,
      chosenElement: pick.d.element === 'wild' ? bestElement(s, side) : undefined,
      targetUid,
    };
  }

  // 3) الهجوم
  const atk = chooseAttack(s, side);
  if (atk) return atk;

  // 4) كروت تُنهي الدور (تخطي / سحب / انعكاس) كحركة أخيرة
  const ending = playable
    .filter((x) => isTurnEnding(x.d))
    .map((x) => ({ ...x, score: scoreCard(s, side, x.d) }))
    .sort((a, b) => b.score - a.score);
  // في المستويات السهلة يتجاهل الخصم كروت التعطيل غالباً بدل تكديسها كل دور
  if (ending.length && aiRandom(s, 53) < level(s).denialWeight) {
    const pick = ending[0];
    return {
      type: 'PLAY',
      uid: pick.inst.uid,
      chosenElement: pick.d.element === 'wild' ? bestElement(s, side) : undefined,
    };
  }

  // 5) سحب إنقاذ
  if (!me.extraDrawUsed && !hasAnyPlayable(s, side)) return { type: 'DRAW' };

  return { type: 'END_TURN' };
}
