'use client';

import Link from 'next/link';
import { DIFFICULTIES, type Difficulty } from '@/lib/game/difficulty';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { renderMessage } from '@/lib/i18n/messages';

export interface MatchRow {
  id: string;
  seed: number;
  turns: number;
  winner: 'player' | 'ai';
  reason: string | null;
  player_hp: number;
  opponent_hp: number;
  difficulty: Difficulty | null;
  created_at: string;
}

export default function MatchList({ matches }: { matches: MatchRow[] }) {
  const { t, L, locale } = useLocale();
  const wins = matches.filter((m) => m.winner === 'player').length;

  return (
    <>
      <div className="panel mb-4 flex flex-wrap gap-6 rounded-2xl p-4 text-sm">
        <span>
          {t('wins')} <b className="text-emerald-300">{wins}</b>
        </span>
        <span>
          {t('losses')} <b className="text-rose-300">{matches.length - wins}</b>
        </span>
        <span className="opacity-70">{t('lastN', { n: matches.length })}</span>
      </div>

      {matches.length === 0 ? (
        <p className="panel rounded-2xl p-6 text-sm opacity-70">
          {t('noMatches')}{' '}
          <Link href="/play" className="underline">
            {t('startOne')}
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const level = DIFFICULTIES[m.difficulty ?? 'easy'];
            return (
              <div
                key={m.id}
                className={`panel flex flex-wrap items-center gap-3 rounded-xl p-3 text-xs ${
                  m.winner === 'player'
                    ? 'border-s-4 border-s-emerald-400'
                    : 'border-s-4 border-s-rose-400'
                }`}
              >
                <b className={m.winner === 'player' ? 'text-emerald-300' : 'text-rose-300'}>
                  {m.winner === 'player' ? t('win') : t('loss')}
                </b>
                <span className="rounded bg-white/10 px-1.5 py-0.5">
                  {level.short} {L(level.label)}
                </span>
                <span className="opacity-75">{t('turnsCount', { n: m.turns })}</span>
                <span className="opacity-75">
                  ❤ {m.player_hp} — {m.opponent_hp}
                </span>
                {/* السبب مخزَّن كمفتاح، فيُترجَم هنا بلغة القارئ */}
                {m.reason && (
                  <span className="opacity-60">{renderMessage(m.reason, undefined, locale)}</span>
                )}
                <Link
                  href={`/play?seed=${m.seed}&level=${m.difficulty ?? 'easy'}`}
                  className="ms-auto rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                  title={t('replayTip')}
                >
                  {t('replaySeed', { seed: m.seed })}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
