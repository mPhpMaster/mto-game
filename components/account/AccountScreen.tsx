'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from '@/lib/auth/actions';
import { primeAuth } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/useSession';
import { CARD_BY_ID, ELEMENT_ICON, ELEMENT_NAME } from '@/lib/game/cards';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { renderMessage } from '@/lib/i18n/messages';
import { levelProgress } from '@/lib/player/level';
import type { Account, MatchRecordRow, TopCard, TopElement } from '@/lib/social/types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/6 p-3 text-center">
      <div className="text-xl font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] opacity-60">{label}</div>
    </div>
  );
}

export default function AccountScreen({
  initialAccount,
  topCards,
  topElements,
  matches,
}: {
  initialAccount: Account;
  topCards: TopCard[];
  topElements: TopElement[];
  matches: MatchRecordRow[];
}) {
  const { t, L, locale } = useLocale();
  const router = useRouter();
  const { account } = useSession();

  useEffect(() => {
    primeAuth(initialAccount);
  }, [initialAccount]);

  const me = account ?? initialAccount;
  const progress = levelProgress(me.wins);
  const decided = me.wins + me.losses;
  const winPct = decided ? Math.round((me.wins / decided) * 100) : 0;
  const joined = new Date(me.createdAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const maxElement = Math.max(1, ...topElements.map((e) => e.plays));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{t('accountTitle')}</h1>
        <div className="flex gap-2">
          <Link href="/friends" className="panel rounded-lg px-3 py-1.5 text-xs font-bold">
            {t('openFriends')}
          </Link>
          <Link href="/" className="panel rounded-lg px-3 py-1.5 text-xs font-bold">
            {t('home')}
          </Link>
        </div>
      </header>

      <section className="panel mb-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-400 text-xl font-black tabular-nums text-black">
            {me.level}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black">{me.displayName}</div>
            <div className="truncate text-xs opacity-55">@{me.username}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
          >
            {t('signOut')}
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] opacity-65">
            <span>{t('levelLabel', { n: progress.level })}</span>
            <span>{t('levelProgress', { into: progress.into, need: progress.need })}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>

        <p className="mt-3 text-[11px] opacity-55">{t('memberSince', { date: joined })}</p>
      </section>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('winRatio')} value={`${me.wins} / ${me.losses}`} />
        <Stat label={t('winRatePct', { pct: winPct })} value={`${winPct}%`} />
        <Stat label={t('titanSummonsLabel')} value={me.titanSummons} />
        <Stat label={t('trapsSetLabel')} value={me.trapsSet} />
      </div>

      <section className="panel mb-3 rounded-2xl p-4">
        <h2 className="mb-1 text-sm font-black">{t('topCardsTitle')}</h2>
        <p className="mb-3 text-[11px] leading-relaxed opacity-55">{t('topCardsNote')}</p>
        {topCards.length === 0 ? (
          <p className="text-xs opacity-50">{t('noMatchesYet')}</p>
        ) : (
          <ul className="space-y-1.5">
            {topCards.map((c) => {
              const card = CARD_BY_ID[c.cardDefId];
              return (
                <li key={c.cardDefId} className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm">
                  <span>{ELEMENT_ICON[c.element]}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {card ? L(card.name) : c.cardDefId}
                  </span>
                  <span className="shrink-0 tabular-nums opacity-70">×{c.plays}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel mb-3 rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-black">{t('topElementsTitle')}</h2>
        {topElements.length === 0 ? (
          <p className="text-xs opacity-50">{t('noMatchesYet')}</p>
        ) : (
          <ul className="space-y-1.5">
            {topElements.map((e) => (
              <li key={e.element} className="flex items-center gap-2 text-sm">
                <span className="w-6 shrink-0">{ELEMENT_ICON[e.element]}</span>
                <span className="w-16 shrink-0 text-xs opacity-70">{L(ELEMENT_NAME[e.element])}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                  <span
                    className="block h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.round((e.plays / maxElement) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-end text-xs tabular-nums opacity-70">{e.plays}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-black">{t('myHistory')}</h2>
        {matches.length === 0 ? (
          <p className="text-xs opacity-50">{t('noMatchesYet')}</p>
        ) : (
          <ul className="space-y-1.5">
            {matches.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-xs"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-black ${
                    m.result === 'win' ? 'bg-emerald-500 text-black' : 'bg-rose-500/80 text-white'
                  }`}
                >
                  {m.result === 'win' ? L({ ar: 'فوز', en: 'Win' }) : L({ ar: 'خسارة', en: 'Loss' })}
                </span>
                <span className="min-w-0 flex-1 truncate opacity-80">
                  {m.opponents.length ? m.opponents.join(' · ') : L({ ar: 'الخصم الآلي', en: 'AI opponent' })}
                  {m.reason ? ` — ${renderMessage(m.reason, undefined, locale)}` : ''}
                </span>
                <span className="shrink-0 tabular-nums opacity-50">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
