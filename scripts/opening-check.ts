/**
 * يحرس شكل اليد الافتتاحية: يجب أن تكون الوحوش هي الغالبة والأفخاخ قليلة،
 * وألّا تُفتح مباراة بيدٍ خاليةٍ من الوحوش. كان منحنى التكلفة يُغرِق كل وحش
 * (أرخصه بتكلفة 2) تحت البطاقات الرخيصة (حركات/أفخاخ بتكلفة 0–1) فتمتلئ اليد
 * بالأفخاخ. الحلّ: حسمُ تكلفةٍ للوحوش في المنحنى + حدٌّ أدنى مضمون من الوحوش.
 *   npm run check:opening
 */
import { def } from '../lib/game/cards';
import { RULES, createGame } from '../lib/game/engine';

const GAMES = 800;
const FLOOR = RULES.OPENING_MONSTER_FLOOR;

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};

const tally: Record<string, number> = { monster: 0, action: 0, trap: 0, spell: 0, fragment: 0 };
let cards = 0;
let belowFloor = 0;
let trapHeavy = 0; // أفخاخ ≥ وحوش

for (let g = 0; g < GAMES; g++) {
  const seed = 4000 + g;
  const s = createGame({ seed, opponentIsAI: true });
  // كلا اللاعبين يجب أن يُضمن لهما الحدّ الأدنى — الضمان متماثل
  for (const side of [0, 1] as const) {
    const hand = s.players[side].hand;
    let m = 0;
    let tr = 0;
    for (const c of hand) {
      const k = def(c.defId).kind;
      if (side === 0) {
        tally[k] = (tally[k] ?? 0) + 1;
        cards++;
      }
      if (k === 'monster') m++;
      if (k === 'trap') tr++;
    }
    if (m < FLOOR) {
      belowFloor++;
      if (belowFloor <= 3) fail(`بذرة ${seed} خانة ${side}: ${m} وحش فقط (الحدّ الأدنى ${FLOOR}).`);
    }
    if (side === 0 && tr > m) trapHeavy++;
    // لا تكرار في اليد
    if (new Set(hand.map((c) => c.uid)).size !== hand.length) {
      fail(`بذرة ${seed} خانة ${side}: تكرار في اليد.`);
    }
  }
}

const avg = (k: string) => tally[k] / GAMES;
// الوحوش يجب أن تكون الغالبة: أكثر من أي نوع آخر
const others = ['action', 'trap', 'spell', 'fragment'];
for (const k of others) {
  if (avg('monster') <= avg(k)) {
    fail(`الوحوش ليست الغالبة: متوسط الوحوش ${avg('monster').toFixed(2)} ≤ ${k} ${avg(k).toFixed(2)}.`);
  }
}
// الأفخاخ يجب أن تبقى قليلة
if (avg('trap') > 1) fail(`الأفخاخ كثيرة: متوسط ${avg('trap').toFixed(2)} في اليد.`);
const trapHeavyPct = (trapHeavy / GAMES) * 100;
if (trapHeavyPct > 15) fail(`أيدٍ تغلب فيها الأفخاخ على الوحوش كثيرة: ${trapHeavyPct.toFixed(1)}%.`);

console.log(`${GAMES} مباراة — متوسط اليد الافتتاحية (5 كروت):`);
for (const k of ['monster', 'action', 'trap', 'spell', 'fragment']) {
  console.log(`  ${k.padEnd(9)} ${avg(k).toFixed(2)}  (${((tally[k] / cards) * 100).toFixed(0)}%)`);
}
console.log(`أيدٍ دون الحدّ الأدنى (${FLOOR} وحوش): ${belowFloor}`);
console.log(`أيدٍ تغلب فيها الأفخاخ: ${trapHeavyPct.toFixed(1)}%`);
console.log(
  failures === 0
    ? `\n✓ اليد الافتتاحية سليمة: الوحوش غالبة، الأفخاخ قليلة، ولا يدَ بلا وحوش.`
    : `\n✗ ${failures} مشكلة.`
);
process.exit(failures > 0 ? 1 : 0);
