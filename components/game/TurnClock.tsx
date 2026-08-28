'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/** عدّاد تنازلي لمهلة الجولة. يعرض الثواني ويحمرّ في آخر عشر. */
export default function TurnClock({
  deadline,
  seconds,
  isMyTurn,
}: {
  deadline: number | null;
  seconds: number;
  isMyTurn: boolean;
}) {
  const { t } = useLocale();
  const [now, setNow] = useState(() => Date.now());

  // تحديث كل نصف ثانية يكفي لعدّاد بالثواني ولا يُرهق إعادة الرسم
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (deadline === null) return null;

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const urgent = left <= 10;
  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));

  return (
    <span
      data-turn-clock
      data-left={left}
      className={`flex items-center gap-1.5 rounded px-2 py-0.5 font-black tabular-nums ${
        urgent ? 'bg-rose-500/30 text-rose-100' : 'bg-white/10'
      } ${urgent && isMyTurn ? 'animate-pulse' : ''}`}
      title={t('turnClockTip', { n: seconds })}
    >
      ⏱ {left}
      <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-black/40 sm:block">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${
            urgent ? 'bg-rose-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
