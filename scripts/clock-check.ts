/**
 * يتحقّق أن عدّاد الجولة ملك اللاعب لا ملك رقم الدور.
 *
 * كارت «تخطي» في 1×1 يمرّ بدور الخصم ثم يعود إلى صاحبه، فرقم الدور يزيد 2
 * بينما اللاعب واحد. لو صُفِّر العدّاد على رقم الدور لربح اللاعب مهلة كاملة
 * مجاناً في كل مرة. الحقبة (clockEpoch) هي المفتاح الصحيح: لا تزيد إلا حين
 * يبدأ لاعب مختلف دوراً يتصرّف فيه فعلاً.
 *   npm run check:clock
 */
import { aiChooseAction } from '../lib/game/ai';
import { def } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import type { GameScript } from '../lib/game/engine';
import type { GameState, PlayableElement, Seat } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail: string) => console.log(`  ✓ ${name} — ${detail}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};

function game(script: GameScript): GameState {
  return createGame({
    seed: 4242,
    playerName: 'A',
    opponentName: 'B',
    opponentIsAI: false,
    difficulty: 'hard',
    firstPlayer: 0,
    script,
  });
}

/** يسحب نسخة من السطح إلى اليد فيبقى جرد الكروت سليماً */
function giveCard(s: GameState, side: Seat, defId: string): string {
  const i = s.deck.findIndex((c) => c.defId === defId);
  if (i < 0) throw new Error(`لا توجد نسخة متاحة من «${defId}»`);
  const inst = s.deck.splice(i, 1)[0];
  s.players[side].hand.push(inst);
  return inst.uid;
}

/** يضبط التدفّق ليقبل الكارت المطلوب، ويمنح طاقة تكفيه */
function enable(s: GameState, defId: string) {
  const d = def(defId);
  s.flow = {
    element: (d.element === 'wild' ? 'fire' : d.element) as PlayableElement,
    number: d.number,
    defId: d.id,
  };
  s.players[s.current].energy = 10;
}

const BASE: GameScript = {
  flow: 'mon_fire_jamra_1',
  hands: [['mon_fire_lahibo_1'], []],
  energyCap: [9, 9],
};

console.log('عدّاد الجولة:\n');

// ---------- الحالة الابتدائية ----------
{
  const s = game(BASE);
  if (s.clockEpoch === 1 && s.clockSeat === s.current)
    ok('البداية', `الحقبة ${s.clockEpoch} وصاحبها الخانة ${s.clockSeat}`);
  else bad('البداية', `الحقبة ${s.clockEpoch} وصاحبها ${s.clockSeat} والدور للخانة ${s.current}`);
}

// ---------- «تخطي» و«انعكاس» في 1×1: الدور يزيد 2 والحقبة ثابتة ----------
for (const card of ['act_skip_fire', 'act_reverse_fire'] as const) {
  const label = card === 'act_skip_fire' ? 'تخطي' : 'انعكاس (1×1)';
  let s = game(BASE);
  const uid = giveCard(s, 0, card);
  enable(s, card);
  const before = { turn: s.turn, epoch: s.clockEpoch, seat: s.current };
  s = applyGameAction(s, { type: 'PLAY', uid });

  if (s.current !== before.seat) {
    bad(label, `الدور انتقل إلى الخانة ${s.current} — لا ارتداد، فالاختبار لا يقيس شيئاً`);
  } else if (s.turn <= before.turn) {
    bad(label, `رقم الدور لم يتقدّم (${before.turn} ← ${s.turn}) — الاختبار لا يقيس شيئاً`);
  } else if (s.clockEpoch !== before.epoch) {
    bad(label, `الحقبة تغيّرت ${before.epoch} ← ${s.clockEpoch} فربح اللاعب مهلة مجانية`);
  } else {
    ok(label, `الدور ${before.turn} ← ${s.turn} والحقبة ثابتة عند ${s.clockEpoch}`);
  }
}

// ---------- «تغيير العنصر»: لا دور ولا حقبة ----------
{
  let s = game(BASE);
  const uid = giveCard(s, 0, 'act_wild');
  s.players[0].energy = 10;
  const before = { turn: s.turn, epoch: s.clockEpoch };
  s = applyGameAction(s, { type: 'PLAY', uid, chosenElement: 'water' });
  if (s.turn === before.turn && s.clockEpoch === before.epoch)
    ok('تغيير العنصر', `الدور والحقبة ثابتان عند ${s.turn}/${s.clockEpoch}`);
  else
    bad('تغيير العنصر', `الدور ${before.turn} ← ${s.turn} والحقبة ${before.epoch} ← ${s.clockEpoch}`);
}

// ---------- «اسحب كرتين» و«اسحب 4»: الدور ينتقل فعلاً فالحقبة تزيد 1 ----------
for (const card of ['act_draw2_fire', 'act_wild4'] as const) {
  const label = card === 'act_draw2_fire' ? 'اسحب كرتين' : 'اسحب 4';
  let s = game(BASE);
  const uid = giveCard(s, 0, card);
  enable(s, card);
  const before = { epoch: s.clockEpoch, seat: s.current };
  s = applyGameAction(s, { type: 'PLAY', uid, chosenElement: 'fire' });
  if (s.current === before.seat) {
    bad(label, 'الدور لم ينتقل إلى الخصم');
  } else if (s.clockEpoch !== before.epoch + 1) {
    bad(label, `الحقبة ${before.epoch} ← ${s.clockEpoch} والمتوقّع ${before.epoch + 1}`);
  } else {
    ok(label, `الخصم يبدأ حقبة جديدة ${s.clockEpoch} — أي مهلته الكاملة`);
  }
}

// ---------- إنهاء الدور: حقبة جديدة ----------
{
  let s = game(BASE);
  const before = { epoch: s.clockEpoch, seat: s.current };
  s = applyGameAction(s, { type: 'END_TURN' });
  if (s.current !== before.seat && s.clockEpoch === before.epoch + 1)
    ok('إنهاء الدور', `الحقبة ${before.epoch} ← ${s.clockEpoch} مع انتقال الدور`);
  else
    bad('إنهاء الدور', `الخانة ${before.seat} ← ${s.current} والحقبة ${before.epoch} ← ${s.clockEpoch}`);
}

// ---------- «انعكاس» في 1×1×1: الدور ينتقل لخانة أخرى فالحقبة تزيد ----------
{
  let s = createGame({
    seed: 909,
    playerCount: 3,
    roster: [
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
      { name: 'C', isAI: false },
    ],
    difficulty: 'hard',
    firstPlayer: 0,
  });
  const uid = giveCard(s, 0, 'act_reverse_fire');
  enable(s, 'act_reverse_fire');
  const before = { epoch: s.clockEpoch, seat: s.current };
  s = applyGameAction(s, { type: 'PLAY', uid });
  if (s.current === before.seat) {
    bad('انعكاس (1×1×1)', 'الدور بقي عند نفس الخانة');
  } else if (s.clockEpoch !== before.epoch + 1) {
    bad('انعكاس (1×1×1)', `الحقبة ${before.epoch} ← ${s.clockEpoch} والمتوقّع ${before.epoch + 1}`);
  } else {
    ok('انعكاس (1×1×1)', `الخانة ${before.seat} ← ${s.current} والحقبة ${s.clockEpoch}`);
  }
}

// ---------- ثوابت على مباريات كاملة ----------
{
  const GAMES = 200;
  let decreased = 0;
  let mismatched = 0;
  let epochOverTurn = 0;

  for (let g = 0; g < GAMES; g++) {
    let s = createGame({
      seed: 1000 + g,
      playerCount: g % 3 === 0 ? 3 : 2,
      opponentIsAI: true,
      difficulty: 'hard',
    });
    for (const p of s.players) p.isAI = true;

    let prevEpoch = s.clockEpoch;
    let steps = 0;
    while (s.phase !== 'ended' && steps < 4000) {
      // كل حالة يتصرّف فيها لاعب يجب أن يملك عدّادها
      if ((s.phase === 'main' || s.phase === 'respond') && s.clockSeat !== s.current) mismatched++;
      if (s.clockEpoch < prevEpoch) decreased++;
      // كل حقبة يقابلها دور واحد على الأقل، فلا تسبق الحقبةُ رقمَ الدور
      if (s.clockEpoch > s.turn) epochOverTurn++;
      prevEpoch = s.clockEpoch;

      const action = aiChooseAction(s);
      if (!action) break;
      s = applyGameAction(s, action);
      steps++;
    }
  }

  if (decreased === 0) ok('الحقبة لا تنقص', `${GAMES} مباراة`);
  else bad('الحقبة لا تنقص', `${decreased} حالة نقصت فيها`);

  if (mismatched === 0) ok('صاحب العدّاد هو صاحب الدور', 'في كل حالة تصرّف');
  else bad('صاحب العدّاد هو صاحب الدور', `${mismatched} حالة اختلفا فيها`);

  if (epochOverTurn === 0) ok('الحقبة ≤ رقم الدور', 'لا حقبة بلا دور يقابلها');
  else bad('الحقبة ≤ رقم الدور', `${epochOverTurn} حالة تجاوزت فيها`);
}

console.log(
  failures === 0
    ? '\n✓ العدّاد ملك اللاعب: كروت الحركة التي تعيد الدور لا تمنح مهلة جديدة.'
    : `\n✗ ${failures} مشكلة في العدّاد.`
);
process.exit(failures > 0 ? 1 : 0);
