'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from './LanguageSwitch';
import MatchList, { type MatchRow } from './MatchList';
import { levelProgress } from '@/lib/player/level';
import type { Account } from '@/lib/social/types';

export default function LeaderboardScreen({
  matches,
  configured,
  errorMessage,
  account = null,
}: {
  matches: MatchRow[];
  configured: boolean;
  errorMessage: string | null;
  account?: Account | null;
}) {
  const { t } = useLocale();
  const decided = account ? account.wins + account.losses : 0;
  const winPct = decided ? Math.round((account!.wins / decided) * 100) : 0;

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

      {account && (
        <section className="panel mb-4 rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
              {levelProgress(account.wins).level}
            </span>
            <h2 className="text-sm font-black">{t('myHistory')}</h2>
            <Link href="/account" className="ms-auto text-[11px] underline opacity-70">
              {t('openAccount')}
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>
              {t('wins')} <b className="text-emerald-300">{account.wins}</b>
            </span>
            <span>
              {t('losses')} <b className="text-rose-300">{account.losses}</b>
            </span>
            <span className="opacity-70">{t('winRatePct', { pct: winPct })}</span>
            <span className="opacity-70">
              {t('matchesPlayed')} {account.matchesPlayed}
            </span>
          </div>
        </section>
      )}

      {account && <h2 className="mb-2 text-sm font-black opacity-70">{t('globalHistory')}</h2>}

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
