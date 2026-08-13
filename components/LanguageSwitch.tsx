'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { LOCALES, LOCALE_META } from '@/lib/i18n/locale';

export default function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg ring-1 ring-white/15"
      role="group"
      aria-label={t('language')}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          lang={l}
          className={`px-2.5 py-1 text-xs font-bold transition ${
            locale === l ? 'bg-emerald-500 text-black' : 'bg-white/8 hover:bg-white/18'
          }`}
        >
          {compact ? LOCALE_META[l].short : LOCALE_META[l].label}
        </button>
      ))}
    </div>
  );
}
