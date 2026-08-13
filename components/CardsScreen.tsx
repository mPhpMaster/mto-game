'use client';

import Link from 'next/link';
import CardsExplorer from '@/components/game/CardsExplorer';
import { CATALOG_BREAKDOWN, TOTAL_CARDS } from '@/lib/game/cards';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from './LanguageSwitch';

export default function CardsScreen() {
  const { t } = useLocale();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('catalogTitle')}</h1>
          <p className="text-xs opacity-60">
            {t('catalogCount', { total: TOTAL_CARDS, ...CATALOG_BREAKDOWN })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
            {t('menu')}
          </Link>
        </div>
      </div>
      <CardsExplorer />
    </div>
  );
}
