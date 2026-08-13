/**
 * يتحقّق أن كل خاصية وحش تعمل فعلاً، كلٌّ في لحظتها:
 * الاستدعاء، بداية الدور، الهجوم، الدفاع، والدمج.
 *
 * كل اختبار يبني مباراة بتوزيع مُعدّ، ينفّذ الحركة، ويقارن الأرقام قبل وبعد.
 *   npm run check:abilities
 */
import { def } from '../lib/game/cards';
import { applyGameAction, createGame, evaluateAttack } from '../lib/game/engine';
import type { GameScript } from '../lib/game/engine';
import type { GameState } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail: string) => console.log(`  ✓ ${name} — ${detail}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};

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
const onField = (s: GameState, side: 0 | 1, species: string) =>
  s.players[side].field.find((m) => def(m.defId).species === species);

console.log('خصائص الوحوش:\n');

// ---------- اندفاع: يهاجم فور استدعائه ----------
{
  // ناريكس (اندفاع) مقابل لهيبو (بلا خاصية)
  let s = game({ flow: 'mon_fire_jamra_1', hands: [['mon_fire_nariks_1', 'mon_fire_lahibo_1'], []], energyCap: [9, 9] });
  s = applyGameAction(s, { type: 'PLAY', uid: uidInHand(s, 'mon_fire_nariks_1') });
  s = applyGameAction(s, { type: 'PLAY', uid: uidInHand(s, 'mon_fire_lahibo_1') });
  const rush = onField(s, 0, 'nariks')!;
  const plain = onField(s, 0, 'lahibo')!;
  if (!rush.sick && plain.sick) ok('اندفاع', 'المندفع جاهز فوراً وغير المندفع «جديد»');
  else bad('اندفاع', `المندفع sick=${rush.sick} والعادي sick=${plain.sick}`);
}

// ---------- استطلاع: اسحب كارتاً عند الاستدعاء ----------
{
  let s = game({ flow: 'mon_grass_waraqi_1', hands: [['mon_grass_waraqi_1', 'mon_grass_ghabor_1'], []], energyCap: [9, 9] });
  const before = s.players[0].hand.length;
  s = applyGameAction(s, { type: 'PLAY', uid: uidInHand(s, 'mon_grass_waraqi_1') });
  const after = s.players[0].hand.length;
  // لعب كارت (-1) + سحب الاستطلاع (+1) = بلا تغيير
  if (after === before) ok('استطلاع', `اليد ${before} ← ${after} (سحب كارتاً بدل الذي لعبه)`);
  else bad('استطلاع', `اليد ${before} ← ${after}، والمتوقّع ${before}`);
}

// ---------- شحن: +1 طاقة فوق السقف في بداية دورك ----------
{
  // كورالي (شحن) على الساحة منذ البداية
  const s = game({ fields: [['mon_water_korali_1'], []], hands: [[], []], energyCap: [4, 4] });
  const withCharge = s.players[0].energy;
  const cap = s.players[0].energyCap;

  const plain = game({ fields: [[], []], hands: [[], []], energyCap: [4, 4] });
  const withoutCharge = plain.players[0].energy;

  if (withCharge === withoutCharge + 1 && withCharge > cap)
    ok('شحن', `الطاقة ${withCharge} مقابل ${withoutCharge} بلا شاحن (فوق السقف ${cap})`);
  else bad('شحن', `الطاقة ${withCharge} مقابل ${withoutCharge}، السقف ${cap}`);
}

// ---------- حراسة: يتلقّى ضرراً أقل بمقدار 1 ----------
{
  // ناريكس (هجوم 4) يهاجم مويجة (حراسة، حياة 6)
  let s = game({
    flow: 'mon_fire_jamra_1',
    fields: [['mon_fire_nariks_1'], ['mon_water_muwaija_1']],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const target = s.players[1].field[0];
  const hpBefore = target.hp;
  s = applyGameAction(s, {
    type: 'ATTACK',
    attackers: [s.players[0].field[0].uid],
    target: target.uid,
  });
  const after = s.players[1].field[0]?.hp ?? 0;
  const dealt = hpBefore - after;
  if (dealt === 3) ok('حراسة', `هجوم 4 أحدث ${dealt} ضرر فقط (${hpBefore} ← ${after})`);
  else bad('حراسة', `هجوم 4 أحدث ${dealt} ضرر، والمتوقّع 3`);
}

// ---------- سُم: يصيب المهاجم بـ1 عند الدفاع ----------
{
  // ناريكس (4/4) يهاجم شوكة (سُم، 3/3)
  let s = game({
    flow: 'mon_fire_jamra_1',
    fields: [['mon_fire_nariks_1'], ['mon_grass_shawka_1']],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const attacker = s.players[0].field[0];
  const hpBefore = attacker.hp;
  s = applyGameAction(s, {
    type: 'ATTACK',
    attackers: [attacker.uid],
    target: s.players[1].field[0].uid,
  });
  const after = s.players[0].field[0]?.hp ?? 0;
  if (after === hpBefore - 1) ok('سُم', `المهاجم ${hpBefore} ← ${after} بعد قتل حامل السُم`);
  else bad('سُم', `المهاجم ${hpBefore} ← ${after}، والمتوقّع ${hpBefore - 1}`);
}

// ---------- امتصاص: يشفي نصف الضرر ----------
{
  // نايتمير (امتصاص، هجوم 5) يضرب مباشرة
  let s = game({ flow: 'mon_dark_thilli_1', fields: [['mon_dark_nightmare_1'], []], hands: [[], []], energyCap: [9, 9] });
  s.players[0].hp = 20;
  const before = s.players[0].hp;
  s = applyGameAction(s, { type: 'ATTACK', attackers: [s.players[0].field[0].uid], target: 'face' });
  const after = s.players[0].hp;
  if (after === before + 3) ok('امتصاص', `الحياة ${before} ← ${after} بعد ضربة 5 (نصفها مجبوراً)`);
  else bad('امتصاص', `الحياة ${before} ← ${after}، والمتوقّع ${before + 3}`);
}

// ---------- اختراق: الضرر الزائد يصيب الخصم ----------
{
  // طيفا (اختراق، هجوم 4) يهاجم شوكة (حياة 3) → الزائد 1
  let s = game({
    flow: 'mon_psychic_holmi_1',
    fields: [['mon_psychic_taifa_1'], ['mon_grass_shawka_1']],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const foeHpBefore = s.players[1].hp;
  s = applyGameAction(s, {
    type: 'ATTACK',
    attackers: [s.players[0].field[0].uid],
    target: s.players[1].field[0].uid,
  });
  const foeHpAfter = s.players[1].hp;
  if (foeHpAfter === foeHpBefore - 1)
    ok('اختراق', `حياة الخصم ${foeHpBefore} ← ${foeHpAfter} (الزائد 1 عبر الوحش)`);
  else bad('اختراق', `حياة الخصم ${foeHpBefore} ← ${foeHpAfter}، والمتوقّع ${foeHpBefore - 1}`);
}

// ---------- رابط: يُدمج مع أي عنصر ----------
{
  // بلازمي (كهرباء، رقم 0، رابط) + لهيبو (نار، رقم 2) — لا عنصر ولا رقم مشترك
  const s = game({
    flow: 'mon_fire_jamra_1',
    fields: [['mon_electric_plazmi_1', 'mon_fire_lahibo_1'], []],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const withLink = evaluateAttack(s, 0, [s.players[0].field[0].uid, s.players[0].field[1].uid]);

  // نفس الحالة بلا رابط: لهيبو (نار 2) + ورقي (عشب 2)... مختلفان عنصراً ورقمهما 2 — نستخدم زوجاً بلا اشتراك
  const s2 = game({
    flow: 'mon_fire_jamra_1',
    fields: [['mon_fire_lahibo_1', 'mon_grass_ghabor_1'], []],
    hands: [[], []],
    energyCap: [9, 9],
  });
  const withoutLink = evaluateAttack(s2, 0, [s2.players[0].field[0].uid, s2.players[0].field[1].uid]);

  if (withLink.ok && !withoutLink.ok)
    ok('رابط', `الدمج مسموح مع «رابط» (ضرر ${withLink.damage}) ومرفوض بدونه`);
  else bad('رابط', `مع رابط ok=${withLink.ok}، بدونه ok=${withoutLink.ok}`);
}

console.log(
  failures === 0 ? '\n✓ كل الخصائص الثماني تعمل في لحظتها.' : `\n✗ ${failures} خاصية لا تعمل.`
);
process.exit(failures > 0 ? 1 : 0);
