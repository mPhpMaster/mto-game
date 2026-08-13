'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from './LanguageSwitch';
import MatchList, { type MatchRow } from './MatchList';

export default function LeaderboardScreen({
  matches,
  configured,
  errorMessage,
}: {
  matches: MatchRow[];
  configured: boolean;
  errorMessage: string | null;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{t('historyTitle')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
            {t('menu')}
          </Link>
        </div>
      </div>

      {!configured ? (
        <div className="panel rounded-2xl p-6 text-sm leading-relaxed">
          <p className="mb-3 font-bold">{t('dbNotConfigured')}</p>
          {errorMessage && (
            <p className="mb-3 rounded bg-rose-500/15 p-2 text-xs text-rose-200">{errorMessage}</p>
          )}
          <p className="opacity-75">
            {t('dbHint')}{' '}
            <code className="rounded bg-black/40 px-1">supabase/migrations/0001_init.sql</code>
          </p>
          <pre
            className="thin-scroll mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-left text-xs"
            dir="ltr"
          >
{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`}
          </pre>
        </div>
      ) : (
        <MatchList matches={matches} />
      )}
    </div>
  );
}
