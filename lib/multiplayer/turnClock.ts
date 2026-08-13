/** خيارات مدّة الجولة في اللعب الجماعي */
export const TURN_SECONDS_OPTIONS = [30, 60, 90, 120] as const;
export const MIN_TURN_SECONDS = 30;
export const DEFAULT_TURN_SECONDS = 60;

export function parseTurnSeconds(raw: string | undefined | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_TURN_SECONDS;
  // أقلّ من 30 ثانية لا يكفي لقراءة اللوحة والتخطيط
  return Math.max(MIN_TURN_SECONDS, Math.min(600, Math.round(n)));
}
