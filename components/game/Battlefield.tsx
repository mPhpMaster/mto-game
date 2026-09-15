'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ABILITY_NAME, ABILITY_TEXT, ELEMENT_ICON, ELEMENT_NAME, HIDDEN_CARD_ID, def } from '@/lib/game/cards';
import { ARCHETYPE_PASSIVE, archetypeOf } from '@/lib/game/archetypes';
import type { BattleFx } from '@/lib/game/battleFx';
import { GEAR_BY_ID, WEATHER_BY_ID } from '@/lib/game/loadout';
import { atkOf, strikeOf } from '@/lib/game/loadoutEffects';
import type { FieldMonster, GameState, Seat, SetTrap } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { ArenaFloor, Effigy, arenaLayout, type ArenaRow, type TileLight } from './ArenaArt';
import CardView, { ELEMENT_HEX, numberLabel } from './CardView';
import { GearIcon, WeatherScene } from './LoadoutArt';

/**
 * الساحة: كل ما على الأرض — الوحوش في خاناتها، والتدفق في الوسط، والفخاخ
 * على الحافّة. تقرأ الحالة وتُبلغ بالنقرات فقط؛ لا قاعدة لعبٍ واحدة هنا.
 *
 * السمات `data-field`/`data-uid`/`data-flow` ليست زينة: مؤثّرات الضرب
 * والطيران في GameBoard تقيس مواضعها منها.
 */

/** عرض المجسّم عند الحافّة القريبة، بنسبة من عرض الساحة */
const UNIT_W = 23;
/**
 * عرض كارت التدفق. كان 19 فغطّى صفّ الخصم الأمامي حين يقف على بلاطته؛
 * 14 يبقيه أكبر من المجسّم ويترك الصفّين المجاورين مكشوفين.
 */
const FLOW_W = 15;
const CARD_SM = { w: 86, h: 122 };

export interface BattlefieldProps {
  game: GameState;
  me: Seat;
  /** الخصوم بترتيب قربهم من الوسط */
  foeSeats: Seat[];
  attackers: string[];
  canAct: boolean;
  targeting: string | null;
  battle: BattleFx | null;
  strikeDelta: Record<string, { dx: number; dy: number }>;
  onOwnMonster: (uid: string) => void;
  /** فعلُ النقر على وحش خصم إن كان له فعل — وإلا فالنقرة تعرض تفاصيله */
  foeMonsterAction: (uid: string, seat: Seat) => (() => void) | undefined;
  canHitFace: (seat: Seat) => boolean;
  onFaceAttack: (seat: Seat) => void;
  trapSelectable: boolean;
  onPickTrap: (uid: string) => void;
  peekable: boolean;
  onPeekTrap: (slot: SetTrap) => void;
  /** حلقات التعليم */
  focus: { foe: string; flow: string; mine: string };
  titanReady: boolean;
}

export default function Battlefield({
  game,
  me,
  foeSeats,
  attackers,
  canAct,
  targeting,
  battle,
  strikeDelta,
  onOwnMonster,
  foeMonsterAction,
  canHitFace,
  onFaceAttack,
  trapSelectable,
  onPickTrap,
  peekable,
  onPeekTrap,
  focus,
  titanReady,
}: BattlefieldProps) {
  const { t, L, locale, name: pname } = useLocale();
  const layout = useMemo(() => arenaLayout(foeSeats.length), [foeSeats.length]);
  const { width: W, height: H } = layout;
  const px = (x: number) => `${(x / W) * 100}%`;
  const py = (y: number) => `${(y / H) * 100}%`;

  /**
   * عرض الساحة بالبكسل — لكارت التدفق وحده، لأنه مكوّنٌ بمقاساتٍ ثابتة
   * لا يُصغَّر إلا بـ`scale` الذي لا يقبل وحدات الحاوية. القيمة الأولى ثابتة
   * فيتطابق رسم الخادم والمتصفّح، ثم يُقاس.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(390);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * الوحش المعروضة تفاصيله. مربوطٌ برقم الدور بدل مسحه بمؤثّر: ينطفئ وحده
   * حين يتبدّل الدور أو يغادر الوحش الساحة، بلا setState داخل effect.
   */
  const [inspect, setInspect] = useState<{ uid: string; turn: number } | null>(null);
  const longPressed = useRef(false);

  const owners: Seat[] = [me, ...foeSeats];
  const meP = game.players[me];
  const foeTargetable = (attackers.length > 0 && canAct) || targeting === 'enemy_monster';
  const rowOf = (owner: number, line: 'front' | 'back') =>
    layout.rows.findIndex((r) => r.kind === 'side' && r.owner === owner && r.line === line);
  const middle = layout.rows.findIndex((r) => r.kind === 'middle');
  const middleRow = layout.rows[middle];

  // ---------- إضاءة البلاطات ----------
  const lights: Record<string, TileLight> = {};
  owners.forEach((seat, owner) => {
    game.players[seat].field.slice(0, 6).forEach((m, i) => {
      const key = `${rowOf(owner, i < 3 ? 'front' : 'back')}:${i % 3}`;
      const color = ELEMENT_HEX[def(m.defId).element];
      if (owner === 0) {
        if (attackers.includes(m.uid)) lights[key] = { color: '#fff4c2', strong: true };
        else if (targeting === 'own_monster') lights[key] = { color: '#fbbf24', pulse: true };
        else if (canAct && !m.sick && !m.exhausted && !meP.attackLocked) lights[key] = { color };
      } else if (foeTargetable) {
        lights[key] = { color: '#f43f5e', strong: true, pulse: true };
      }
    });
  });
  lights[`${middle}:1`] = { color: ELEMENT_HEX[game.flow.element], strong: true, pulse: true };

  const shaking = battle?.type === 'strike' && battle.damage > 0;

  // ---------- وحدة على الأرض ----------
  function renderUnit(m: FieldMonster, i: number, seat: Seat, owner: number, band: { top: number; bottom: number }) {
    const row = layout.rows[rowOf(owner, i < 3 ? 'front' : 'back')];
    const slot = layout.slot(row, i % 3);
    const d = def(m.defId);
    const color = ELEMENT_HEX[d.element];
    const isFoe = owner > 0;
    const selected = !isFoe && attackers.includes(m.uid);
    const ready = !isFoe && canAct && !m.sick && !m.exhausted && !meP.attackLocked;
    const strike = strikeDelta[m.uid] ?? null;
    const hit = battle?.type === 'strike' && battle.target === m.uid;
    const dim = !strike && (m.sick || m.exhausted);
    const struck = strikeOf(m, game.weather ?? null);
    const hpPct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
    const action = isFoe ? foeMonsterAction(m.uid, seat) : undefined;

    const ringColor = isFoe
      ? foeTargetable
        ? '#f43f5e'
        : null
      : selected
        ? '#fff4c2'
        : targeting === 'own_monster'
          ? '#fbbf24'
          : ready
            ? color
            : null;

    const status = m.sick ? t('fresh') : m.exhausted ? t('exhausted') : t('ready');
    const label = t('monsterAria', { name: L(d.name), atk: m.atk, hp: m.hp, maxHp: m.maxHp, status });

    const toggleInspect = () =>
      setInspect((cur) => (cur?.uid === m.uid && cur.turn === game.turn ? null : { uid: m.uid, turn: game.turn }));

    const onClick = () => {
      if (longPressed.current) {
        longPressed.current = false;
        return;
      }
      if (isFoe) {
        if (action) action();
        else toggleInspect();
        return;
      }
      onOwnMonster(m.uid);
      if (targeting !== 'own_monster') {
        setInspect(selected ? null : { uid: m.uid, turn: game.turn });
      }
    };

    let timer: number | undefined;
    const cancel = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    return (
      <div
        key={m.uid}
        data-uid={m.uid}
        className="absolute"
        style={{
          left: px(slot.x),
          top: `${((slot.y - band.top) / (band.bottom - band.top)) * 100}%`,
          width: `${UNIT_W * slot.s}cqw`,
          translate: '-50% -88%',
          zIndex: strike ? 60 : hit ? 40 : 10 + Math.round(slot.y / 20),
        }}
      >
        {ringColor && (
          <span
            aria-hidden
            className={`absolute left-1/2 top-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] ${
              selected ? '' : 'tile-pulse'
            }`}
            style={{
              width: '104%',
              aspectRatio: '2.6 / 1',
              border: `2px solid ${ringColor}`,
              boxShadow: `0 0 14px ${ringColor}, inset 0 0 10px ${ringColor}66`,
            }}
          />
        )}
        <button
          type="button"
          onClick={onClick}
          onPointerDown={() => {
            timer = window.setTimeout(() => {
              longPressed.current = true;
              setInspect({ uid: m.uid, turn: game.turn });
            }, 450);
          }}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => {
            e.preventDefault();
            setInspect({ uid: m.uid, turn: game.turn });
          }}
          title={label}
          aria-label={label}
          aria-pressed={isFoe ? undefined : selected}
          className={[
            'pointer-events-auto relative block w-full cursor-pointer select-none',
            strike ? 'strike-lunge' : hit ? 'hit-impact' : 'pop-in',
          ].join(' ')}
          style={
            strike
              ? ({
                  '--dx': `${strike.dx}px`,
                  '--dy': `${strike.dy}px`,
                  '--rot': strike.dx > 0 ? '8deg' : '-8deg',
                } as React.CSSProperties)
              : undefined
          }
        >
          <div
            className="transition-[translate,filter] duration-200"
            style={{
              translate: selected ? '0 -12%' : undefined,
              filter: selected
                ? `drop-shadow(0 0 8px ${color}) brightness(1.15)`
                : foeTargetable && isFoe
                  ? 'drop-shadow(0 0 5px #f43f5e)'
                  : dim
                    ? 'brightness(0.62) saturate(0.7)'
                    : undefined,
            }}
          >
            <Effigy m={m} className={`block h-auto w-full ${!strike && !dim ? 'unit-idle' : ''}`} />
          </div>
        </button>

        {/* الأرقام تبقى ظاهرة: الهجوم والحياة قرارُ كل ضربة، والباقي في البطاقة المنبثقة */}
        <div
          className="pointer-events-none absolute left-1/2 top-[94%] -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-black/75 px-[0.45em] pb-[2px] font-black leading-tight ring-1 ring-white/15"
          style={{ fontSize: `max(8px, ${2.25 * slot.s}cqw)` }}
        >
          <div className="flex items-center gap-[0.45em]">
            <span className="text-orange-300">⚔{struck}</span>
            <span className="text-emerald-300">❤{m.hp}</span>
            {(m.poison ?? 0) > 0 && <span className="text-lime-300">☠</span>}
            {(m.gear?.length ?? 0) > 0 && <span className="text-sky-300">◆{m.gear!.length}</span>}
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded bg-white/10">
            <div
              className={`h-full transition-all ${hpPct > 50 ? 'bg-emerald-400' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {hit && battle.damage > 0 && (
          <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-[max(16px,4cqw)] font-black text-rose-300 [text-shadow:0_2px_6px_#000]">
            −{battle.damage}
          </span>
        )}
      </div>
    );
  }

  // ---------- البطاقة المنبثقة ----------
  let inspected: { m: FieldMonster; slot: { x: number; y: number; s: number } } | null = null;
  if (inspect && inspect.turn === game.turn) {
    owners.forEach((seat, owner) => {
      const i = game.players[seat].field.findIndex((m) => m.uid === inspect.uid);
      if (i < 0 || i > 5) return;
      const row = layout.rows[rowOf(owner, i < 3 ? 'front' : 'back')];
      inspected = { m: game.players[seat].field[i], slot: layout.slot(row, i % 3) };
    });
  }

  function renderInspect(m: FieldMonster, slot: { x: number; y: number; s: number }) {
    const d = def(m.defId);
    const color = ELEMENT_HEX[d.element];
    const geared = atkOf(m);
    const struck = strikeOf(m, game.weather ?? null);
    const passive = ARCHETYPE_PASSIVE[archetypeOf(d.species) ?? 'beast'];
    const figTop = slot.y - 0.88 * (UNIT_W / 100) * W * slot.s;
    const below = slot.y / H < 0.5;
    const status = m.sick ? t('fresh') : m.exhausted ? t('exhausted') : t('ready');
    return (
      <div
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className="pop-in pointer-events-none absolute z-[70] rounded-xl border bg-[#0c0e1a]/95 p-2 text-[11px] leading-snug shadow-[0_14px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur"
        style={{
          borderColor: `${color}99`,
          width: 'max(180px, 44cqw)',
          left: `clamp(4px, calc(${px(slot.x)} - max(90px, 22cqw)), calc(100% - max(180px, 44cqw) - 4px))`,
          ...(below
            ? { top: py(slot.y + 34 * slot.s) }
            : { bottom: `${((H - figTop) / H) * 100}%` }),
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <b className="truncate text-[13px]">
            {ELEMENT_ICON[d.element]} {L(d.name)}
          </b>
          <span className="shrink-0 rounded bg-white/10 px-1.5 text-[10px] font-bold">{status}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[15px] font-black">
          <span className="text-orange-300">⚔ {struck !== geared ? `${geared}→${struck}` : struck}</span>
          <span className="text-emerald-300">
            ❤ {m.hp}/{m.maxHp}
          </span>
          {(m.poison ?? 0) > 0 && <span className="text-[11px] text-lime-300">☠ {m.poison}</span>}
        </div>
        {d.ability && d.ability !== 'none' && (
          <p className="mt-1">
            <b style={{ color }}>{L(ABILITY_NAME[d.ability])}</b> — {L(ABILITY_TEXT[d.ability])}
          </p>
        )}
        <p className="mt-1 opacity-75">
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

  // ---------- الوسط ----------
  const flowSlot = layout.slot(middleRow, 1);
  const flowCardW = (FLOW_W / 100) * stageW * flowSlot.s;
  const flowScale = flowCardW / CARD_SM.w;
  const flowColor = ELEMENT_HEX[game.flow.element];
  const flowDef = game.flow.defId ? def(game.flow.defId) : null;
  const deckSlot = layout.slot(middleRow, 0);
  const weatherSlot = layout.slot(middleRow, 2);
  const weather = game.weather ? WEATHER_BY_ID[game.weather] : null;

  // ---------- الفخاخ على الحافّة ----------
  function renderTraps(seat: Seat, owner: number) {
    const own = layout.rows.filter((r): r is Extract<ArenaRow, { kind: 'side' }> => r.kind === 'side' && r.owner === owner);
    const z0 = Math.min(...own.map((r) => r.z0));
    const z1 = Math.max(...own.map((r) => r.z1));
    const isFoe = owner > 0;
    return game.players[seat].traps.map((slot, k) => {
      const z = z0 + ((k + 0.5) * (z1 - z0)) / 4;
      const p = layout.project(1.5 + layout.rimX * 0.5, z);
      const s = layout.scaleAt(z);
      const canPeek = !isFoe && peekable && slot.defId !== HIDDEN_CARD_ID;
      const selectable = isFoe && trapSelectable;
      const clickable = selectable || canPeek;
      const label = canPeek ? t('peekTrapHint') : t('faceDownTrap');
      return (
        <button
          key={slot.uid}
          type="button"
          disabled={!clickable}
          data-trap={isFoe ? 'foe' : 'own'}
          data-trap-uid={slot.uid}
          onClick={() => {
            if (selectable) onPickTrap(slot.uid);
            else if (canPeek) onPeekTrap(slot);
          }}
          title={label}
          aria-label={label}
          className={`absolute rounded-[3px] border disabled:cursor-default ${
            selectable
              ? 'glow-pulse cursor-pointer border-rose-400'
              : canPeek
                ? 'cursor-pointer border-fuchsia-300/80 hover:border-fuchsia-100'
                : 'border-white/25'
          }`}
          style={{
            left: px(p.x),
            top: py(p.y),
            width: `${9 * s}cqw`,
            aspectRatio: '1.5 / 1',
            translate: '-50% -50%',
            zIndex: 5,
            transform: 'perspective(120px) rotateX(38deg)',
            background: 'repeating-linear-gradient(135deg, #2a1f4a 0 5px, #1a1535 5px 10px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
          }}
        >
          <span className="text-[max(8px,1.8cqw)] leading-none opacity-80">🂠</span>
        </button>
      );
    });
  }

  return (
    <div
      ref={stageRef}
      dir="ltr"
      className={`relative mx-auto w-full ${shaking ? 'board-shake' : ''}`}
      style={{
        aspectRatio: `${W} / ${H}`,
        containerType: 'inline-size',
        // الساحة تأخذ أكبر ما تسمح به الشاشة دون أن تدفع اليد تحت الطيّة
        maxWidth: `max(300px, calc((100dvh - 350px) * ${(W / H).toFixed(3)}))`,
      }}
    >
      <div className="absolute inset-0" onClick={() => setInspect(null)}>
        <ArenaFloor layout={layout} lights={lights} />
      </div>

      {titanReady && (
        <div
          aria-hidden
          className="titan-aura pointer-events-none absolute inset-[-4%] rounded-[40px] mix-blend-screen"
        />
      )}

      {/* السطح */}
      <div
        className="pointer-events-none absolute"
        style={{ left: px(deckSlot.x), top: py(deckSlot.y), width: `${10 * deckSlot.s}cqw`, translate: '-50% -78%' }}
        title={t('deckPile')}
      >
        <div className="relative" style={{ aspectRatio: '0.7 / 1' }}>
          {[2, 1, 0].map((k) => (
            <div
              key={k}
              className="absolute inset-0 rounded-[8%] border border-white/20 shadow-[0_6px_10px_rgba(0,0,0,0.6)]"
              style={{
                translate: `${k * 4}% ${-k * 5}%`,
                background: 'repeating-linear-gradient(135deg, #1a1f3d 0 6px, #131735 6px 12px)',
              }}
            />
          ))}
        </div>
        <div className="mt-[4%] text-center text-[max(9px,1.9cqw)] font-black text-white/85 [text-shadow:0_1px_3px_#000]">
          🂠 {game.deck.length}
        </div>
      </div>

      {/* التدفق: شعاعٌ بلون العنصر ثم الكارت واقفاً عليه */}
      <div
        data-flow
        className={`pointer-events-none absolute rounded-lg ${focus.flow}`}
        style={{
          left: px(flowSlot.x),
          top: py(flowSlot.y),
          width: flowCardW,
          height: (flowCardW * CARD_SM.h) / CARD_SM.w,
          // متمركزٌ على بلاطته: لو وقف عليها لغطّى رأسُه صفَّ الخصم الأمامي
          translate: '-50% -70%',
          zIndex: 30,
        }}
        title={t('flowPile')}
      >
        <div
          aria-hidden
          className="tile-pulse absolute -inset-x-[30%] bottom-[-8%] top-[-30%] rounded-full blur-md"
          style={{ background: `radial-gradient(50% 60% at 50% 70%, ${flowColor}88, transparent 70%)` }}
        />
        <div
          key={game.flow.defId ?? 'none'}
          className="pop-in relative origin-top-left"
          // خاصية `scale` لا `transform`: حركة pop-in تكتب transform فتمحو التصغير
          style={{ width: CARD_SM.w, height: CARD_SM.h, scale: String(flowScale) }}
        >
          {flowDef ? (
            <CardView card={flowDef} size="sm" />
          ) : (
            <div className="h-full w-full rounded-xl border border-white/15 bg-[#161a36]" />
          )}
        </div>
        <div
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          // بجانب الكارت لا تحته: تحته يقع رأسُ الوحش في صفّك الأمامي
          className="absolute right-[108%] top-[38%] whitespace-nowrap rounded-full px-[0.7em] py-[0.1em] font-black text-black shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          style={{ background: flowColor, fontSize: 'max(10px, 2.4cqw)', boxShadow: `0 0 16px ${flowColor}` }}
        >
          {ELEMENT_ICON[game.flow.element]} {L(ELEMENT_NAME[game.flow.element])} · {flowDef ? numberLabel(flowDef) : '—'}
        </div>
      </div>

      {/* الطقس */}
      {weather && (
        <div
          className="pointer-events-none absolute"
          style={{ left: px(weatherSlot.x), top: py(weatherSlot.y), width: `${13 * weatherSlot.s}cqw`, translate: '-50% -70%' }}
          title={t('weatherOn', { name: L(weather.name) })}
        >
          <div className="float-bob overflow-hidden rounded-md border border-sky-200/40 shadow-[0_0_18px_rgba(125,211,252,0.35)]" style={{ aspectRatio: '4 / 3' }}>
            <WeatherScene id={weather.id} />
          </div>
          <div className="mt-[4%] truncate text-center text-[max(9px,1.8cqw)] font-bold text-sky-100 [text-shadow:0_1px_3px_#000]">
            {L(weather.name)}
          </div>
        </div>
      )}

      {owners.map((seat, owner) => renderTraps(seat, owner))}

      {/* الطرفان */}
      {owners.map((seat, owner) => {
        const p = game.players[seat];
        const band = layout.band(owner);
        const isFoe = owner > 0;
        const face = isFoe && canHitFace(seat);
        const ring = owner === 0 ? focus.mine : owner === 1 ? focus.foe : '';
        return (
          <div
            key={seat}
            data-field={`p${seat}`}
            data-seat={seat}
            className={`pointer-events-none absolute inset-x-[12%] rounded-2xl ${ring} ${p.eliminated ? 'opacity-50' : ''}`}
            style={{ top: py(band.top), height: py(band.bottom - band.top) }}
          >
            {p.field.length === 0 && !face && (
              <div
                className={`absolute inset-x-0 flex justify-center px-2 ${isFoe ? 'top-[2%]' : 'bottom-[2%]'}`}
              >
                <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-center text-[max(9px,1.9cqw)] font-bold text-white/70">
                {p.eliminated
                  ? t('eliminatedTag')
                  : isFoe
                    ? foeSeats.length > 1
                      ? pname(p.name)
                      : t('noFoeMonsters')
                    : t('summonHint', { n: 6 })}
                </span>
              </div>
            )}
            {face && (
              <button
                type="button"
                onClick={() => onFaceAttack(seat)}
                className="glow-pulse pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-4 py-2 font-black text-black shadow-[0_0_24px_rgba(251,146,60,0.6)]"
                style={{ fontSize: 'max(12px, 2.6cqw)' }}
              >
                {t('attackFaceNamed', { name: pname(p.name) })}
              </button>
            )}
            {p.field.slice(0, 6).map((m, i) => (
              <div key={m.uid} className="contents">
                {renderUnit(m, i, seat, owner, band)}
              </div>
            ))}
          </div>
        );
      })}

      {inspected &&
        renderInspect(
          (inspected as { m: FieldMonster }).m,
          (inspected as { slot: { x: number; y: number; s: number } }).slot
        )}
    </div>
  );
}
