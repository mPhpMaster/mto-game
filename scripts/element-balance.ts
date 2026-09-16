/**
 * يقيس نسبة فوز كل عنصر بعد تبديل الخصائص بكلمات العناصر.
 *
 * **ما يقيسه بالضبط — وحدوده:** السطح في هذه اللعبة **واحد مشترك** بين
 * اللاعبَين، فلا توجد «مجموعة عنصر» تُواجه أخرى. ما يُضبط هنا هو **الافتتاح**:
 * يفتح كل طرف بخمسة كروت من عنصره (أرخص ثلاثة وحوش أساسية + فخّ + سحر،
 * بالوصفة نفسها لكل عنصر)، ثم يسحب الطرفان من السطح المختلط نفسه. فالقياس
 * قياسُ الأدوار الأولى — وهي التي تعمل فيها كلمات العنصر — لا قياسُ مباراة
 * كاملة من عنصرٍ واحد.
 *
 * **ضبط التحيّز:** كل زوج يُلعب بالترتيبين (كلٌّ في المقعد 0 مرّة)، والبادئ
 * يتناوب مع البذرة. ومعه **مبارياتُ المرآة** (نار ضد نار…): لو لم تقع حول
 * 50% فالخلل في أداة القياس لا في العناصر، ولا معنى لبقيّة الأرقام.
 *
 *   npm run balance:elements            # 200 مباراة لكل ترتيب
 *   npm run balance:elements -- 400     # عيّنة أكبر
 */
import { aiChooseAction } from '../lib/game/ai';
import { CATALOG, ELEMENTS } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import type { CardDef, GameState, PlayableElement, Seat } from '../lib/game/types';

const N = Number(process.argv[2] ?? 200);
const MAX_STEPS = 600;

/** وصفةٌ واحدة لكل عنصر كي يكون الفرق في الكلمات لا في جودة الافتتاح */
function opening(el: PlayableElement): string[] {
  const pool = CATALOG.filter((c) => c.element === el);
  const byCost = (a: CardDef, b: CardDef) => a.cost - b.cost || a.id.localeCompare(b.id);
  const monsters = pool.filter((c) => c.kind === 'monster' && c.stage === 1).sort(byCost);
  const traps = pool.filter((c) => c.kind === 'trap').sort(byCost);
  const spells = pool.filter((c) => c.kind === 'spell').sort(byCost);
  const hand = [...monsters.slice(0, 3), ...traps.slice(0, 1), ...spells.slice(0, 1)];
  // لو نقص عنصرٌ فخّاً أو سحراً يُكمَّل بوحشٍ رابع كي تتساوى أعداد الكروت
  while (hand.length < 5 && monsters.length > hand.filter((c) => c.kind === 'monster').length) {
    hand.push(monsters[hand.filter((c) => c.kind === 'monster').length]);
  }
  return hand.slice(0, 5).map((c) => c.id);
}

/** مباراةٌ كاملة بين آليَّين، وتعيد الفائز أو null إن لم تُحسم */
function playOut(seat0: PlayableElement, seat1: PlayableElement, seed: number, first: Seat): Seat | null {
  let s: GameState = createGame({
    seed,
    opponentIsAI: true,
    difficulty: 'hard',
    firstPlayer: first,
    script: { hands: [opening(seat0), opening(seat1)] },
  });
  s.players[0].isAI = true;

  let steps = 0;
  let guardTurn = -1;
  let guardCount = 0;
  while (s.phase !== 'ended' && steps < MAX_STEPS) {
    if (s.turn !== guardTurn) {
      guardTurn = s.turn;
      guardCount = 0;
    }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    steps++;
    // حركةٌ لم تغيّر شيئاً: أنهِ الدور كي لا تعلق الحلقة
    if (s.turn === before.turn && s.logSeq === before.logSeq && action.type !== 'END_TURN') {
      s = applyGameAction(s, { type: 'END_TURN' });
      steps++;
    }
  }
  return s.phase === 'ended' ? (s.winner ?? null) : null;
}

/** يلعب الزوج بالترتيبين ويعيد فوز الأوّل من مجموع المحسوم */
function duel(a: PlayableElement, b: PlayableElement): { winsA: number; played: number } {
  let winsA = 0;
  let played = 0;
  for (let i = 0; i < N; i++) {
    const first: Seat = (i % 2) as Seat;
    // الترتيب الأوّل: a في المقعد 0
    const w1 = playOut(a, b, 90000 + i, first);
    if (w1 !== null) {
      played++;
      if (w1 === 0) winsA++;
    }
    // الترتيب الثاني: b في المقعد 0 — فينتفي أثر المقعد
    const w2 = playOut(b, a, 90000 + i, first);
    if (w2 !== null) {
      played++;
      if (w2 === 1) winsA++;
    }
  }
  return { winsA, played };
}

/** هامش الثقة 95% تقريباً — بدونه لا يُعرف الفرقُ من الضجيج */
const margin = (p: number, n: number) => (n ? 1.96 * Math.sqrt((p * (1 - p)) / n) : 0);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

console.log(`قياس العناصر — ${N} مباراة لكل ترتيب، والزوج يُلعب بالترتيبين\n`);

// ---------- معايرة: مبارياتُ المرآة ----------
console.log('معايرة (عنصر ضد نفسه — يجب أن تقع حول 50%):');
let worstMirror = 0;
for (const el of ELEMENTS) {
  const { winsA, played } = duel(el, el);
  const p = played ? winsA / played : 0;
  worstMirror = Math.max(worstMirror, Math.abs(p - 0.5));
  console.log(`  ${el.padEnd(9)} ${pct(p)} ± ${pct(margin(p, played))}  (${played} محسومة)`);
}

// ---------- كل زوج ----------
const wins: Record<string, number> = {};
const games: Record<string, number> = {};
for (const el of ELEMENTS) {
  wins[el] = 0;
  games[el] = 0;
}
const matrix: Record<string, Record<string, string>> = {};

console.log('\nالمواجهات (نسبة فوز عنصر الصفّ على عنصر العمود):');
for (const a of ELEMENTS) matrix[a] = {};
for (let i = 0; i < ELEMENTS.length; i++) {
  for (let j = i + 1; j < ELEMENTS.length; j++) {
    const a = ELEMENTS[i];
    const b = ELEMENTS[j];
    const { winsA, played } = duel(a, b);
    const p = played ? winsA / played : 0;
    matrix[a][b] = pct(p);
    matrix[b][a] = pct(1 - p);
    wins[a] += winsA;
    wins[b] += played - winsA;
    games[a] += played;
    games[b] += played;
    console.log(`  ${a.padEnd(9)} ضد ${b.padEnd(9)} ${pct(p)} ± ${pct(margin(p, played))}`);
  }
}

console.log('\nالحصيلة لكل عنصر:');
const table = ELEMENTS.map((el) => {
  const p = games[el] ? wins[el] / games[el] : 0;
  return { el, p, n: games[el] };
}).sort((x, y) => y.p - x.p);
for (const r of table) {
  console.log(`  ${r.el.padEnd(9)} ${pct(r.p)} ± ${pct(margin(r.p, r.n))}  (${r.n} مباراة)`);
}

const spread = table[0].p - table[table.length - 1].p;
console.log(`\nالفارق بين الأعلى والأدنى: ${pct(spread)}`);
console.log(`أسوأ انحراف في المرآة عن 50%: ${pct(worstMirror)}`);
console.log(
  worstMirror > 0.05
    ? '\n⚠ المرآة بعيدة عن 50% — أداة القياس نفسها متحيّزة، فلا تُقرأ بقيّة الأرقام.'
    : spread > 0.12
      ? '\n⚠ الفارق أوسع من 12 نقطة — عنصرٌ يتفوّق تفوّقاً يُشعر به اللاعب.'
      : '\n✓ الفوارق داخل نطاقٍ مقبول لهذه العيّنة.'
);
