/**
 * يتحقّق أن حصيلة المباراة (أكثر الكروت والعناصر واستدعاءات الوحش الأعظم)
 * تُحصي اللعب الحقيقي وحده ولا تفقد شيئاً في المباريات الطويلة.
 *
 * الخطران اللذان يحرسهما هذا الفحص:
 *  - السجل حلقة تُقصّ عند 200 سطر: القراءة دفعةً واحدة عند النهاية تفقد
 *    أوائل المباراة، والتجميع التزايدي هو ما يمنع ذلك.
 *  - مفاتيح كثيرة تحمل معامل `card` وليست لعباً، فالعدّ الساذج يضخّم.
 *   npm run check:stats
 */
import { aiChooseAction } from '../lib/game/ai';
import { CARD_BY_ID } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import { advanceTally, emptyTally, tallyToPayload, type MatchTally } from '../lib/game/stats';
import type { GameState, LogEntry } from '../lib/game/types';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

const PLAY_KEYS = new Set(['summoned', 'played', 'played_wild']);

/**
 * نفس قواعد التجميع لكن على السجل الباقي وحده — أي «ماذا لو قرأنا السجل
 * دفعةً واحدة عند النهاية». الفرق بينه وبين التزايدي هو بالضبط ما تفقده
 * الحلقة عند القصّ.
 */
function naiveCount(log: LogEntry[], seat: number): number {
  let n = 0;
  for (const e of log) {
    if (e.side === seat && PLAY_KEYS.has(e.key) && typeof e.params?.card === 'string') n++;
  }
  return n;
}

/** كل سطر يحمل «card» بلا تمييز — لقياس تضخيم العدّ الساذج */
function anyCardCount(log: LogEntry[], seat: number): number {
  let n = 0;
  for (const e of log) {
    if (e.side === seat && typeof e.params?.card === 'string') n++;
  }
  return n;
}

console.log('حصيلة المباراة:\n');

const GAMES = 40;
let longMatches = 0;
let incrementalBeatsNaive = 0;
let strictlyMore = 0;
let inflated = 0;
let totalPlays = 0;
let unknownCards = 0;
let truncated = 0;

for (let g = 0; g < GAMES; g++) {
  let s: GameState = createGame({
    seed: 700 + g,
    playerCount: g % 4 === 0 ? 3 : 2,
    opponentIsAI: true,
    difficulty: 'hard',
  });
  for (const p of s.players) p.isAI = true;

  let tally: MatchTally = emptyTally();
  let steps = 0;
  while (s.phase !== 'ended' && steps < 4000) {
    const action = aiChooseAction(s);
    if (!action) break;
    s = applyGameAction(s, action);
    // التجميع بعد كل حركة كما تفعل الواجهة
    tally = advanceTally(tally, s.log, s.logSeq, 0);
    steps++;
  }

  if (s.logSeq > 200) {
    longMatches++;
    if (s.log.length < s.logSeq) truncated++;
  }

  const plays = Object.values(tally.cards).reduce((a, b) => a + b, 0);
  totalPlays += plays;
  // قراءة السجل الباقي دفعةً واحدة لا يمكن أن تتجاوز التزايدي أبداً
  const naive = naiveCount(s.log, 0);
  if (plays >= naive) incrementalBeatsNaive++;
  if (plays > naive) strictlyMore++;
  // العدّ بلا قائمة بيضاء يضخّم: يعدّ السقوط والتعزيز والإحياء لعباً
  if (anyCardCount(s.log, 0) > naive) inflated++;

  for (const id of Object.keys(tally.cards)) {
    if (!CARD_BY_ID[id]) unknownCards++;
  }
}

if (longMatches > 0) ok(`${longMatches} مباراة تجاوزت 200 سطر سجل (تُختبر الحلقة فعلاً)`);
else bad('لا مباراة طويلة بما يكفي لاختبار قصّ السجل — الفحص لا يقيس شيئاً');

if (truncated > 0) ok(`${truncated} مباراة فقد سجلّها أسطراً بالفعل`);
else bad('لم يُقصّ أي سجل — الفحص لا يختبر الحالة التي وُجد لأجلها');

if (incrementalBeatsNaive === GAMES) ok('التزايدي لا يقلّ عن قراءة السجل الباقي في أي مباراة');
else bad(`${GAMES - incrementalBeatsNaive} مباراة نقص فيها التزايدي`);

if (strictlyMore > 0)
  ok(`${strictlyMore} مباراة التقط فيها التزايدي لعباً كانت القراءة الدفعية ستفقده`);
else bad('لم يلتقط التزايدي أي لعب إضافي — فائدته غير مُثبَتة');

if (inflated > 0) ok(`${inflated} مباراة كان العدّ بلا قائمة بيضاء سيضخّمها`);
else bad('العدّ بلا قائمة بيضاء لم يضخّم شيئاً — القائمة غير مُختبَرة');

if (totalPlays > 0) ok(`أُحصي ${totalPlays} لعبة كارت عبر ${GAMES} مباراة`);
else bad('لم يُحصَ أي لعب — التجميع لا يعمل');

if (unknownCards === 0) ok('كل معرّف مُحصى موجود في الكتالوج');
else bad(`${unknownCards} معرّفاً غير معروف تسرّب إلى الحصيلة`);

// ---------- المفاتيح غير اللعبية لا تُحصى ----------
{
  const seat = 0;
  const log: LogEntry[] = [
    { turn: 1, side: seat, kind: 'play', key: 'summoned', params: { card: 'mon_fire_lahibo_1' } },
    { turn: 1, side: seat, kind: 'attack', key: 'monster_fell', params: { card: 'mon_fire_lahibo_1' } },
    { turn: 1, side: seat, kind: 'attack', key: 'ability_guard', params: { card: 'mon_water_muwaija_1' } },
    { turn: 1, side: seat, kind: 'play', key: 'revived', params: { card: 'mon_fire_nariks_1' } },
    { turn: 1, side: seat, kind: 'play', key: 'boosted', params: { card: 'mon_fire_lahibo_1' } },
    { turn: 1, side: seat, kind: 'play', key: 'bounced', params: { card: 'mon_grass_waraqi_1' } },
    { turn: 1, side: seat, kind: 'attack', key: 'venom_bite', params: { card: 'mon_dark_thilli_1' } },
  ];
  const t = advanceTally(emptyTally(), log, log.length, seat);
  const total = Object.values(t.cards).reduce((a, b) => a + b, 0);
  if (total === 1 && t.cards['mon_fire_lahibo_1'] === 1)
    ok('من 7 أسطر تحمل «card» يُحصى الاستدعاء وحده');
  else bad(`أُحصي ${total} بدل 1 — القائمة البيضاء لا تعمل: ${JSON.stringify(t.cards)}`);
}

// ---------- الكارت البري يُنسب إلى العنصر المختار ----------
{
  const log: LogEntry[] = [
    { turn: 1, side: 0, kind: 'play', key: 'played_wild', params: { card: 'act_wild', element: 'water' } },
  ];
  const t = advanceTally(emptyTally(), log, 1, 0);
  if (t.elements.water === 1 && !t.elements.wild)
    ok('الكارت البري يُنسب إلى العنصر الذي اختاره اللاعب');
  else bad(`العناصر: ${JSON.stringify(t.elements)} — المتوقّع water:1`);
}

// ---------- سطور الخصم لا تُحصى ----------
{
  const log: LogEntry[] = [
    { turn: 1, side: 0, kind: 'play', key: 'summoned', params: { card: 'mon_fire_lahibo_1' } },
    { turn: 1, side: 1, kind: 'play', key: 'summoned', params: { card: 'mon_fire_jamra_1' } },
    { turn: 1, side: 1, kind: 'play', key: 'titan_summon', params: {} },
    { turn: 1, side: 1, kind: 'play', key: 'trap_set', params: {} },
  ];
  const t = advanceTally(emptyTally(), log, 4, 0);
  if (Object.keys(t.cards).length === 1 && t.titans === 0 && t.trapsSet === 0)
    ok('سطور الخصم لا تدخل حصيلتك');
  else bad(`تسرّبت سطور الخصم: ${JSON.stringify(t)}`);
}

// ---------- الفخّ يُعدّ ولا يُنسب إلى كارت ----------
{
  const log: LogEntry[] = [
    { turn: 1, side: 0, kind: 'play', key: 'trap_set', params: { player: 'A' } },
    { turn: 1, side: 0, kind: 'play', key: 'trap_set', params: { player: 'A' } },
  ];
  const t = advanceTally(emptyTally(), log, 2, 0);
  if (t.trapsSet === 2 && Object.keys(t.cards).length === 0)
    ok('الفخاخ عدّاد منفصل ولا تدخل «أكثر الكروت» (هويّتها مخفيّة عمداً)');
  else bad(`الفخاخ: ${JSON.stringify(t)}`);
}

// ---------- مباراة جديدة تُصفّر الحصيلة ----------
{
  const first = advanceTally(emptyTally(), [
    { turn: 1, side: 0, kind: 'play', key: 'summoned', params: { card: 'mon_fire_lahibo_1' } },
  ], 12, 0);
  const restarted = advanceTally(first, [
    { turn: 1, side: 0, kind: 'play', key: 'summoned', params: { card: 'mon_water_tsuna_1' } },
  ], 1, 0);
  if (!restarted.cards['mon_fire_lahibo_1'] && restarted.cards['mon_water_tsuna_1'] === 1)
    ok('رجوع logSeq للوراء يُصفّر الحصيلة (مباراة جديدة)');
  else bad(`لم تُصفَّر: ${JSON.stringify(restarted.cards)}`);
}

// ---------- الحمولة المُرسَلة تحمل عنصر كل كارت ----------
{
  const t = advanceTally(emptyTally(), [
    { turn: 1, side: 0, kind: 'play', key: 'summoned', params: { card: 'mon_fire_lahibo_1' } },
    { turn: 1, side: 0, kind: 'play', key: 'summoned', params: { card: 'mon_fire_lahibo_1' } },
  ], 2, 0);
  const payload = tallyToPayload(t);
  if (payload['mon_fire_lahibo_1']?.plays === 2 && payload['mon_fire_lahibo_1']?.element === 'fire')
    ok('الحمولة تحمل العدد والعنصر');
  else bad(`الحمولة: ${JSON.stringify(payload)}`);
}

console.log(
  failures === 0
    ? '\n✓ الحصيلة تُحصي اللعب وحده، ولا تفقد شيئاً حين يُقصّ السجل.'
    : `\n✗ ${failures} مشكلة في الحصيلة.`
);
process.exit(failures > 0 ? 1 : 0);
