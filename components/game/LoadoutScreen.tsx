'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ARCHETYPE_BODY, ART_PALETTE, artSeed, type Ink } from './CardArt';
import { GearIcon, ISO, IsoStage, WeatherScene } from './LoadoutArt';
import { ARCHETYPE_NAME, ARCHETYPE_PASSIVE, archetypeOf } from '@/lib/game/archetypes';
import { def } from '@/lib/game/cards';
import { canActivateWeather, canEquip } from '@/lib/game/engine';
import { atkOf, strikeOf } from '@/lib/game/loadoutEffects';
import {
  GEAR,
  GEAR_BY_ID,
  WEATHER,
  WEATHER_BY_ID,
  WEATHER_DISPEL_COST,
  type GearDef,
  type GearId,
  type WeatherId,
} from '@/lib/game/loadout';
import type { FieldMonster, GameAction, GameState, Seat } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '@/components/LanguageSwitch';

export interface LoadoutScreenProps {
  /** حالة المباراة الحيّة — كل رقم معروض هنا يُقرأ منها لا من حالة محلّية */
  state: GameState;
  seat: Seat;
  /** يمرّر الفعل إلى `applyGameAction` */
  onAction: (action: GameAction) => void;
  backHref?: string;
  onBack?: () => void;
}

/**
 * لون الإطار لكل طبقة تأثير. الأصناف مكتوبة كاملةً لا مركَّبة بالقوالب،
 * لأن Tailwind يمسح المصدر نصّياً فيقصّ ما لا يراه مكتوباً.
 */
const TINT: Record<string, { ring: string; bg: string; text: string; glow: string }> = {
  amber: {
    ring: 'border-amber-400/60',
    bg: 'bg-amber-400/10',
    text: 'text-amber-200',
    glow: 'shadow-[0_0_24px_-6px_#fbbf24]',
  },
  sky: {
    ring: 'border-sky-400/60',
    bg: 'bg-sky-400/10',
    text: 'text-sky-200',
    glow: 'shadow-[0_0_24px_-6px_#38bdf8]',
  },
  rose: {
    ring: 'border-rose-400/60',
    bg: 'bg-rose-400/10',
    text: 'text-rose-200',
    glow: 'shadow-[0_0_24px_-6px_#fb7185]',
  },
  cyan: {
    ring: 'border-cyan-400/60',
    bg: 'bg-cyan-400/10',
    text: 'text-cyan-200',
    glow: 'shadow-[0_0_24px_-6px_#22d3ee]',
  },
  lime: {
    ring: 'border-lime-400/60',
    bg: 'bg-lime-400/10',
    text: 'text-lime-200',
    glow: 'shadow-[0_0_24px_-6px_#a3e635]',
  },
  slate: {
    ring: 'border-slate-300/50',
    bg: 'bg-slate-300/10',
    text: 'text-slate-200',
    glow: 'shadow-[0_0_24px_-6px_#cbd5e1]',
  },
};

/** لون توهّج البلاطة تحت كل تجهيز — قِيَمٌ صريحة لا أصناف Tailwind، فهي تدخل SVG */
const TILE_GLOW: Record<string, { on: string; off: string }> = {
  amber: { on: '#f5b942', off: '#7a5c22' },
  sky: { on: '#4fb8f0', off: '#245a78' },
  rose: { on: '#f2637f', off: '#79303f' },
  cyan: { on: '#3fd6e8', off: '#1f6873' },
  lime: { on: '#a6e04a', off: '#4f6b24' },
  slate: { on: '#cbd5e1', off: '#5c6470' },
};

/** مجسّم الوحش على المنصّة — نفس أشكال البطاقة، فالشكل هوية واحدة */
function Effigy({ m, className }: { m: FieldMonster; className?: string }) {
  const d = def(m.defId);
  const arch = archetypeOf(d.species) ?? 'beast';
  const Body = ARCHETYPE_BODY[arch];
  const pal = ART_PALETTE[d.element];
  const ink: Ink = { ...pal, evolved: d.stage === 2, seed: artSeed(d) };
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)] ${className ?? ''}`}
    >
      <Body ink={ink} />
    </svg>
  );
}

export default function LoadoutScreen({
  state,
  seat,
  onAction,
  backHref = '/play',
  onBack,
}: LoadoutScreenProps) {
  const { t, L, reason } = useLocale();

  /** التجهيز المنتظِر هدفاً — الخطوة الثانية أن تنقر وحشاً */
  const [pending, setPending] = useState<GearId | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const me = state.players[seat];
  const monsters = me.field;
  const weather = state.weather ?? null;

  const gearLeft = GEAR.reduce((n, g) => n + (me.gearStock?.[g.id] ?? 0), 0);
  const weatherLeft = WEATHER.reduce((n, w) => n + (me.weatherStock?.[w.id] ?? 0), 0);

  /**
   * الأهليّة تُسأل من المحرّك لا تُعاد كتابتها هنا. لو حسبتها الواجهة بنفسها
   * لانحرف النصّان مع أوّل تعديل: يبدو الكرت متاحاً ثم يرفضه
   * `applyGameAction` بصمت، فلا يفهم اللاعب لماذا لم يقع شيء.
   */
  const gearOk = (g: GearDef, m: FieldMonster) => canEquip(state, seat, g.id, m.uid);
  const gearUsableSomewhere = (g: GearDef) => monsters.some((m) => gearOk(g, m).ok);

  function pickGear(g: GearDef) {
    if (!gearUsableSomewhere(g)) {
      // أوّل سببٍ حقيقي أوضح من «غير متاح»: العنصر الخطأ غير نفاد المخزون
      const why = monsters.length
        ? monsters.map((m) => gearOk(g, m)).find((r) => !r.ok)?.reason
        : 'no_own_monster';
      setFlash(reason(why));
      return;
    }
    setPending((cur) => (cur === g.id ? null : g.id));
    setFlash(null);
  }

  function equipOn(m: FieldMonster) {
    if (!pending) return;
    const g = GEAR_BY_ID[pending];
    if (!gearOk(g, m).ok) return;
    onAction({ type: 'EQUIP', gear: g.id, targetUid: m.uid });
    setPending(null);
    setFlash(t('gearEquipped', { gear: L(g.name), monster: L(def(m.defId).name) }));
  }

  function activate(id: WeatherId | null) {
    if (!canActivateWeather(state, seat, id).ok) return;
    onAction({ type: 'WEATHER', weather: id });
    setFlash(null);
  }

  const pendingGear = pending ? GEAR_BY_ID[pending] : null;
  const canDispel = canActivateWeather(state, seat, null).ok;

  /** بلاطة كل تجهيزٍ تتوهّج بلونه، والمُسلَّح منها أشدّ */
  const glowTiles: Record<string, string> = {};
  GEAR.forEach((g, i) => {
    glowTiles[`${i},2`] = pending === g.id ? TILE_GLOW[g.tint].on : TILE_GLOW[g.tint].off;
  });

  /** كل بلاطةٍ يقف عليها شيء تأخذ ظلّاً، وإلا طفا المشهد كلّه بلا وزن */
  const shadowTiles = [
    ...monsters.map((_, i) => `${i % 4},${Math.floor(i / 4)}`),
    ...GEAR.map((_, i) => `${i},2`),
  ];

  return (
    <div className="flex min-h-screen flex-col gap-2 p-2 sm:p-3">
      {/* ---------- الشريط العلوي — نفس شريط الساحة ---------- */}
      <header className="panel flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-black hover:opacity-80">
            ⚔️ {t('appName')}
          </Link>
          <span className="opacity-60">{t('turnLabel', { n: state.turn })}</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold">{t('prepPhase')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-400/20 px-2 py-1 font-black text-amber-200">
            ⚡ {t('energyLeft', { n: me.energy, cap: me.energyCap })}
          </span>
          <LanguageSwitch compact />
        </div>
      </header>

      {/* ---------- المسرح ---------- */}
      <section
        dir="ltr"
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10"
        /*
          النسبة ثابتة لأن المواضع محسوبة عليها، فالحدّ يكون على **العرض**
          لا الارتفاع: `max-height` مع نسبةٍ ثابتة يقصّ المشهد أو يفكّ ارتباط
          الطبقتين. وبلا حدٍّ أصلاً يبتلع المسرحُ الشاشةَ على الحاسوب فتهبط
          اللوحتان تحت الطيّة، وهما لبّ الشاشة.
        */
        style={{
          aspectRatio: '800 / 470',
          maxWidth: 'calc(50vh * 800 / 470)',
          containerType: 'inline-size',
        }}
      >
        {/*
          الرسم والمحتوى يتقاسمان الإطار نفسه: الـSVG بـ`preserveAspectRatio="none"`
          داخل حاويةٍ بنسبة الـviewBox نفسها، فتتحوّل إحداثيات الإسقاط إلى نسبٍ
          مئوية تحويلاً خطّياً — وبهذا يقف الوحش على بلاطته مهما تغيّر العرض.
          والاتّجاه هنا `ltr` لأن المشهد رسمٌ لا نصّ: انعكاسه يقلب الضوء
          والظلّ، والنصوص العربية بداخله تبقى صحيحة بخوارزمية الاتّجاهين.
        */}
        {/*
          مقاسات الطبقة العلوية بوحدات `cqw` لا بالبكسل: المشهد يتمدّد مع
          العرض، فحجمُ نصٍّ ثابت يصير ضخماً على الهاتف حتى تتراكب اللوحات
          وتخرج الوحوش عن منصّتها. و`max(8px, …)` أرضيةُ قراءةٍ لئلا يذوب
          النصّ على الشاشات الضيّقة.
        */}
        <IsoStage cols={4} rows={3} glowTiles={glowTiles} shadowTiles={shadowTiles} />

        {/* الوحوش على الصفَّين الخلفيَّين */}
        {monsters.map((m, i) => {
          const d = def(m.defId);
          const arch = archetypeOf(d.species) ?? 'beast';
          const on = m.gear ?? [];
          const selectable = pendingGear ? gearOk(pendingGear, m).ok : false;
          const shown = atkOf(m);
          const struck = strikeOf(m, weather);
          const { x, y } = ISO.project(i % 4, Math.floor(i / 4));
          return (
            <button
              key={m.uid}
              type="button"
              onClick={() => equipOn(m)}
              disabled={!selectable}
              aria-label={L(d.name)}
              className={`absolute flex -translate-x-1/2 -translate-y-full flex-col items-center rounded-xl px-1 transition ${
                selectable
                  ? 'cursor-pointer ring-2 ring-emerald-300 drop-shadow-[0_0_10px_rgba(110,231,183,0.8)]'
                  : pendingGear
                    ? 'opacity-35'
                    : ''
              }`}
              style={{ left: `${(x / 800) * 100}%`, top: `${((y + 10) / 470) * 100}%` }}
            >
              {/*
                لوحةٌ هولوغرامية معلَّقة: زجاجٌ سماويّ بحافّة مضيئة. الحبّة
                السوداء المصمتة كانت تثقب المشهد وتقول «واجهة فوق صورة»،
                وهذه تقول «ضوءٌ داخل المشهد».
              */}
              <span className="mb-[0.2cqw] whitespace-nowrap rounded-[3px] border border-cyan-300/70 bg-cyan-400/15 px-[0.6cqw] py-[0.15cqw] text-[max(8px,1.4cqw)] font-black leading-tight text-cyan-50 shadow-[0_0_10px_-2px_#22d3ee] backdrop-blur-[2px]">
                {L(d.name)}
              </span>
              <span
                className="mb-[0.2cqw] whitespace-nowrap rounded-[3px] border border-cyan-300/35 bg-cyan-400/10 px-[0.4cqw] text-[max(7px,1.05cqw)] font-bold leading-tight text-cyan-100/90 backdrop-blur-[2px]"
                title={`${L(ARCHETYPE_PASSIVE[arch].name)} — ${L(ARCHETYPE_PASSIVE[arch].text)}`}
              >
                {L(ARCHETYPE_NAME[arch])} · {L(ARCHETYPE_PASSIVE[arch].name)}
              </span>
              <Effigy m={m} className="h-[9.6cqw] w-[9.6cqw]" />
              <span className="whitespace-nowrap rounded-[3px] border border-cyan-300/40 bg-slate-950/55 px-[0.6cqw] py-[0.15cqw] text-[max(7px,1.2cqw)] font-bold leading-tight text-cyan-50 backdrop-blur-[2px]">
                ⚔ {struck !== shown ? `${shown}→${struck}` : shown} · ❤ {m.hp}/{m.maxHp}
                {(m.poison ?? 0) > 0 && <span className="ms-1 text-lime-300">☠{m.poison}</span>}
              </span>
              {on.length > 0 && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {on.map((id, k) => (
                    <GearIcon key={`${id}-${k}`} id={id} className="h-[2.2cqw] w-[2.2cqw]" />
                  ))}
                </span>
              )}
            </button>
          );
        })}

        {/* التجهيزات تطفو فوق بلاطاتها في الصفّ الأمامي، كما في التصميم */}
        {GEAR.map((g, i) => {
          const { x, y } = ISO.project(i, 2);
          const armed = pending === g.id;
          const usable = gearUsableSomewhere(g);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => pickGear(g)}
              aria-pressed={armed}
              title={`${L(g.name)} — ${L(g.text)}`}
              className={`absolute -translate-x-1/2 -translate-y-full transition ${
                armed ? 'scale-110' : usable ? 'hover:scale-105' : 'opacity-45 saturate-50'
              }`}
              style={{ left: `${(x / 800) * 100}%`, top: `${((y + 6) / 470) * 100}%` }}
            >
              <span className="block whitespace-nowrap rounded-[3px] border border-white/25 bg-slate-950/55 px-[0.5cqw] text-[max(7px,1.15cqw)] font-black leading-tight text-white backdrop-blur-[2px]">
                {L(g.name)}
              </span>
              <GearIcon
                id={g.id}
                className={`h-[8cqw] w-[8cqw] float-bob ${armed ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.85)]' : ''}`}
              />
            </button>
          );
        })}

        {/* شارة الجاهزية والطقس الفعّال */}
        {/*
          الشارتان إلى اليسار: الصفّ الخلفي من الوحوش ينحدر من قمّة المعيّن
          نحو اليمين، فكانتا تصطدمان بأسماء آخره على الشاشات الضيّقة.
        */}
        <div className="absolute start-[1cqw] top-[1cqw] flex items-center gap-[0.6cqw] text-[max(8px,1.3cqw)] font-black">
          <span className="rounded bg-lime-400/25 px-[0.8cqw] py-[0.35cqw] text-lime-100 backdrop-blur-sm">
            {t('readyToEquip')}
          </span>
          <span className="flex items-center gap-[0.4cqw] rounded bg-black/50 px-[0.8cqw] py-[0.35cqw] text-white/90 backdrop-blur-sm">
            {weather && (
              <span className="h-[1.8cqw] w-[2.6cqw] overflow-hidden rounded-[2px]">
                <WeatherScene id={weather} />
              </span>
            )}
            {weather ? L(WEATHER_BY_ID[weather].name) : t('weatherNone')}
          </span>
        </div>
      </section>

      {/* شريط الإرشاد — يقول ما ينتظره منك النقر الآن */}
      <p
        role="status"
        aria-live="polite"
        className={`rounded-lg px-3 py-2 text-center text-xs font-bold ${
          pendingGear
            ? 'bg-emerald-500/20 text-emerald-100'
            : flash
              ? 'bg-white/10 text-white/85'
              : 'bg-white/5 text-white/60'
        }`}
      >
        {pendingGear ? t('pickGearTarget', { gear: L(pendingGear.name) }) : (flash ?? t('prepHint'))}
      </p>

      {/* ---------- اللوحتان ---------- */}
      <div className="grid gap-2 md:grid-cols-2">
        {/* الطقس أوّلاً في الشيفرة، فيقع يميناً في العربية ويساراً في الإنجليزية */}
        <section className="panel rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black">{t('weatherPanel')}</h2>
            <button
              type="button"
              onClick={() => activate(null)}
              disabled={!canDispel}
              title={t('dispelTip', { n: WEATHER_DISPEL_COST })}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold hover:bg-white/20 disabled:opacity-40"
            >
              ⟳ {t('clearWeather')} ⚡{WEATHER_DISPEL_COST}
            </button>
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/45">
            {t('activateWeather')}
          </p>
          <ul className="flex flex-col gap-2">
            {WEATHER.map((w) => {
              const tint = TINT[w.tint];
              const stock = me.weatherStock?.[w.id] ?? 0;
              const active = weather === w.id;
              const check = canActivateWeather(state, seat, w.id);
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => activate(w.id)}
                    disabled={!check.ok}
                    aria-pressed={active}
                    title={check.ok ? L(w.text) : `${L(w.text)}\n⛔ ${reason(check.reason)}`}
                    className={`flex w-full items-stretch gap-2 rounded-xl border p-2 text-start transition ${tint.ring} ${
                      active
                        ? `${tint.bg} ${tint.glow}`
                        : check.ok
                          ? 'bg-black/20 hover:bg-white/10'
                          : 'bg-black/20 opacity-45'
                    }`}
                  >
                    <span className="flex shrink-0 flex-col items-center justify-between">
                      <span className="rounded bg-amber-400/25 px-1.5 text-[10px] font-black text-amber-200">
                        ⚡{w.cost}
                      </span>
                      <span className="rounded bg-white/15 px-1.5 text-[10px] font-black text-white/80">
                        ×{stock}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-black ${tint.text}`}>{L(w.name)}</span>
                        {active && (
                          <span className="rounded bg-lime-400/30 px-1 text-[9px] font-black text-lime-100">
                            ●
                          </span>
                        )}
                      </span>
                      <span className="block text-[9px] font-bold tracking-widest text-white/40">
                        {w.sub}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/75">
                        {L(w.text)}
                      </span>
                    </span>
                    <span
                      className={`h-[52px] w-[68px] shrink-0 overflow-hidden rounded-lg border ${tint.ring}`}
                    >
                      <WeatherScene id={w.id} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* لوحة التجهيزات */}
        <section className="panel rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black">{t('gearPanel')}</h2>
            <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black text-emerald-200">
              ⚙ {t('readyToEquip')}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {GEAR.map((g) => {
              const tint = TINT[g.tint];
              const stock = me.gearStock?.[g.id] ?? 0;
              const usable = gearUsableSomewhere(g);
              const armed = pending === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => pickGear(g)}
                    aria-pressed={armed}
                    title={L(g.text)}
                    className={`flex h-full w-full flex-col rounded-xl border p-2 text-start transition ${tint.ring} ${
                      armed
                        ? `${tint.bg} ${tint.glow}`
                        : usable
                          ? 'bg-black/20 hover:bg-white/10'
                          : 'bg-black/20 opacity-45'
                    }`}
                  >
                    <span className="flex items-start justify-between">
                      <span className="rounded bg-amber-400/25 px-1.5 text-[10px] font-black text-amber-200">
                        ⚡{g.cost}
                      </span>
                      <span className="rounded bg-white/15 px-1.5 text-[10px] font-black text-white/80">
                        ×{stock}
                      </span>
                    </span>
                    <span className="my-1 grid place-items-center">
                      <GearIcon id={g.id} size={46} />
                    </span>
                    <span className={`text-[12px] font-black ${tint.text}`}>{L(g.name)}</span>
                    <span className="text-[10px] font-black tracking-wide text-white/50">{g.stat}</span>
                    <span className="mt-0.5 text-[10px] leading-snug text-white/70">{L(g.text)}</span>
                    {g.onlyElement && (
                      <span className="mt-1 self-start rounded bg-sky-400/20 px-1 text-[9px] font-bold text-sky-200">
                        {t('electricOnly')}
                      </span>
                    )}
                    {stock === 0 && (
                      <span className="mt-1 self-start text-[9px] font-black text-rose-300">
                        {t('outOfStock')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ---------- الشريط السفلي ---------- */}
      <footer className="panel flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-3 font-bold text-white/75">
          <span>
            🎒 {t('gearStock')} <b className="text-white">{gearLeft}</b>
          </span>
          <span>
            🌦 {t('weatherStock')} <b className="text-white">{weatherLeft}</b>
          </span>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 font-black text-black hover:bg-emerald-400"
          >
            {t('backToArena')}
          </button>
        ) : (
          <Link
            href={backHref}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 font-black text-black hover:bg-emerald-400"
          >
            {t('backToArena')}
          </Link>
        )}
      </footer>

      {/* قدرات الطُّرُز — الشكل صار يعني شيئاً في اللعب، فوجب بيانه للاعب */}
      <details className="panel rounded-xl px-3 py-2 text-xs">
        <summary className="cursor-pointer font-black">{t('passiveLabel')}</summary>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {(Object.keys(ARCHETYPE_PASSIVE) as (keyof typeof ARCHETYPE_PASSIVE)[]).map((a) => (
            <li key={a} className="rounded-lg bg-black/20 px-2 py-1.5">
              <b className="text-white">{L(ARCHETYPE_NAME[a])}</b>
              <span className="mx-1 text-white/40">·</span>
              <b className="text-emerald-200">{L(ARCHETYPE_PASSIVE[a].name)}</b>
              <span className="block text-white/70">{L(ARCHETYPE_PASSIVE[a].text)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
