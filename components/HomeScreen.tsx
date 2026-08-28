'use client';

import Link from 'next/link';
import {
  ABILITY_NAME,
  ABILITY_TEXT,
  CATALOG_BREAKDOWN,
  TITAN,
  TOTAL_CARDS,
} from '@/lib/game/cards';
import type { Ability } from '@/lib/game/types';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '@/lib/game/difficulty';
import { RULES } from '@/lib/game/engine';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { UIKey } from '@/lib/i18n/ui';
import LanguageSwitch from './LanguageSwitch';
import SoundToggle from './SoundToggle';

const ABILITY_LIST: Ability[] = [
  'rush',
  'charge',
  'guard',
  'pierce',
  'drain',
  'link',
  'scout',
  'venom',
];

export default function HomeScreen() {
  const { t, L } = useLocale();

  const rules: { icon: string; title: UIKey; body: string }[] = [
    {
      icon: '🃏',
      title: 'ruleDeckTitle',
      body: t('ruleDeckBody', { total: TOTAL_CARDS, ...CATALOG_BREAKDOWN }),
    },
    {
      icon: '✋',
      title: 'ruleTurnTitle',
      body: t('ruleTurnBody', { hand: RULES.START_HAND, hp: RULES.START_HP }),
    },
    {
      icon: '⚡',
      title: 'ruleEnergyTitle',
      body: t('ruleEnergyBody', {
        start: RULES.START_ENERGY_CAP,
        max: RULES.MAX_ENERGY_CAP,
      }),
    },
    { icon: '🎨', title: 'ruleMatchTitle', body: t('ruleMatchBody') },
    {
      icon: '💥',
      title: 'ruleComboTitle',
      body: t('ruleComboBody', { bonus: RULES.COMBO_BONUS_PER_EXTRA, field: RULES.MAX_FIELD }),
    },
    { icon: '🕸️', title: 'ruleTrapTitle', body: t('ruleTrapBody') },
    {
      icon: '🗿',
      title: 'ruleTitanTitle',
      body: t('ruleTitanBody', { text: L(TITAN.text), cost: TITAN.cost }),
    },
    { icon: '🏁', title: 'ruleWinTitle', body: t('ruleWinBody') },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-4 flex items-center justify-end gap-2">
        <SoundToggle />
        <LanguageSwitch />
      </div>

      <header className="mb-10 text-center">
        <div className="mb-3 text-6xl">⚔️🗿</div>
        <h1 className="text-4xl font-black sm:text-5xl">{t('appName')}</h1>
        <p className="mt-2 text-sm opacity-70">{t('tagline')}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/tutorial"
            className="glow-pulse rounded-xl bg-amber-400 px-7 py-3 text-lg font-black text-black transition hover:scale-105 hover:bg-amber-300"
          >
            {t('learnFirst')}
          </Link>
          <Link
            href="/arcade"
            className="rounded-xl bg-gradient-to-l from-sky-500 to-fuchsia-500 px-7 py-3 text-lg font-black text-white transition hover:scale-105"
          >
            🕹️ {L({ ar: 'وضع البقاء 2D', en: '2D Survival Mode' })}
          </Link>
          <Link
            href="/arcade3d"
            className="rounded-xl bg-gradient-to-l from-fuchsia-500 to-emerald-500 px-7 py-3 text-lg font-black text-white transition hover:scale-105"
          >
            🎮 {L({ ar: 'وضع البقاء 3D', en: '3D Survival Mode' })}
          </Link>
        </div>
        <p className="mt-3 text-xs opacity-55">{t('firstTimeHint')}</p>

        <div className="panel mx-auto mt-6 max-w-2xl rounded-2xl p-4">
          <div className="mb-3 text-sm font-black">{t('chooseLevel')}</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((id) => {
              const d = DIFFICULTIES[id];
              const isDefault = id === DEFAULT_DIFFICULTY;
              return (
                <Link
                  key={id}
                  href={`/play?level=${id}`}
                  className={`rounded-xl p-3 text-start transition hover:scale-[1.03] ${
                    isDefault ? 'bg-emerald-500 text-black' : 'bg-white/8 hover:bg-white/15'
                  }`}
                >
                  <div className="text-lg font-black">
                    {d.short} {L(d.label)}
                    {isDefault && <span className="ms-1 text-[10px]">{t('recommended')}</span>}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] leading-snug ${
                      isDefault ? 'text-black/70' : 'opacity-65'
                    }`}
                  >
                    {L(d.description)}
                  </div>
                  <div className={`mt-1 text-[10px] ${isDefault ? 'text-black/60' : 'opacity-50'}`}>
                    {t('aiHpCap', { hp: d.aiHp, cap: d.aiMaxEnergyCap })}
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] opacity-55">{t('coinNote')}</p>
        </div>

        <div className="panel mx-auto mt-4 max-w-2xl rounded-2xl p-4">
          <div className="mb-3 text-sm font-black">{t('playFriend')}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/vs"
              className="rounded-xl bg-sky-500/85 p-3 text-start text-black transition hover:scale-[1.03] hover:bg-sky-400"
            >
              <div className="text-lg font-black">{t('onlineTitle')}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-black/70">{t('onlineDesc')}</div>
            </Link>
            <Link
              href="/local"
              className="rounded-xl bg-white/8 p-3 text-start transition hover:scale-[1.03] hover:bg-white/15"
            >
              <div className="text-lg font-black">{t('localTitle')}</div>
              <div className="mt-0.5 text-[11px] leading-snug opacity-65">{t('localDesc')}</div>
            </Link>
          </div>
        </div>

        <div className="panel mx-auto mt-4 max-w-2xl rounded-2xl p-4">
          <div className="mb-3 text-sm font-black">{t('installTitle')}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href="/download/mto-game.apk"
              download
              className="rounded-xl bg-emerald-600/85 p-3 text-start transition hover:scale-[1.03] hover:bg-emerald-500"
            >
              <div className="text-lg font-black">{t('downloadApk')}</div>
              <div className="mt-0.5 text-[11px] leading-snug opacity-80">{t('downloadApkDesc')}</div>
            </a>
            <div className="rounded-xl bg-white/8 p-3 text-start">
              <div className="text-lg font-black">{t('addToHome')}</div>
              <div className="mt-0.5 text-[11px] leading-snug opacity-65">{t('addToHomeDesc')}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/guide"
            className="rounded-xl bg-amber-400/90 px-5 py-2 text-sm font-black text-black transition hover:scale-105 hover:bg-amber-300"
          >
            {t('openGuide')}
          </Link>
          <Link href="/cards" className="panel rounded-xl px-5 py-2 text-sm font-bold transition hover:scale-105">
            {t('browseCards')}
          </Link>
          <Link href="/leaderboard" className="panel rounded-xl px-5 py-2 text-sm font-bold transition hover:scale-105">
            {t('history')}
          </Link>
        </div>
      </header>

      {/* شرح خصائص الوحوش — الكلمة وحدها لا تكفي */}
      <section className="panel mb-3 rounded-2xl p-4">
        <h2 className="mb-1 font-black">{t('abilitiesTitle')}</h2>
        <p className="mb-3 text-[12px] leading-relaxed opacity-70">{t('abilitiesIntro')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ABILITY_LIST.map((a) => (
            <div key={a} className="rounded-xl bg-white/6 p-2.5">
              <div className="text-[13px] font-black text-emerald-300">{L(ABILITY_NAME[a])}</div>
              <div className="mt-0.5 text-[12px] leading-relaxed opacity-75">
                {L(ABILITY_TEXT[a])}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {rules.map((r) => (
          <section key={r.title} className="panel rounded-2xl p-4">
            <h2 className="mb-1 flex items-center gap-2 font-black">
              <span className="text-xl">{r.icon}</span>
              {t(r.title)}
            </h2>
            <p className="text-[13px] leading-relaxed opacity-75">{r.body}</p>
          </section>
        ))}
      </div>

      <footer className="mt-10 text-center text-[11px] opacity-40">{t('footerNote')}</footer>
    </div>
  );
}
