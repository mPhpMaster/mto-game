/**
 * يتحقّق أن كل كلمة مفتاحية تعمل فعلاً، كلٌّ في لحظتها:
 * الاستدعاء، بداية الدور، الهجوم، والدفاع.
 *
 * ثمانيةَ عشرَ كلمة، ثلاثٌ لكل عنصر. كل اختبار يبني مباراة بتوزيع مُعدّ،
 * ينفّذ الحركة، ويقارن الأرقام قبل وبعد — فلا تمرّ كلمةٌ صامتة: البطاقة
 * تصفها والواجهة تعرضها، ولو لم يقع أثرها لما ظهر ذلك في شيء.
 *   npm run check:abilities
 */
import { def } from '../lib/game/cards';
import {
  applyGameAction,
  canPlayCard,
  createGame,
  evaluateAttack,
  KEYWORD_VALUES,
  RULES,
} from '../lib/game/engine';
import type { GameScript } from '../lib/game/engine';
import type { GameState, Seat } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail: string) => console.log(`  ✓ ${name} — ${detail}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};
const eq = (name: string, got: unknown, want: unknown, detail = '') =>
  got === want
    ? ok(name, detail || `${String(got)}`)
    : bad(name, `${detail ? detail + ' — ' : ''}توقّعت ${String(want)} فجاء ${String(got)}`);

function game(script: GameScript): GameState {
  return createGame({
    seed: 777,
    playerName: 'A',
    opponentName: 'B',
    opponentIsAI: false,
    difficulty: 'hard',
    firstPlayer: 0,
    script,
  });
}

const uidInHand = (s: GameState, defId: string) =>
  s.players[0].hand.find((c) => c.defId === defId)!.uid;
const onField = (s: GameState, side: Seat, species: string) =>
  s.players[side].field.find((m) => def(m.defId).species === species);
const play = (s: GameState, defId: string) =>
  applyGameAction(s, { type: 'PLAY', uid: uidInHand(s, defId) });
/** دورةٌ كاملة: ينتهي دوري فيبدأ دوره، ثم ينتهي دوره فيعود إليّ */
const round = (s: GameState) =>
  applyGameAction(applyGameAction(s, { type: 'END_TURN' }), { type: 'END_TURN' });
const hit = (s: GameState, attacker: string, target: string | 'face') =>
  applyGameAction(s, { type: 'ATTACK', attackers: [attacker], target });

console.log('كلمات العناصر:\n');

// ═══════════ 🌪️ ريح ═══════════

// ---------- سرعة: يهاجم فور استدعائه ----------
{
  // عصبو (سرعة) مقابل حلمي (مراوغة، بلا سرعة)
  let s = game({
    flow: 'mon_psychic_taifa_1',
    hands: [['mon_psychic_nirfa_1', 'mon_psychic_holmi_1'], []],
    energyCap: [9, 9],
  });
  s = play(s, 'mon_psychic_nirfa_1');
  s = play(s, 'mon_psychic_holmi_1');
  const fast = onField(s, 0, 'nirfa')!;
  const plain = onField(s, 0, 'holmi')!;
  if (!fast.sick && plain.sick) ok('سرعة', 'السريع جاهز فوراً وغيره «جديد»');
  else bad('سرعة', `السريع sick=${fast.sick} وغيره sick=${plain.sick}`);
}

// ---------- مراوغة: تفادٍ بنحو الخُمس ----------
{
  let dodged = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const s = createGame({
      seed,
      firstPlayer: 0,
      script: { fields: [['mon_fire_nariks_1'], ['mon_psychic_holmi_1']] },
    });
    const after = hit(s, s.players[0].field[0].uid, s.players[1].field[0].uid);
    if (after.players[1].field[0]?.hp === 5) dodged++;
  }
  const rate = dodged / N;
  if (rate > 0.12 && rate < 0.3) ok('مراوغة', `${(rate * 100).toFixed(1)}% حول 20%`);
  else bad('مراوغة', `${(rate * 100).toFixed(1)}% بعيدة عن 20%`);
}

// ---------- انسحاب: يعود إلى اليد بعد ضربته ----------
{
  const s = game({ fields: [['mon_psychic_taifa_1'], []], hands: [[], []], energyCap: [9, 9] });
  const hand0 = s.players[0].hand.length;
  const after = hit(s, s.players[0].field[0].uid, 'face');
  eq('انسحاب: غادر الساحة', after.players[0].field.length, 0);
  eq('انسحاب: عاد إلى اليد', after.players[0].hand.length, hand0 + 1);
}

// ═══════════ ⚡ كهرباء ═══════════

// ---------- إمداد: +1 طاقة فوق السقف ----------
{
  const withIt = game({ fields: [['mon_electric_volti_1'], []], hands: [[], []], energyCap: [4, 4] });
  const without = game({ fields: [[], []], hands: [[], []], energyCap: [4, 4] });
  const a = withIt.players[0].energy;
  const b = without.players[0].energy;
  if (a === b + KEYWORD_VALUES.rechargeEnergy && a > withIt.players[0].energyCap)
    ok('إمداد', `الطاقة ${a} مقابل ${b} بلا إمداد (فوق السقف ${withIt.players[0].energyCap})`);
  else bad('إمداد', `الطاقة ${a} مقابل ${b}، السقف ${withIt.players[0].energyCap}`);
}

// ---------- شحنة زائدة: +1 ضرر عن كل طاقتين لم تُنفقا ----------
{
  const s = game({ fields: [['mon_electric_ra3doon_1'], []], hands: [[], []], energyCap: [9, 9] });
  s.players[0].energy = 6;
  const rich = evaluateAttack(s, 0, [s.players[0].field[0].uid]).damage;
  const poor = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, energy: 0 } : p)) } as GameState;
  const base = evaluateAttack(poor, 0, [poor.players[0].field[0].uid]).damage;
  eq('شحنة زائدة', rich - base, KEYWORD_VALUES.overchargeMax, `بطاقة 6 مقابل 0`);
}

// ---------- سلسلة: نصف الضرر إلى وحشٍ آخر ----------
{
  const s = game({
    fields: [['mon_electric_sharara_1'], ['mon_water_korali_1', 'mon_grass_ghabor_1']],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const second = s.players[1].field[1];
  const hpBefore = second.hp;
  const after = hit(s, s.players[0].field[0].uid, s.players[1].field[0].uid);
  const other = after.players[1].field.find((m) => m.uid === second.uid);
  // هجوم شرارة 3 ⇒ النصف مجبوراً لأسفل = 1
  eq('سلسلة', hpBefore - (other?.hp ?? 0), 1, 'الوحش الثاني تلقّى نصف الضرر');
}

// ═══════════ 🔥 نار ═══════════

// ---------- حرق: أثرٌ يبقى وينهش كل دور ----------
{
  const s = game({
    fields: [['mon_fire_jamra_1'], ['mon_water_korali_1']],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const burned = hit(s, s.players[0].field[0].uid, s.players[1].field[0].uid);
  eq('حرق: وسم الهدف', burned.players[1].field[0]?.burn, 1);
  const hpAfterHit = burned.players[1].field[0].hp;
  const next = applyGameAction(burned, { type: 'END_TURN' });
  eq('حرق: ينهش في دور صاحبه', hpAfterHit - next.players[1].field[0].hp, KEYWORD_VALUES.burnTick);
}

// ---------- هياج: +2 هجوم حين تهبط حياتك إلى النصف ----------
{
  const s = game({ fields: [['mon_fire_lahibo_1'], []], hands: [[], []], energyCap: [9, 9] });
  const full = evaluateAttack(s, 0, [s.players[0].field[0].uid]).damage;
  const hurt = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, hp: 10 } : p)) } as GameState;
  const raging = evaluateAttack(hurt, 0, [hurt.players[0].field[0].uid]).damage;
  eq('هياج', raging - full, KEYWORD_VALUES.rageAtk, 'بحياة 10 من 30');
}

// ---------- انصهار: +3 ضرر ويحرق نفسه بـ2 ----------
{
  const s = game({ fields: [['mon_fire_lahibo_2'], []], hands: [[], []], energyCap: [9, 9] });
  const m = s.players[0].field[0];
  const dmg = evaluateAttack(s, 0, [m.uid]).damage;
  eq('انصهار: زيادة الضرر', dmg - m.atk, KEYWORD_VALUES.overheatDamage);
  const after = hit(s, m.uid, 'face');
  eq('انصهار: ثمنه من صحّته', m.hp - after.players[0].field[0].hp, KEYWORD_VALUES.overheatSelf);
}

// ═══════════ 🌿 عشب ═══════════

// ---------- نموّ: +1 هجوم كل دور بسقف ----------
{
  const s = game({ fields: [['mon_grass_shawka_1'], []], hands: [[], []], energyCap: [9, 9] });
  const atk0 = s.players[0].field[0].atk;
  const after = round(s);
  eq('نموّ', after.players[0].field[0].atk - atk0, KEYWORD_VALUES.growthPerTurn, 'بعد دورة كاملة');

  let long = s;
  for (let i = 0; i < 8; i++) long = round(long);
  const ceiling = def(long.players[0].field[0].defId).atk! + KEYWORD_VALUES.growthMax;
  eq('نموّ: لا يكبر بلا حدّ', long.players[0].field[0].atk, ceiling, 'بعد ثماني دورات');
}

// ---------- تجدّد: يستعيد صحةً كل دور ----------
{
  const s = game({ fields: [['mon_grass_fainks_1'], []], hands: [[], []], energyCap: [9, 9] });
  s.players[0].field[0].hp = 2;
  const after = round(s);
  eq('تجدّد', after.players[0].field[0].hp - 2, KEYWORD_VALUES.regenHeal);

  const full = game({ fields: [['mon_grass_fainks_1'], []], hands: [[], []], energyCap: [9, 9] });
  const capped = round(full);
  eq('تجدّد: لا يتجاوز السقف', capped.players[0].field[0].hp, capped.players[0].field[0].maxHp);
}

// ---------- سِرب: يقوّي بقية وحوشك عند استدعائه ----------
{
  let s = game({
    flow: 'mon_grass_shawka_1',
    fields: [['mon_grass_ghabor_1'], []],
    hands: [['mon_grass_waraqi_1'], []],
    energyCap: [9, 9],
  });
  const before = s.players[0].field[0].atk;
  s = play(s, 'mon_grass_waraqi_1');
  eq('سِرب', s.players[0].field[0].atk - before, KEYWORD_VALUES.swarmAtk, 'الوحش الذي كان على الساحة');
}

// ═══════════ 💧 ماء ═══════════

// ---------- توجيه التدفق: يصير التدفق على عنصره ورقمه ----------
{
  let s = game({
    flow: 'mon_fire_jamra_1',
    hands: [['mon_water_leviathi_1'], []],
    fields: [[], []],
    energyCap: [9, 9],
  });
  // يُلعب برقمه لا بعنصره: جمرة رقمها 1 ولا تطابق الماء
  const d = def('mon_water_leviathi_1');
  s.flow = { defId: 'mon_fire_jamra_1', element: 'fire', number: d.number };
  s = play(s, 'mon_water_leviathi_1');
  eq('توجيه التدفق: العنصر', s.flow.element, 'water');
  eq('توجيه التدفق: الرقم', s.flow.number, d.number);
}

// ---------- ارتداد: يعيد أضعف وحوش الخصم إلى يده ----------
{
  let s = game({
    flow: 'mon_water_tsuna_1',
    hands: [['mon_water_azraqo_1'], []],
    fields: [[], ['mon_fire_smoki_1', 'mon_grass_ghabor_1']],
    energyCap: [9, 9],
  });
  const foeHand = s.players[1].hand.length;
  s = play(s, 'mon_water_azraqo_1');
  eq('ارتداد: نقص وحوش الخصم', s.players[1].field.length, 1);
  eq('ارتداد: عاد إلى يده', s.players[1].hand.length, foeHand + 1);
  // الأضعف هو من يعود: «سموكي» بصحة 3 لا «غابور» بصحة 7
  eq('ارتداد: الأضعف هو من عاد', def(s.players[1].field[0].defId).species, 'ghabor');
}

// ---------- تطهير: يزيل السُم والحرق ويفكّ القيد ----------
{
  let s = game({
    flow: 'mon_water_tsuna_1',
    hands: [['mon_water_muwaija_1'], []],
    fields: [['mon_fire_smoki_1'], []],
    energyCap: [9, 9],
  });
  s.players[0].field[0].poison = 2;
  s.players[0].field[0].burn = 1;
  s.players[0].attackLocked = true;
  s = play(s, 'mon_water_muwaija_1');
  const cleaned = s.players[0].field.find((m) => def(m.defId).species === 'smoki')!;
  eq('تطهير: زال السُم', cleaned.poison, 0);
  eq('تطهير: زال الحرق', cleaned.burn, 0);
  eq('تطهير: فُكّ القيد', s.players[0].attackLocked, false);
}

// ═══════════ 🌑 ظلام ═══════════

// ---------- تضحية: يلتهم جريحاً فيكبر ----------
{
  let s = game({
    flow: 'mon_dark_thilli_1',
    hands: [['mon_dark_shadow_1'], []],
    fields: [['mon_fire_smoki_1'], []],
    energyCap: [9, 9],
  });
  s.players[0].field[0].hp = 1; // جريح
  const discard0 = s.discard.length;
  s = play(s, 'mon_dark_shadow_1');
  const eater = s.players[0].field.find((m) => def(m.defId).species === 'shadow')!;
  const base = def(eater.defId);
  eq('تضحية: التهم الجريح', s.players[0].field.length, 1);
  eq('تضحية: ذهب إلى المهملات', s.discard.length, discard0 + 1);
  eq('تضحية: كبر هجومه', eater.atk - base.atk!, KEYWORD_VALUES.sacrificeAtk);
  eq('تضحية: كبرت صحته', eater.maxHp - base.hp!, KEYWORD_VALUES.sacrificeHp);
}

// ---------- مقبرة: يكبر بما في المهملات ----------
{
  let s = game({
    flow: 'mon_dark_thilli_1',
    hands: [['mon_dark_lailks_1'], []],
    fields: [[], []],
    energyCap: [9, 9],
  });
  // تسعة وحوش في المهملات ⇒ 9/3 = 3، وهو السقف
  const buried = s.deck.filter((c) => def(c.defId).kind === 'monster').slice(0, 9);
  s.deck = s.deck.filter((c) => !buried.includes(c));
  s.discard = [...s.discard, ...buried];
  s = play(s, 'mon_dark_lailks_1');
  const m = s.players[0].field[0];
  eq('مقبرة', m.atk - def(m.defId).atk!, KEYWORD_VALUES.graveyardMax, 'بتسعة وحوش في المهملات');
}

// ---------- لعنة: ينزف الخصم في بداية دوره ----------
{
  const s = game({ fields: [['mon_dark_thilli_1'], []], hands: [[], []], energyCap: [9, 9] });
  const foeHp = s.players[1].hp;
  const after = applyGameAction(s, { type: 'END_TURN' });
  eq('لعنة', foeHp - after.players[1].hp, KEYWORD_VALUES.curseDamage, 'في بداية دور الخصم');
}

// ---------- سقف الساحة ----------
{
  const fifth = 'mon_fire_jamra_1';
  const sixth = 'mon_fire_lahibo_1';
  const seventh = 'mon_fire_smoki_1';
  let s = game({
    flow: 'mon_fire_nariks_1',
    fields: [['mon_grass_waraqi_1', 'mon_water_muwaija_1', 'mon_electric_sharara_1', 'mon_dark_thilli_1'], []],
    hands: [[fifth, sixth, seventh], []],
    energyCap: [10, 10],
  });

  s = play(s, fifth);
  s = play(s, sixth);
  const atSix = s.players[0].field.length;
  const blocked = canPlayCard(s, 0, uidInHand(s, seventh));

  if (atSix === RULES.MAX_FIELD && !blocked.ok && blocked.reason === 'field_full')
    ok('سقف الساحة', `يُسمح بـ${RULES.MAX_FIELD} وحوش ويُرفض السابع`);
  else
    bad(
      'سقف الساحة',
      `الساحة=${atSix} (المتوقع ${RULES.MAX_FIELD})، السابع ok=${blocked.ok} reason=${blocked.reason}`
    );
}

console.log(
  failures === 0
    ? '\n✓ كل كلمات العناصر الثماني عشرة وسقف الساحة تعمل.'
    : `\n✗ ${failures} فحصاً فشل.`
);
process.exit(failures > 0 ? 1 : 0);
