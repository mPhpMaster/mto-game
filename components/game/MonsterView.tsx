'use client';

import { ABILITY_NAME, ELEMENT_ICON, def } from '@/lib/game/cards';
import type { FieldMonster } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { ELEMENT_HEX } from './CardView';

interface Props {
  monster: FieldMonster;
  selected?: boolean;
  ready?: boolean;
  targetable?: boolean;
  onClick?: () => void;
  /** انزلاق نحو الهدف ثم عودة */
  strike?: { dx: number; dy: number } | null;
  /** وميض الاصطدام على المدافع */
  hit?: boolean;
}

export default function MonsterView({
  monster,
  selected,
  ready,
  targetable,
  onClick,
  strike,
  hit,
}: Props) {
  const { t, L } = useLocale();
  const d = def(monster.defId);
  const color = ELEMENT_HEX[d.element];
  const hpPct = Math.max(0, Math.round((monster.hp / monster.maxHp) * 100));
  const status = monster.sick ? t('fresh') : monster.exhausted ? t('exhausted') : t('ready');
  const label = t('monsterAria', {
    name: L(d.name),
    atk: monster.atk,
    hp: monster.hp,
    maxHp: monster.maxHp,
    status,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={label}
      aria-label={label}
      className={[
        'relative w-[104px] rounded-xl p-2 text-right',
        strike || hit ? '' : 'transition-all',
        strike ? 'strike-lunge' : hit ? 'hit-impact' : 'pop-in',
        onClick ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default',
        selected ? 'ring-2 ring-white -translate-y-1' : '',
        ready && !selected ? 'ring-1 ring-emerald-400/70' : '',
        targetable ? 'ring-2 ring-rose-400 glow-pulse' : '',
        !strike && (monster.exhausted || monster.sick) ? 'opacity-60' : '',
      ].join(' ')}
      style={{
        background: `linear-gradient(160deg, ${color}44 0%, rgba(10,12,24,0.95) 70%)`,
        border: `1px solid ${color}70`,
        ...(strike
          ? ({
              '--dx': `${strike.dx}px`,
              '--dy': `${strike.dy}px`,
              '--rot': strike.dx > 0 ? '8deg' : '-8deg',
            } as React.CSSProperties)
          : {}),
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg leading-none">{ELEMENT_ICON[d.element]}</span>
        {monster.sick ? (
          <span className="rounded bg-amber-400/25 px-1 text-[8px] text-amber-200">{t('fresh')}</span>
        ) : monster.exhausted ? (
          <span className="rounded bg-white/15 px-1 text-[8px] opacity-80">{t('exhausted')}</span>
        ) : (
          <span className="rounded bg-emerald-400/25 px-1 text-[8px] text-emerald-200">{t('ready')}</span>
        )}
      </div>

      <div className="mt-1 truncate text-[11px] font-bold leading-tight">{L(d.name)}</div>

      {d.ability && d.ability !== 'none' && (
        <div className="truncate text-[8px]" style={{ color }}>
          {L(ABILITY_NAME[d.ability])}
        </div>
      )}

      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/50">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${hpPct}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] font-black">
        <span className="text-orange-300">⚔ {monster.atk}</span>
        <span className="text-emerald-300">
          ❤ {monster.hp}/{monster.maxHp}
        </span>
      </div>
    </button>
  );
}
