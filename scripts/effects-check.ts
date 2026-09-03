/**
 * يتحقّق أن كل تأثير فخّ وسحر في الكتالوج **يفعل شيئاً فعلاً**.
 *
 * المحرّك يبتلع التأثير غير المعرَّف بصمت: `triggerTraps` فرعه الأخير
 * `fired = false` فيبقى الفخّ على الساحة إلى الأبد، و`applySpell` بلا فرع
 * أخير أصلاً فيستهلك السحرُ الطاقةَ والبطاقةَ ولا يحدث شيء. كلاهما عطب
 * لا يظهر في أي فحص آخر ولا يرمي استثناءً، فهذا السكربت هو شبكته.
 *
 * لكل تأثير: نبني حالة تُشبع شروطه، ننفّذ الحدث، ثم نؤكّد أنه سجّل سطره
 * الخاص وأن مفتاح السطر معرَّف في قاموس الرسائل باللغتين.
 *   npm run check:effects
 */
import { CATALOG, def } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import { LOG_MESSAGES } from '../lib/i18n/messages';
import { LOCALES } from '../lib/i18n/locale';
import type { CardDef, GameState, Seat, SpellEffect } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail: string) => console.log(`  ✓ ${name.padEnd(16)} ${detail}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name.padEnd(16)} ${detail}`);
};

/** مفتاح السجل الذي يجب أن يصدر عن كل تأثير سحر */
const SPELL_LOG_KEY: Record<SpellEffect, string> = {
  heal: 'healed',
  boost: 'boosted',
  storm: 'storm',
  surge: 'gained_energy',
  search: 'search_revealed',
  swap: 'bounced',
  amplify: 'amplify',
  revive: 'revived',
  purge: 'purged',
  strike: 'strike',
  bolt: 'bolt',
  drain_life: 'drain_life',
  shield_wall: 'shield_wall',
  rally: 'rally',
  recall: 'recalled',
  foresight: 'foresight',
  mana_well: 'mana_well',
  cleanse: 'cleanse',
  overload: 'overload',
  mirror_image: 'mirror_image',
  banish: 'banished',
  chain_lightning: 'chain_lightning',
  titan_call: 'titan_call',
  graft: 'graft',
  barricade: 'barricade',
  reflect: 'reflect',
  second_wind: 'second_wind',
};

function fresh(): GameState {
  return createGame({
    seed: 31337,
    playerName: 'A',
    opponentName: 'B',
    opponentIsAI: false,
    difficulty: 'hard',
    firstPlayer: 0,
  });
}

/** ينقل نسخة من السطح إلى المكان المطلوب فيبقى الجرد سليماً */
function take(s: GameState, defId: string) {
  const i = s.deck.findIndex((c) => c.defId === defId);
  if (i < 0) throw new Error(`لا توجد نسخة من «${defId}»`);
  return s.deck.splice(i, 1)[0];
}

function putMonster(s: GameState, side: Seat, defId: string, opts: { hurt?: boolean } = {}) {
  const inst = take(s, defId);
  const d = def(inst.defId);
  s.players[side].field.push({
    uid: inst.uid,
    defId: d.id,
    atk: d.atk!,
    hp: opts.hurt ? Math.max(1, d.hp! - 3) : d.hp!,
    maxHp: d.hp!,
    exhausted: false,
    sick: false,
  });
  return inst.uid;
}

/**
 * لوحة «غنيّة» تُشبع شروط كل تأثير: صاحب الفخ مجروح وله وحش مجروح،
 * والخصم له وحوش وطاقة وكروت في اليد وقطعة وحش أعظم.
 */
function richBoard(s: GameState) {
  const owner = s.players[0];
  const foe = s.players[1];
  owner.hp = 12;
  owner.energy = 10;
  owner.energyCap = 10;
  foe.hp = 25;
  foe.energy = 8;
  foe.energyCap = 10;
  putMonster(s, 0, 'mon_water_muwaija_1', { hurt: true });
  putMonster(s, 1, 'mon_fire_lahibo_1');
  putMonster(s, 1, 'mon_grass_waraqi_1');
  if (!foe.fragments.length) foe.fragments.push('heart');
  while (foe.hand.length < 4) foe.hand.push(take(s, 'mon_dark_thilli_1'));
}

function newTrapLogs(before: GameState, after: GameState) {
  return after.log
    .slice(Math.max(0, after.log.length - (after.logSeq - before.logSeq)))
    .filter((e) => e.kind === 'trap');
}

console.log('تأثيرات الفخاخ:\n');

for (const card of CATALOG.filter((c) => c.kind === 'trap')) {
  const effect = card.trap!;
  const expectedKey = `trap_${effect}`;
  let s = fresh();
  richBoard(s);
  // الفخّ مُجهَّز لدى الخانة 0، والخانة 1 هي التي تتصرّف فيُطلقه
  s.players[0].traps.push(take(s, card.id));
  const before = s;

  try {
    if (card.timing === 'opponent_turn_start') {
      s.current = 0;
      s.phase = 'main';
      s = applyGameAction(s, { type: 'END_TURN' });
    } else if (card.timing === 'opponent_summon') {
      s.current = 1;
      s.phase = 'main';
      const inst = take(s, 'mon_fire_jamra_1');
      s.players[1].hand.push(inst);
      const d = def(inst.defId);
      s.flow = { element: 'fire', number: d.number, defId: d.id };
      s = applyGameAction(s, { type: 'PLAY', uid: inst.uid });
    } else {
      s.current = 1;
      s.phase = 'main';
      const attacker = s.players[1].field[0];
      s = applyGameAction(s, {
        type: 'ATTACK',
        attackers: [attacker.uid],
        target: s.players[0].field[0]?.uid ?? 'face',
        targetSeat: 0,
      });
    }
  } catch (e) {
    bad(effect, `رمى: ${(e as Error).message}`);
    continue;
  }

  const stillSet = s.players[0].traps.some((t) => def(t.defId).trap === effect);
  const fired = newTrapLogs(before, s).map((e) => e.key);

  if (stillSet) {
    bad(effect, 'لم ينطلق: الفخّ ما زال على الساحة (فرع default الصامت)');
  } else if (!fired.includes(expectedKey)) {
    bad(effect, `انطلق بلا سطره الخاص «${expectedKey}» — المسجَّل: ${fired.join('، ') || 'لا شيء'}`);
  } else if (!LOG_MESSAGES[expectedKey]) {
    bad(effect, `المفتاح «${expectedKey}» غير معرَّف في قاموس الرسائل`);
  } else if (LOCALES.some((l) => !LOG_MESSAGES[expectedKey][l]?.trim())) {
    bad(effect, `المفتاح «${expectedKey}» ناقص في إحدى اللغتين`);
  } else {
    ok(effect, `انطلق وسجّل «${expectedKey}»`);
  }
}

console.log('\nتأثيرات السحر:\n');

for (const card of CATALOG.filter((c) => c.kind === 'spell')) {
  const effect = card.spell!;
  const expectedKey = SPELL_LOG_KEY[effect];
  let s = fresh();
  richBoard(s);
  s.current = 0;
  s.phase = 'main';

  // شروط الأهداف: كلٌّ حسب حاجته
  s.discard.push(take(s, 'mon_fire_nariks_1'));
  s.players[1].traps.push(take(s, 'trap_ambush'));
  if (effect === 'mirror_image') {
    // النسخة تُسحب من السطح، فلا بدّ من بقاء نسخة ثانية من وحش الساحة
    s.players[0].field = [];
    putMonster(s, 0, 'mon_psychic_holmi_1', { hurt: true });
  }
  if (effect === 'second_wind') for (const m of s.players[0].field) m.exhausted = true;

  const inst = take(s, card.id);
  s.players[0].hand.push(inst);
  s.players[0].energy = 10;
  s.flow = { element: card.element as CardDef['element'] as never, number: card.number, defId: card.id };

  const target = pickTarget(s, card);
  const before = s;
  try {
    s = applyGameAction(s, { type: 'PLAY', uid: inst.uid, targetUid: target });
  } catch (e) {
    bad(effect, `رمى: ${(e as Error).message}`);
    continue;
  }

  const keys = s.log.slice(Math.max(0, s.log.length - (s.logSeq - before.logSeq))).map((e) => e.key);

  if (s.players[0].hand.some((c) => c.uid === inst.uid)) {
    bad(effect, 'لم يُلعب أصلاً — التوزيع لم يُشبع شرط اللعب');
  } else if (!keys.includes(expectedKey)) {
    bad(effect, `لم يُحدث أثراً: لا سطر «${expectedKey}» — المسجَّل: ${keys.join('، ')}`);
  } else if (!LOG_MESSAGES[expectedKey]) {
    bad(effect, `المفتاح «${expectedKey}» غير معرَّف في قاموس الرسائل`);
  } else if (LOCALES.some((l) => !LOG_MESSAGES[expectedKey][l]?.trim())) {
    bad(effect, `المفتاح «${expectedKey}» ناقص في إحدى اللغتين`);
  } else {
    ok(effect, `أحدث أثره وسجّل «${expectedKey}»`);
  }
}

function pickTarget(s: GameState, card: CardDef): string | undefined {
  switch (card.needsTarget) {
    case 'own_monster':
      return s.players[0].field[0]?.uid;
    case 'enemy_monster':
      return s.players[1].field[0]?.uid;
    case 'enemy_trap':
      return s.players[1].traps[0]?.uid;
    case 'discard_monster':
      return s.discard.find((c) => def(c.defId).kind === 'monster')?.uid;
    default:
      return undefined;
  }
}

console.log(
  failures === 0
    ? `\n✓ كل تأثيرات الفخاخ والسحر (${CATALOG.filter((c) => c.kind === 'trap' || c.kind === 'spell').length} تصميماً) تعمل وتُسجّل نفسها.`
    : `\n✗ ${failures} تأثيراً لا يعمل.`
);
process.exit(failures > 0 ? 1 : 0);
