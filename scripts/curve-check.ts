/**
 * يقيس إن كانت بداية المباراة عادلة: هل يجد اللاعب كروتاً تكفيها طاقته؟
 *
 * المقياس الحاسم هو «الأدوار الميتة»: دور لم يكن فيه أي كارت قابل للعب،
 * فاضطرّ اللاعب أن يسحب ويمرّر. هذه هي اللحظة التي تُشعر اللاعب بالعجز.
 *   npm run check:curve
 */
import { aiChooseAction } from '../lib/game/ai';
import { def } from '../lib/game/cards';
import { applyGameAction, createGame, hasAnyPlayable } from '../lib/game/engine';
import type { GameState } from '../lib/game/types';

const GAMES = Number(process.argv[2] ?? 300);
const SPREAD = process.argv[3] !== undefined ? Number(process.argv[3]) : undefined;
const EARLY_TURNS = 6;

let openingCostSum = 0;
let openingCards = 0;
let openingAffordable = 0;

const deadByTurn = new Map<number, { dead: number; total: number }>();
let deadEarly = 0;
let totalEarly = 0;

for (let g = 0; g < GAMES; g++) {
  let s: GameState = createGame({ seed: 8000 + g, opponentIsAI: true, difficulty: 'hard', curveSpread: SPREAD });
  s.players[0].isAI = true;

  // اليد الافتتاحية للاعب الأول
  for (const c of s.players[0].hand) {
    const d = def(c.defId);
    openingCostSum += d.cost;
    openingCards++;
    // سقف الطاقة في الدور الأول
    if (d.cost <= 2) openingAffordable++;
  }

  let steps = 0;
  let guardTurn = -1;
  let guardCount = 0;
  const measured = new Set<number>();

  while (s.phase !== 'ended' && steps < 600) {
    // قِس مرة واحدة في بداية كل دور، قبل أي حركة
    if (!measured.has(s.turn) && s.phase === 'main') {
      measured.add(s.turn);
      const side = s.current;
      const playable = hasAnyPlayable(s, side);
      const bucket = deadByTurn.get(s.turn) ?? { dead: 0, total: 0 };
      bucket.total++;
      if (!playable) bucket.dead++;
      deadByTurn.set(s.turn, bucket);
      if (s.turn <= EARLY_TURNS) {
        totalEarly++;
        if (!playable) deadEarly++;
      }
    }

    if (s.turn !== guardTurn) { guardTurn = s.turn; guardCount = 0; }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    steps++;
    if (s.turn === before.turn && s.log.length === before.log.length && action.type !== 'END_TURN') {
      s = applyGameAction(s, { type: 'END_TURN' });
      steps++;
    }
  }
}

console.log(`${GAMES} مباراة\n`);
console.log(`متوسط تكلفة كروت اليد الافتتاحية : ${(openingCostSum / openingCards).toFixed(2)}`);
console.log(
  `كروت افتتاحية تكفيها طاقة الدور الأول (≤2): ${((openingAffordable / openingCards) * 100).toFixed(1)}%` +
    `  (~${((openingAffordable / openingCards) * 5).toFixed(1)} من أصل 5)`
);
console.log(
  `\nالأدوار الميتة في أول ${EARLY_TURNS} أدوار: ${((deadEarly / totalEarly) * 100).toFixed(1)}%`
);
console.log('\nنسبة الأدوار الميتة حسب رقم الدور:');
for (let t = 1; t <= 10; t++) {
  const b = deadByTurn.get(t);
  if (!b) continue;
  const pct = (b.dead / b.total) * 100;
  const bar = '█'.repeat(Math.round(pct / 2));
  console.log(`  دور ${String(t).padStart(2)}: ${pct.toFixed(1).padStart(5)}%  ${bar}`);
}
