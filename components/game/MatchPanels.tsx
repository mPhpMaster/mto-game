'use client';

import { useEffect, useRef } from 'react';
import { ABILITY_NAME, ABILITY_TEXT, ELEMENT_ICON, ELEMENT_NAME, ELEMENTS, KIND_NAME, TITAN, def } from '@/lib/game/cards';
import { ARCHETYPE_PASSIVE, archetypeOf } from '@/lib/game/archetypes';
import { GEAR_BY_ID, type WeatherId } from '@/lib/game/loadout';
import { atkOf, strikeOf } from '@/lib/game/loadoutEffects';
import type { FieldMonster, GameState, LogEntry, PlayerState, Seat } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Effigy } from './ArenaArt';
import { ELEMENT_HEX, numberLabel } from './CardView';
import { GearIcon } from './LoadoutArt';

/**
 * لوحات المعلومات حول الساحة. كلّها تقرأ الحالة فقط — لا زرّ هنا يغيّر
 * المباراة إلا «الهجوم المباشر» على بطاقة الخصم، وهو يُمرَّر من الخارج.
 *
 * ترتيب الوزن البصري مقصود: الحياة والتدفق أكبر ما في الشاشة لأنهما ما
 * يُقرأ قبل كل قرار، ثم الطاقة، ثم ما سواها بخطٍّ أصغر.
 */

// ===================== بطاقة لاعب =====================

export function SideCard({
  state,
  face,
  you = false,
  current = false,
  impact = 0,
  compact = false,
  onFaceClick,
}: {
  state: PlayerState;
  face: string;
  you?: boolean;
  current?: boolean;
  impact?: number;
  compact?: boolean;
  onFaceClick?: () => void;
}) {
  const { t, name: pn } = useLocale();
  const hpPct = Math.max(0, Math.round((state.hp / Math.max(1, state.maxHp)) * 100));
  const accent = you ? '#38bdf8' : '#e879f9';
  const pips = Math.min(10, Math.max(state.energyCap, state.energy));
  const name = pn(state.name);
  const statuses = [
    state.skipNext && { text: t('willLoseTurn'), cls: 'bg-rose-500/25 text-rose-200' },
    state.attackLocked && { text: t('netted'), cls: 'bg-fuchsia-500/25 text-fuchsia-200' },
    state.barrier && { text: t('barrierOn'), cls: 'bg-sky-500/25 text-sky-200' },
    state.mirror && { text: t('mirrorOn'), cls: 'bg-purple-500/25 text-purple-200' },
    state.amplified && { text: t('amplifiedOn'), cls: 'bg-amber-500/25 text-amber-200' },
  ].filter(Boolean) as Array<{ text: string; cls: string }>;

  return (
    <div
      data-face={face}
      data-current={current ? '1' : undefined}
      role={onFaceClick ? 'button' : undefined}
      tabIndex={onFaceClick ? 0 : undefined}
      onClick={onFaceClick}
      onKeyDown={
        onFaceClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFaceClick();
              }
            }
          : undefined
      }
      className={`hud-panel relative flex min-w-0 items-center gap-2 rounded-2xl p-1.5 pe-2.5 transition-shadow ${
        current ? 'shadow-[0_0_20px_rgba(52,211,153,0.28)] ring-1 ring-emerald-300/60' : ''
      } ${onFaceClick ? 'glow-pulse cursor-pointer ring-2 ring-orange-400' : ''} ${
        state.eliminated ? 'opacity-55' : ''
      }`}
    >
      {/* شارة بدل صورة: لا صور لاعبين في البيانات، والحرف الأول يكفي للتمييز */}
      <div
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-xl font-black ${
          compact ? 'size-10 text-base' : 'size-11 text-lg sm:size-14 sm:text-2xl'
        }`}
        style={{
          background: `linear-gradient(145deg, ${accent}66, #0b0d1a 72%)`,
          boxShadow: `inset 0 0 0 1.5px ${accent}bb, 0 0 14px ${accent}44`,
        }}
      >
        {name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-black sm:text-sm">{name}</span>
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${current ? 'animate-pulse bg-emerald-400' : 'bg-white/25'}`}
          />
          {state.eliminated && (
            <span className="rounded bg-white/10 px-1 text-[10px] font-bold opacity-70">{t('eliminatedTag')}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-rose-400">❤</span>
          <b className={`leading-none tabular-nums ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>{state.hp}</b>
          <div className="h-2 min-w-6 flex-1 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hpPct > 50
                  ? 'bg-gradient-to-l from-emerald-300 to-emerald-600'
                  : hpPct > 25
                    ? 'bg-gradient-to-l from-amber-300 to-amber-600'
                    : 'bg-gradient-to-l from-rose-400 to-rose-700'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
          <span className="font-black tabular-nums text-yellow-300">
            ⚡ {state.energy}/{state.energyCap}
          </span>
          {!compact && (
            <span aria-hidden className="hidden items-center gap-[3px] sm:flex">
              {Array.from({ length: pips }, (_, i) => (
                <span
                  key={i}
                  className={`size-[7px] rounded-full ${
                    i < state.energy ? 'bg-yellow-300 shadow-[0_0_5px_#fde047]' : 'bg-white/10 ring-1 ring-white/20'
                  }`}
                />
              ))}
            </span>
          )}
          <span className="ms-auto flex shrink-0 items-center gap-1.5 opacity-85">
            <span title={t('yourHand', { n: state.hand.length })}>🃏{state.hand.length}</span>
            <span
              className={state.fragments.length >= TITAN.fragmentsNeeded ? 'font-black text-amber-300' : ''}
              title={t('noFragments')}
            >
              🗿{state.fragments.length}/{TITAN.fragmentsNeeded}
            </span>
          </span>
        </div>

        {statuses.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
            {statuses.map((s) => (
              <span key={s.text} className={`rounded px-1.5 ${s.cls}`}>
                {s.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {impact > 0 && (
        <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-2xl font-black text-rose-300 [text-shadow:0_2px_6px_#000]">
          −{impact}
        </span>
      )}
    </div>
  );
}

// ===================== التدفق =====================

/** أوضح ما في الشريط العلوي: العنصر والرقم اللذان يحدّدان كل حركة */
export function FlowBadge({ flow }: { flow: GameState['flow'] }) {
  const { t, L } = useLocale();
  const color = ELEMENT_HEX[flow.element];
  const d = flow.defId ? def(flow.defId) : null;
  return (
    <div
      key={`${flow.element}-${flow.defId ?? ''}`}
      className="pop-in flex items-center justify-center gap-2.5 rounded-2xl px-4 py-1.5"
      style={{
        background: `linear-gradient(180deg, ${color}38, rgba(10,10,18,0.92))`,
        boxShadow: `inset 0 0 0 1.5px ${color}, 0 0 24px ${color}66`,
      }}
      title={t('matchHint')}
    >
      <span className="text-3xl leading-none drop-shadow-[0_0_8px_rgba(0,0,0,0.6)] sm:text-4xl">
        {ELEMENT_ICON[flow.element]}
      </span>
      <div className="leading-none">
        <div className="text-[9px] font-bold tracking-[0.2em] text-white/60">{t('flowLabel')}</div>
        <div className="mt-1 whitespace-nowrap text-lg font-black sm:text-2xl" style={{ color }}>
          {L(ELEMENT_NAME[flow.element])} · {d ? numberLabel(d) : '—'}
        </div>
      </div>
    </div>
  );
}

// ===================== تفاصيل وحش =====================

export function MonsterInfo({
  m,
  weather,
  withArt = false,
}: {
  m: FieldMonster;
  weather: WeatherId | null;
  withArt?: boolean;
}) {
  const { t, L } = useLocale();
  const d = def(m.defId);
  const color = ELEMENT_HEX[d.element];
  const geared = atkOf(m);
  const struck = strikeOf(m, weather);
  const passive = ARCHETYPE_PASSIVE[archetypeOf(d.species) ?? 'beast'];
  const status = m.sick ? t('fresh') : m.exhausted ? t('exhausted') : t('ready');
  return (
    <div className="text-[11px] leading-snug">
      <div className="flex items-center gap-2">
        {withArt && (
          <div
            className="grid size-16 shrink-0 place-items-center rounded-xl"
            style={{
              background: `radial-gradient(circle at 50% 60%, ${color}55, #0b0d1a 72%)`,
              boxShadow: `inset 0 0 0 1px ${color}99`,
            }}
          >
            <Effigy m={m} className="h-14 w-14" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <b className="truncate text-sm">{L(d.name)}</b>
            <span
              className={`shrink-0 rounded px-1.5 text-[10px] font-bold ${
                m.sick || m.exhausted ? 'bg-white/10 text-white/70' : 'bg-emerald-500/25 text-emerald-200'
              }`}
            >
              {status}
            </span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
            {ELEMENT_ICON[d.element]} {L(ELEMENT_NAME[d.element])} · {L(KIND_NAME[d.kind])}
          </div>
          <div className="mt-1 flex items-center gap-3 text-base font-black">
            <span className="text-orange-300">⚔ {struck !== geared ? `${geared}→${struck}` : struck}</span>
            <span className="text-emerald-300">
              ❤ {m.hp}/{m.maxHp}
            </span>
            {(m.poison ?? 0) > 0 && <span className="text-[11px] text-lime-300">☠ {m.poison}</span>}
          </div>
        </div>
      </div>
      {d.ability && d.ability !== 'none' && (
        <p className="mt-1.5 rounded-lg bg-white/5 px-2 py-1">
          <b style={{ color }}>{L(ABILITY_NAME[d.ability])}</b> — {L(ABILITY_TEXT[d.ability])}
        </p>
      )}
      <p className="mt-1 rounded-lg bg-white/5 px-2 py-1 opacity-80">
        <b>{L(passive.name)}</b> — {L(passive.text)}
      </p>
      {(m.gear?.length ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {m.gear!.map((id, k) => (
            <span key={`${id}-${k}`} className="flex items-center gap-0.5 rounded bg-white/5 pe-1">
              <GearIcon id={id} size={18} /> {L(GEAR_BY_ID[id].name)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 border-b border-white/10 pb-1.5 text-[13px] font-black">{children}</h3>;
}

export function MonsterDetails({ m, weather }: { m: FieldMonster | null; weather: WeatherId | null }) {
  const { t } = useLocale();
  return (
    <section className="hud-panel rounded-2xl p-2.5">
      <PanelTitle>{t('monsterDetails')}</PanelTitle>
      {m ? (
        <MonsterInfo m={m} weather={weather} withArt />
      ) : (
        <p className="py-3 text-center text-[11px] opacity-60">{t('monsterDetailsEmpty')}</p>
      )}
    </section>
  );
}

// ===================== حالة الساحة =====================

export function BoardStatus({ player }: { player: PlayerState }) {
  const { t } = useLocale();
  const ready = player.field.filter((m) => !m.sick && !m.exhausted).length;
  const rows: Array<[string, string]> = [
    [t('statMonsters'), `${player.field.length}/6`],
    [t('statTraps'), `${player.traps.length}/4`],
    [t('statReady'), String(player.attackLocked ? 0 : ready)],
    [t('statSpent'), String(player.field.length - ready)],
  ];
  return (
    <section className="hud-panel rounded-2xl p-2.5">
      <PanelTitle>{t('boardStatus')}</PanelTitle>
      <dl className="space-y-1 text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="opacity-70">{k}</dt>
            <dd className="font-black tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ===================== العناصر والدليل =====================

export function ElementLegend() {
  const { t, L } = useLocale();
  return (
    <section className="hud-panel rounded-2xl p-2.5">
      <PanelTitle>{t('elementsTitle')}</PanelTitle>
      <ul className="space-y-1.5">
        {ELEMENTS.map((el) => (
          <li key={el} className="flex items-center gap-2 text-[12px] font-bold">
            <span
              className="grid size-7 place-items-center rounded-full text-sm"
              style={{
                background: `radial-gradient(circle, ${ELEMENT_HEX[el]}55, #0b0d1a 75%)`,
                boxShadow: `inset 0 0 0 1.5px ${ELEMENT_HEX[el]}, 0 0 10px ${ELEMENT_HEX[el]}55`,
              }}
            >
              {ELEMENT_ICON[el]}
            </span>
            {L(ELEMENT_NAME[el])}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug opacity-60">{t('matchHint')}</p>
    </section>
  );
}

export function QuickGuide() {
  const { t } = useLocale();
  return (
    <section className="hud-panel rounded-2xl p-2.5">
      <PanelTitle>{t('quickGuideTitle')}</PanelTitle>
      <ul className="list-disc space-y-1 ps-4 text-[11px] leading-snug opacity-80">
        <li>{t('guideTap')}</li>
        <li>{t('guideHold')}</li>
        <li>{t('guideTarget')}</li>
      </ul>
    </section>
  );
}

// ===================== سجل المعارك =====================

const LOG_ICON: Record<LogEntry['kind'], string> = {
  play: '🃏',
  attack: '⚔️',
  trap: '🪤',
  system: '•',
  win: '🏆',
};

export function BattleLog({
  entries,
  me,
  onClose,
}: {
  entries: LogEntry[];
  me: Seat;
  onClose: () => void;
}) {
  const { t, logText } = useLocale();
  const box = useRef<HTMLDivElement>(null);
  // يمرّر الصندوق وحده لا الصفحة: scrollIntoView كان يقفز بالصفحة كلّها على الهاتف
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className="hud-panel rounded-2xl p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <h3 className="text-[13px] font-black">{t('logTitle')}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold hover:bg-white/20"
        >
          {t('hideLog')}
        </button>
      </div>
      <div
        ref={box}
        className="thin-scroll max-h-[40vh] space-y-1 overflow-y-auto pe-1 text-[11px] leading-snug xl:max-h-[calc(100vh-24rem)]"
      >
        {entries.map((l, i) => (
          <div
            key={i}
            className={`flex gap-2 rounded-lg px-2 py-1.5 ${
              l.kind === 'win'
                ? 'bg-amber-400/20 font-bold text-amber-100'
                : l.kind === 'trap'
                  ? 'bg-fuchsia-500/15 text-fuchsia-100'
                  : l.kind === 'attack'
                    ? 'bg-orange-500/12 text-orange-50'
                    : l.side === me
                      ? 'bg-emerald-500/10'
                      : l.side !== null
                        ? 'bg-sky-500/10'
                        : 'bg-white/5 opacity-70'
            }`}
          >
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-black/30 text-[12px]">
              {LOG_ICON[l.kind]}
            </span>
            <div className="min-w-0">
              <div className="text-[9px] opacity-50">{t('turnLabel', { n: l.turn })}</div>
              <div>{logText(l)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
