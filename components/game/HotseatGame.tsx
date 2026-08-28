'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { createGame } from '@/lib/game/engine';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '@/components/LanguageSwitch';
import GameBoard from './GameBoard';

const LABELS = ['playerOneName', 'playerTwoName', 'playerThreeName'] as const;

export default function HotseatGame({
  turnSeconds,
  playerCount = 2,
}: {
  turnSeconds?: number;
  playerCount?: number;
}) {
  const { t } = useLocale();
  const seats = playerCount >= 3 ? 3 : 2;
  const [names, setNames] = useState<string[]>(() => Array.from({ length: seats }, () => ''));
  const [started, setStarted] = useState(false);

  const fallback = (i: number) => t(LABELS[i] ?? 'playerThreeName');

  const makeGame = useCallback(
    () =>
      createGame({
        playerName: names[0]?.trim() || fallback(0),
        opponentName: names[1]?.trim() || fallback(1),
        opponentIsAI: false,
        difficulty: 'hard',
        playerCount: seats,
        roster: Array.from({ length: seats }, (_, i) => ({
          name: names[i]?.trim() || fallback(i),
          isAI: false,
        })),
      }),
    // t يتغيّر مع اللغة فيُعاد إنشاء المباراة بأسماء مترجمة قبل البدء
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [names, t, seats]
  );

  if (!started) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">{seats > 2 ? t('hotseatTitle3') : t('hotseatTitle')}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitch compact />
            <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
              {t('menu')}
            </Link>
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <p className="mb-4 text-sm leading-relaxed opacity-75">
            {seats > 2 ? t('hotseatIntro3') : t('hotseatIntro')}
          </p>

          <div className="space-y-3">
            {Array.from({ length: seats }, (_, i) => (
              <label key={i} className="block">
                <span className="mb-1 block text-xs opacity-70">
                  {t('playerNameLabel', { which: fallback(i) })}
                </span>
                <input
                  value={names[i] ?? ''}
                  maxLength={16}
                  placeholder={fallback(i)}
                  onChange={(e) =>
                    setNames((n) => {
                      const next = n.slice();
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className="w-full rounded-lg bg-black/40 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-emerald-400"
                />
              </label>
            ))}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-black hover:bg-emerald-400"
          >
            {t('startGame')}
          </button>
          <p className="mt-3 text-[11px] opacity-55">{t('hotseatCoin')}</p>
        </div>
      </div>
    );
  }

  return <GameBoard hotseat makeGame={makeGame} turnSeconds={turnSeconds} playerCount={seats} />;
}
