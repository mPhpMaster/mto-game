/**
 * مستوى الحساب من عدد انتصاراته.
 *
 * **نسخة معكوسة عن `level_from_wins` في supabase/migrations/0002_accounts.sql.**
 * المصدر الموثوق هو القاعدة (عمود مولَّد مخزَّن)، وهذه النسخة لشريط التقدّم
 * وحده حتى لا نحتاج نداء شبكة لرسمه. يحرس تطابقهما `npm run check:level`.
 *
 * الانتقال من المستوى N إلى N+1 يكلّف 3N انتصاراً، فالتراكم 3·N·(N−1)/2:
 * المستوى 2 عند 3، و3 عند 9، و5 عند 30، و10 عند 135.
 */

export const WINS_PER_LEVEL_STEP = 3;

/** الرقم قد يصل من الشبكة، فقيمة فاسدة تعني «صفر انتصار» لا «المستوى NaN» */
function safeCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function levelFromWins(wins: number): number {
  const w = safeCount(wins);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * w) / WINS_PER_LEVEL_STEP)) / 2));
}

/** مجموع الانتصارات اللازمة لبلوغ المستوى المعطى */
export function winsForLevel(level: number): number {
  const n = Math.max(1, safeCount(level));
  return (WINS_PER_LEVEL_STEP * n * (n - 1)) / 2;
}

export interface LevelProgress {
  level: number;
  /** انتصارات داخل المستوى الحالي */
  into: number;
  /** انتصارات المستوى الحالي كاملاً */
  need: number;
  /** نسبة مئوية 0–100 لشريط التقدّم */
  pct: number;
}

export function levelProgress(wins: number): LevelProgress {
  const w = safeCount(wins);
  const level = levelFromWins(w);
  const base = winsForLevel(level);
  const next = winsForLevel(level + 1);
  const need = Math.max(1, next - base);
  const into = Math.min(need, w - base);
  return { level, into, need, pct: Math.round((into / need) * 100) };
}
