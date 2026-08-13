'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function OfflineScreen() {
  const { t } = useLocale();
  return (
    <div className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-4">
      <div className="panel rounded-2xl p-6 text-center">
        <div className="text-5xl">📴</div>
        <h1 className="mt-3 text-2xl font-black">{t('offlineTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-70">{t('offlineBody')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/play" className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-black">
            {t('quickMatch')}
          </Link>
          <Link href="/local" className="rounded-lg bg-white/15 px-4 py-2 font-bold">
            {t('localTitle')}
          </Link>
          <Link href="/tutorial" className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-black">
            {t('tutorial')}
          </Link>
        </div>
      </div>
    </div>
  );
}
