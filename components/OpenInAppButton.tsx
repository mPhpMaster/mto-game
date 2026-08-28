'use client';

import { isNativeApp } from '@/lib/chat/platform';
import { isAndroidMobileBrowser, openInNativeApp } from '@/lib/deep-link';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/** Mobile-web CTA to hand off the current path to the installed Android app. */
export default function OpenInAppButton({ path }: { path: string }) {
  const { t } = useLocale();

  if (isNativeApp() || !isAndroidMobileBrowser()) return null;

  return (
    <button
      type="button"
      onClick={() => openInNativeApp(path)}
      className="w-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/25"
    >
      {t('openInApp')}
    </button>
  );
}
