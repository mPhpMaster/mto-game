'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { createGame } from '@/lib/game/engine';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '@/components/LanguageSwitch';
import GameBoard from './GameBoard';

export default function HotseatGame({ turnSeconds }: { turnSeconds?: number }) {
  const { t } = useLocale();
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [started, setStarted] = useState(false);

  const makeGame = useCallback(
    () =>
      createGame({
        playerName: names[0].trim() || t('playerOneName'),
        opponentName: names[1].trim() || t('playerTwoName'),
        opponentIsAI: false,
        difficulty: 'hard',
      }),
    [names, t]
  );

  if (!started) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">{t('hotseatTitle')}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitch compact />
            <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
              {t('menu')}
            </Link>
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <p className="mb-4 text-sm leading-relaxed opacity-75">
{t('hotseatIntro')}
          </p>

          <div className="space-y-3">
            {([0, 1] as const).map((i) => (
              <label key={i} className="block">
                <span className="mb-1 block text-xs opacity-70">
                  {t('playerNameLabel', {
                    which: i === 0 ? t('playerOneName') : t('playerTwoName'),
                  })}
                </span>
                <input
                  value={names[i]}
                  maxLength={16}
                  placeholder={i === 0 ? t('playerOneName') : t('playerTwoName')}
                  onChange={(e) =>
                    setNames((n) => (i === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))
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
          <p className="mt-3 text-[11px] opacity-55">
{t('hotseatCoin')}
          </p>
        </div>
      </div>
    );
  }

  return <GameBoard hotseat makeGame={makeGame} turnSeconds={turnSeconds} />;
}
