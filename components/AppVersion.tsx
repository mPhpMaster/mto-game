import { APP_VERSION } from '@/lib/version';

/** شارة الإصدار — تظهر في أسفل كل صفحة (الموقع وتطبيق الويب داخل الكاباسيتور). */
export default function AppVersion() {
  return (
    <p
      className="pointer-events-none mt-auto shrink-0 py-2 text-center text-[10px] tabular-nums opacity-30"
      aria-label={`الإصدار ${APP_VERSION}`}
    >
      v{APP_VERSION}
    </p>
  );
}
