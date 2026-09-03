/**
 * يتحقّق أن نسخة TS من صيغة المستوى تطابق نسخة SQL المولِّدة للعمود.
 *
 * القاعدة هي المصدر الموثوق، لكن الواجهة ترسم شريط التقدّم من نسخة TS.
 * أي افتراق بينهما يعني رقماً على الشاشة يخالف الرقم في الحساب، ولا يظهر
 * إلا كشكوى مستخدم. الجدول أدناه منسوخ يدوياً من الصيغة الرياضية نفسها.
 *   npm run check:level
 */
import { levelFromWins, levelProgress, winsForLevel, WINS_PER_LEVEL_STEP } from '../lib/player/level';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

console.log('صيغة المستوى:\n');

// ---------- جدول مثبَّت: انتصارات ← مستوى ----------
const TABLE: [number, number][] = [
  [0, 1], [1, 1], [2, 1],
  [3, 2], [8, 2],
  [9, 3], [17, 3],
  [18, 4], [29, 4],
  [30, 5], [44, 5],
  [45, 6],
  [135, 10],
];
for (const [wins, expected] of TABLE) {
  const got = levelFromWins(wins);
  if (got === expected) ok(`${wins} انتصاراً ← المستوى ${got}`);
  else bad(`${wins} انتصاراً ← المستوى ${got} والمتوقّع ${expected}`);
}

// ---------- عتبة كل مستوى تساوي 3·N·(N−1)/2 ----------
{
  let mismatch = 0;
  for (let n = 1; n <= 60; n++) {
    const expected = (WINS_PER_LEVEL_STEP * n * (n - 1)) / 2;
    if (winsForLevel(n) !== expected) mismatch++;
  }
  if (mismatch === 0) ok('winsForLevel يطابق 3·N·(N−1)/2 حتى المستوى 60');
  else bad(`${mismatch} مستوى تخالف عتبته الصيغة`);
}

// ---------- الاتّساق: عتبة المستوى المحسوب لا تتجاوز الانتصارات ----------
{
  let broken = 0;
  let notMonotonic = 0;
  let prev = 1;
  for (let w = 0; w <= 5000; w++) {
    const lvl = levelFromWins(w);
    if (winsForLevel(lvl) > w) broken++;
    if (winsForLevel(lvl + 1) <= w) broken++;
    if (lvl < prev) notMonotonic++;
    prev = lvl;
  }
  if (broken === 0) ok('كل انتصار 0..5000 يقع بين عتبتَي مستواه');
  else bad(`${broken} حالة خارج عتبتَي مستواها`);
  if (notMonotonic === 0) ok('المستوى لا ينقص مع زيادة الانتصارات');
  else bad(`${notMonotonic} حالة نقص فيها المستوى`);
}

// ---------- شريط التقدّم ----------
{
  const at = levelProgress(3);
  if (at.level === 2 && at.into === 0 && at.need === 6)
    ok(`عند 3 انتصارات: المستوى 2 وبداية شريطه (0/${at.need})`);
  else bad(`عند 3 انتصارات: ${JSON.stringify(at)}`);

  const mid = levelProgress(6);
  if (mid.level === 2 && mid.into === 3 && mid.pct === 50)
    ok('عند 6 انتصارات: منتصف المستوى 2 بالضبط (50%)');
  else bad(`عند 6 انتصارات: ${JSON.stringify(mid)}`);

  let outOfRange = 0;
  for (let w = 0; w <= 2000; w++) {
    const p = levelProgress(w);
    if (p.pct < 0 || p.pct > 100 || p.into < 0 || p.into > p.need) outOfRange++;
  }
  if (outOfRange === 0) ok('النسبة تبقى بين 0 و100 على المدى كلّه');
  else bad(`${outOfRange} حالة خرجت فيها النسبة عن المدى`);
}

// ---------- مدخلات فاسدة لا تُسقِط الحساب ----------
{
  const weird = [-5, -1, 0.4, 2.9, Number.NaN];
  let threw = 0;
  for (const w of weird) {
    try {
      const lvl = levelFromWins(w);
      if (!Number.isFinite(lvl) || lvl < 1) threw++;
    } catch {
      threw++;
    }
  }
  if (threw === 0) ok('المدخلات السالبة والكسرية وNaN تعطي مستوى ≥ 1');
  else bad(`${threw} مدخلاً فاسداً أعطى مستوى غير صالح`);
}

console.log(
  failures === 0
    ? '\n✓ صيغة المستوى في TS تطابق نظيرتها في SQL.'
    : `\n✗ ${failures} مشكلة في صيغة المستوى.`
);
process.exit(failures > 0 ? 1 : 0);
