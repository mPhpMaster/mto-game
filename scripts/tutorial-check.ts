/**
 * يتحقّق أن التعليم قابل للإنجاز فعلاً: يمشي في الخطوات بالترتيب،
 * ينفّذ الحركة المطلوبة في كل خطوة، ويتأكّد أن شرط الإنجاز يتحقّق.
 *
 * يمسك أخطاء مثل: الدرس يطلب لعب كارت لا تكفيه الطاقة، أو شرط لا يتحقّق أبداً.
 *   npm run check:tutorial
 */
import { TOTAL_CARDS, def } from '../lib/game/cards';
import { applyGameAction, canPlayCard, createGame, evaluateAttack } from '../lib/game/engine';
import { TUTORIAL_SCRIPT, TUTORIAL_SEED, TUTORIAL_STEPS } from '../lib/game/tutorial';
import type { GameAction, GameState } from '../lib/game/types';

let failures = 0;
function fail(msg: string) {
  failures++;
  console.error(`✗ ${msg}`);
}

const handUid = (s: GameState, defId: string): string | null =>
  s.players[0].hand.find((c) => c.defId === defId)?.uid ?? null;

const fieldUid = (s: GameState, species: string): string | null =>
  s.players[0].field.find((m) => def(m.defId).species === species)?.uid ?? null;

/** الحركة المتوقّعة من اللاعب في كل خطوة غير يدوية (مطابقة لنصّ الدرس) */
const SOLUTION: Record<number, (s: GameState) => GameAction | null> = {
  3: (s) => {
    const uid = handUid(s, 'mon_fire_lahibo_1');
    return uid ? { type: 'PLAY', uid } : null;
  },
  5: (s) => {
    const uid = handUid(s, 'mon_fire_nariks_1');
    return uid ? { type: 'PLAY', uid } : null;
  },
  6: (s) => {
    const a = fieldUid(s, 'nariks');
    const t = s.players[1].field[0]?.uid;
    return a && t ? { type: 'ATTACK', attackers: [a], target: t } : null;
  },
  7: () => ({ type: 'END_TURN' }),
  8: (s) => {
    const uid = handUid(s, 'trap_ambush');
    return uid ? { type: 'PLAY', uid } : null;
  },
  9: (s) => {
    const uid = handUid(s, 'frag_heart');
    return uid ? { type: 'PLAY', uid } : null;
  },
  10: (s) => {
    const a = fieldUid(s, 'lahibo');
    const b = fieldUid(s, 'nariks');
    return a && b ? { type: 'ATTACK', attackers: [a, b], target: 'face' } : null;
  },
};

let s: GameState = createGame({
  seed: TUTORIAL_SEED,
  playerName: 'أنت',
  opponentName: 'المدرّب',
  opponentIsAI: true,
  script: TUTORIAL_SCRIPT,
});

console.log(`التعليم: ${TUTORIAL_STEPS.length} خطوة`);

for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
  const step = TUTORIAL_STEPS[i];
  const label = `خطوة ${i + 1} «${step.title.ar}»`;

  if (step.manual) {
    if (step.done) fail(`${label}: خطوة يدوية ومعها شرط إنجاز — تناقض.`);
    console.log(`  · ${label} — شرح`);
    continue;
  }

  if (!step.done) {
    fail(`${label}: ليست يدوية وليس لها شرط إنجاز — ستعلق.`);
    continue;
  }

  const build = SOLUTION[i];
  if (!build) {
    fail(`${label}: لا توجد حركة معروفة تُنجزها في هذا الفحص.`);
    continue;
  }

  const action = build(s);
  if (!action) {
    fail(`${label}: تعذّر تكوين الحركة المطلوبة (كارت أو وحش مفقود).`);
    continue;
  }

  // الدرس يطلب حركة — فلتكن مسموحة بقواعد اللعبة فعلاً
  if (action.type === 'PLAY') {
    const chk = canPlayCard(s, 0, action.uid);
    const name = def(s.players[0].hand.find((c) => c.uid === action.uid)!.defId).name;
    if (!chk.ok) {
      fail(`${label}: الدرس يطلب لعب «${name}» لكن اللعبة ترفض — ${chk.reason}.`);
      continue;
    }
  }
  if (action.type === 'ATTACK') {
    const chk = evaluateAttack(s, 0, action.attackers);
    if (!chk.ok) {
      fail(`${label}: الدرس يطلب هجوماً غير صالح — ${chk.reason}.`);
      continue;
    }
  }

  s = applyGameAction(s, action);
  // دور المدرّب: يمرّر فقط، كما في وضع التعليم
  let guard = 0;
  while (s.current === 1 && s.phase !== 'ended' && guard++ < 5) {
    s = applyGameAction(s, s.phase === 'respond' ? { type: 'ACCEPT_DRAW' } : { type: 'END_TURN' });
  }

  if (!step.done(s)) {
    fail(`${label}: نُفّذت الحركة لكن شرط الإنجاز لم يتحقّق.`);
    continue;
  }
  console.log(`  ✓ ${label}`);
}

// جرد الكروت: التوزيع المُعدّ يجب ألا يخلق أو يفقد كروتاً
const seen = new Set<string>();
let count = 0;
for (const c of [...s.deck, ...s.discard]) { seen.add(c.uid); count++; }
for (const p of s.players) {
  for (const c of p.hand) { seen.add(c.uid); count++; }
  for (const m of p.field) { seen.add(m.uid); count++; }
  for (const t of p.traps) { seen.add(t.uid); count++; }
}
const claimed = s.players[0].fragments.length + s.players[1].fragments.length;
if (seen.size !== count) fail(`تكرار في الكروت: ${count} نسخة مقابل ${seen.size} معرّفاً.`);
if (seen.size + claimed !== TOTAL_CARDS)
  fail(`مجموع الكروت ${seen.size + claimed} بدل ${TOTAL_CARDS}.`);

console.log(
  failures === 0
    ? '\n✓ التعليم قابل للإنجاز بالكامل، والجرد سليم.'
    : `\n✗ ${failures} مشكلة في التعليم.`
);
process.exit(failures > 0 ? 1 : 0);
