'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENT_ICON, ELEMENT_NAME, HIDDEN_CARD_ID, def } from '@/lib/game/cards';
import { archetypeOf, type Archetype } from '@/lib/game/archetypes';
import type { BattleFx } from '@/lib/game/battleFx';
import { WEATHER_BY_ID } from '@/lib/game/loadout';
import { strikeOf } from '@/lib/game/loadoutEffects';
import type { FieldMonster, GameState, Seat, SetTrap } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { ArenaFloor, Effigy, arenaLayout, type ArenaRow, type TileLight } from './ArenaArt';
import CardView, { ELEMENT_HEX, numberLabel } from './CardView';
import { WeatherScene } from './LoadoutArt';
import { MonsterInfo } from './MatchPanels';

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
 * 15 يبقيه أكبر من المجسّم ويترك الصفّين المجاورين مكشوفين.
 */
const FLOW_W = 15;
const CARD_SM = { w: 86, h: 122 };

/** حركة الوقوف لكل طراز — تفاصيلها ولماذا تختلف في globals.css */
const IDLE: Record<Archetype, string> = {
  beast: 'unit-idle',
  serpent: 'idle-sway',
  avian: 'idle-hover',
  orb: 'idle-float',
  golem: 'idle-heavy',
  wraith: 'idle-drift',
};

type Slot = { x: number; y: number; s: number };

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
  /** معاينة الهجوم المحدَّد من المحرّك: هل يصحّ، وكم ضرره */
  attackPreview: { ok: boolean; damage: number } | null;
  onOwnMonster: (uid: string) => void;
  /** فعلُ النقر على وحش خصم إن كان له فعل — وإلا فالنقرة تعرض تفاصيله */
  foeMonsterAction: (uid: string, seat: Seat) => (() => void) | undefined;
  canHitFace: (seat: Seat) => boolean;
  onFaceAttack: (seat: Seat) => void;
  trapSelectable: boolean;
  onPickTrap: (uid: string) => void;
  peekable: boolean;
  onPeekTrap: (slot: SetTrap) => void;
  /** الوحش المعروضة تفاصيله — مرفوعٌ إلى اللوحة لأن اللوحة الجانبية تعرضه أيضاً */
  inspectUid: string | null;
  onInspect: (uid: string | null) => void;
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
  attackPreview,
  onOwnMonster,
  foeMonsterAction,
  canHitFace,
  onFaceAttack,
  trapSelectable,
  onPickTrap,
  peekable,
  onPeekTrap,
  inspectUid,
  onInspect,
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

  /** الهدف الذي يحوم فوقه المؤشّر — يُرسم إليه سهم التصويب */
  const [aim, setAim] = useState<string | null>(null);
  const longPressed = useRef(false);

  const owners: Seat[] = [me, ...foeSeats];
  const meP = game.players[me];
  const attackMode = attackers.length > 0 && canAct;
  const attackValid = attackMode && Boolean(attackPreview?.ok);
  const rowOf = (owner: number, line: 'front' | 'back') =>
    layout.rows.findIndex((r) => r.kind === 'side' && r.owner === owner && r.line === line);
  const middle = layout.rows.findIndex((r) => r.kind === 'middle');
  const middleRow = layout.rows[middle];
  const slotOf = (owner: number, i: number): Slot =>
    layout.slot(layout.rows[rowOf(owner, i < 3 ? 'front' : 'back')], i % 3);

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
      } else if (targeting === 'enemy_monster' || attackValid) {
        lights[key] = { color: '#f43f5e', strong: true, pulse: true };
      } else if (attackMode) {
        // الهجوم المحدَّد لا يصحّ: البلاطة رمادية كي لا تبدو هدفاً
        lights[key] = { color: '#64748b' };
      }
    });
  });
  lights[`${middle}:1`] = { color: ELEMENT_HEX[game.flow.element], strong: true, pulse: true };

  const shaking = battle?.type === 'strike' && battle.damage > 0;
  /** لون عنصر المهاجم — يُلوَّن به انفجار الاصطدام. المهاجم قد يسقط في الضربة نفسها، فللبحث بديل */
  const strikeColor = (() => {
    if (battle?.type !== 'strike') return '#fca5a5';
    for (const p of game.players) {
      const m = p.field.find((x) => battle.strikers.includes(x.uid));
      if (m) return ELEMENT_HEX[def(m.defId).element];
    }
    return '#fca5a5';
  })();

  // ---------- وحدة على الأرض ----------
  function renderUnit(m: FieldMonster, i: number, seat: Seat, owner: number, band: { top: number; bottom: number }) {
    const slot = slotOf(owner, i);
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
    // المنسحب لا يُهاجَم، فلا يُعرض هدفاً صالحاً ولا تُرسَم عليه معاينة ضرر
    const evasive = Boolean(m.evasive);
    const invalidTarget = isFoe && attackMode && (!attackValid || evasive) && targeting !== 'enemy_monster';
    const validTarget = isFoe && !evasive && (attackValid || targeting === 'enemy_monster');
    // 10px كانت تُقرأ على شاشة الحاسوب لا على الهاتف
    const stat = `max(12px, ${3.6 * slot.s}cqw)`;

    const ringColor = isFoe
      ? validTarget
        ? '#f43f5e'
        : null
      : selected
        ? '#fff4c2'
        : targeting === 'own_monster'
          ? '#fbbf24'
          : ready
            ? color
            : null;

    const status = m.protectedNew
      ? t('protectedTag')
      : m.sick
        ? t('fresh')
        : m.exhausted
          ? t('exhausted')
          : t('ready');
    const label = t('monsterAria', { name: L(d.name), atk: m.atk, hp: m.hp, maxHp: m.maxHp, status });

    const onClick = () => {
      if (longPressed.current) {
        longPressed.current = false;
        return;
      }
      if (isFoe) {
        if (action) action();
        else onInspect(inspectUid === m.uid ? null : m.uid);
        return;
      }
      // تحديد وحشك لا يفتح البطاقة المنبثقة: كانت تقع فوق صفّ الخصم فتُخفي
      // الهدف ومعاينة ضرره في اللحظة التي يُحتاجان فيها. التفاصيل بالضغط المطوّل،
      // وعلى الشاشة الواسعة تعرض اللوحة الجانبية المهاجمَ المحدَّد تلقائياً.
      onInspect(null);
      onOwnMonster(m.uid);
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

        {/* شارة الحالة فوق الرأس: جاهز ⚔ / مُنهك 💤 / جديد ⏳ — تُقرأ دون فتح التفاصيل */}
        {(!isFoe || m.protectedNew) && !strike && (
          <span
            aria-hidden
            className={`absolute left-1/2 top-[2%] z-10 grid -translate-x-1/2 place-items-center rounded-full font-black ring-1 ${
              m.protectedNew
                ? 'bg-sky-400 text-black ring-sky-100'
                : ready
                  ? 'bg-emerald-500 text-black ring-emerald-200'
                  : m.exhausted
                    ? 'bg-slate-700 text-slate-200 ring-slate-400/50'
                    : 'bg-amber-500/90 text-black ring-amber-200'
            }`}
            style={{ width: `max(16px, ${4.4 * slot.s}cqw)`, height: `max(16px, ${4.4 * slot.s}cqw)`, fontSize: `max(9px, ${2.4 * slot.s}cqw)` }}
          >
            {m.protectedNew ? '🛡' : ready ? '⚔' : m.exhausted ? '💤' : '⏳'}
          </span>
        )}

        {/* معاينة الضرر على كل هدفٍ صالح — لا تحتاج تحويماً، فتعمل باللمس */}
        {validTarget && attackValid && attackPreview && (
          <span
            aria-hidden
            className="tile-pulse absolute left-1/2 top-[-6%] z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-rose-600 px-[0.5em] font-black text-white shadow-[0_0_12px_#f43f5e]"
            style={{ fontSize: stat }}
          >
            −{attackPreview.damage}
            {attackPreview.damage >= m.hp ? ' 💀' : ''}
          </span>
        )}
        {invalidTarget && (
          <span
            aria-hidden
            className="absolute left-1/2 top-[20%] z-20 -translate-x-1/2 font-black text-rose-400 [text-shadow:0_0_6px_#000]"
            style={{ fontSize: `max(18px, ${6 * slot.s}cqw)` }}
            title={t('invalidTarget')}
          >
            ✕
          </span>
        )}

        <button
          type="button"
          onClick={onClick}
          onPointerEnter={() => isFoe && setAim(m.uid)}
          onPointerLeave={() => {
            cancel();
            if (isFoe) setAim((cur) => (cur === m.uid ? null : cur));
          }}
          onFocus={() => isFoe && setAim(m.uid)}
          onBlur={() => isFoe && setAim((cur) => (cur === m.uid ? null : cur))}
          onPointerDown={() => {
            timer = window.setTimeout(() => {
              longPressed.current = true;
              onInspect(m.uid);
            }, 450);
          }}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => {
            e.preventDefault();
            onInspect(m.uid);
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
                : validTarget
                  ? 'drop-shadow(0 0 5px #f43f5e)'
                  : invalidTarget
                    ? 'grayscale(0.6) brightness(0.7)'
                    : dim
                      ? 'brightness(0.55) saturate(0.6)'
                      : undefined,
            }}
          >
            <Effigy
              m={m}
              className={`block h-auto w-full ${!strike && !dim ? IDLE[archetypeOf(d.species) ?? 'beast'] : ''}`}
            />
          </div>
        </button>

        {/*
          الأرقام أكبر ما حول الوحش: الهجوم والحياة قرارُ كل ضربة. شارة العنصر
          قبلهما كي لا يُعتمد على اللون وحده (عمى الألوان، والشاشات الصغيرة).
        */}
        <div
          className="pointer-events-none absolute left-1/2 top-[92%] -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-[0.4em] pb-[2px] font-black leading-tight shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
          style={{ fontSize: stat, boxShadow: `inset 0 0 0 1px ${color}88` }}
        >
          <div className="flex items-center gap-[0.35em]">
            <span className="text-[0.8em]">{ELEMENT_ICON[d.element]}</span>
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

        {/* وميض الاستدعاء: يُرسم مع أوّل ظهورٍ للوحدة فقط، فلا يتكرّر مع إعادة الرسم */}
        <span
          aria-hidden
          className="summon-ring pointer-events-none absolute left-1/2 top-[88%] rounded-[50%]"
          style={{ width: '140%', aspectRatio: '2.6 / 1', border: `3px solid ${color}`, boxShadow: `0 0 22px ${color}` }}
        />
        {hit && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[45%] z-30"
            style={{ '--burst': strikeColor } as React.CSSProperties}
          >
            <span className="impact-burst absolute rounded-full" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <span
                key={a}
                className="impact-spark absolute rounded-full"
                style={{ '--a': `${a}deg` } as React.CSSProperties}
              />
            ))}
          </span>
        )}
        {hit && battle.damage > 0 && (
          <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-[max(18px,5cqw)] font-black text-rose-300 [text-shadow:0_2px_6px_#000]">
            −{battle.damage}
          </span>
        )}
      </div>
    );
  }

  // ---------- سهم التصويب ----------
  function renderAim() {
    if (!aim || !attackValid) return null;
    let target: Slot | null = null;
    owners.forEach((seat, owner) => {
      if (owner === 0) return;
      const i = game.players[seat].field.findIndex((m) => m.uid === aim);
      if (i >= 0 && i < 6) target = slotOf(owner, i);
    });
    if (!target) return null;
    const tgt: Slot = target;
    const lift = (s: Slot) => s.y - 0.5 * (UNIT_W / 100) * W * s.s;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-[65] h-full w-full"
        aria-hidden
      >
        <defs>
          <marker id="aim-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10Z" fill="#fb7185" />
          </marker>
        </defs>
        {attackers.map((uid) => {
          const i = meP.field.findIndex((m) => m.uid === uid);
          if (i < 0 || i > 5) return null;
          const from = slotOf(0, i);
          const a = { x: from.x, y: lift(from) };
          const b = { x: tgt.x, y: lift(tgt) + 10 };
          const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 50 };
          const d = `M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;
          return (
            <g key={uid}>
              <path d={d} stroke="#000" strokeOpacity="0.5" strokeWidth="9" fill="none" strokeLinecap="round" />
              <path
                d={d}
                className="arrow-dash"
                stroke="#fb7185"
                strokeWidth="5"
                strokeDasharray="10 8"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#aim-head)"
              />
            </g>
          );
        })}
      </svg>
    );
  }

  // ---------- البطاقة المنبثقة (للهاتف؛ على الشاشة الواسعة تعرضها اللوحة الجانبية) ----------
  let inspected: { m: FieldMonster; slot: Slot } | null = null;
  if (inspectUid) {
    owners.forEach((seat, owner) => {
      const i = game.players[seat].field.findIndex((m) => m.uid === inspectUid);
      if (i < 0 || i > 5) return;
      inspected = { m: game.players[seat].field[i], slot: slotOf(owner, i) };
    });
  }

  function renderInspect(m: FieldMonster, slot: Slot) {
    const color = ELEMENT_HEX[def(m.defId).element];
    const figTop = slot.y - 0.88 * (UNIT_W / 100) * W * slot.s;
    const below = slot.y / H < 0.5;
    return (
      <div
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className="pop-in pointer-events-none absolute z-[70] rounded-xl border bg-[#0c0e1a]/95 p-2 shadow-[0_14px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur xl:hidden"
        style={{
          borderColor: `${color}99`,
          width: 'max(190px, 46cqw)',
          left: `clamp(4px, calc(${px(slot.x)} - max(95px, 23cqw)), calc(100% - max(190px, 46cqw) - 4px))`,
          ...(below ? { top: py(slot.y + 40 * slot.s) } : { bottom: `${((H - figTop) / H) * 100}%` }),
        }}
      >
        <MonsterInfo m={m} weather={game.weather ?? null} />
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
        maxWidth: `max(300px, calc((100dvh - 430px) * ${(W / H).toFixed(3)}))`,
      }}
    >
      <div className="absolute inset-0" onClick={() => onInspect(null)}>
        <ArenaFloor layout={layout} lights={lights} />
      </div>

      {titanReady && (
        <div aria-hidden className="titan-aura pointer-events-none absolute inset-[-4%] rounded-[40px] mix-blend-screen" />
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
          🂠 {game.players[me].deck.length}
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
          translate: '-50% -70%',
          // تحت الوحوش كلّها: كان يعلو وحشَ صفّك الأمامي فيخفيه وهو محدَّد
          zIndex: 8,
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
              <div className={`absolute inset-x-0 flex justify-center px-2 ${isFoe ? 'top-[2%]' : 'bottom-[2%]'}`}>
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

      {/*
        انفجار الضربة القاتلة. الهدف الذي يسقط يغادر الحالة في التحديث نفسه
        الذي تصل فيه الضربة، فلا وحدة يُعلَّق عليها الانفجار — وكانت أقوى
        الضربات هي بالضبط التي لا يظهر لها أثر. يُرسم هنا في وسط صفوف طرفه.
      */}
      {battle?.type === 'strike' &&
        battle.target !== 'face' &&
        !owners.some((seat) => game.players[seat].field.some((m) => m.uid === battle.target)) &&
        (() => {
          const seat = battle.targetSeat ?? (battle.entry.side === me ? foeSeats[0] : me);
          const owner = owners.indexOf(seat as Seat);
          if (owner < 0) return null;
          const band = layout.band(owner);
          return (
            <span
              aria-hidden
              className="pointer-events-none absolute z-[66]"
              style={
                {
                  left: '50%',
                  top: py((band.top + band.bottom) / 2),
                  '--burst': strikeColor,
                  fontSize: '1.6em',
                } as React.CSSProperties
              }
            >
              <span className="impact-burst absolute rounded-full" style={{ fontSize: 'max(18px, 6cqw)' }} />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <span
                  key={a}
                  className="impact-spark absolute rounded-full"
                  style={{ '--a': `${a}deg`, fontSize: 'max(18px, 6cqw)' } as React.CSSProperties}
                />
              ))}
              <span className="damage-pop absolute left-0 top-0 text-[max(22px,6cqw)] font-black text-rose-200 [text-shadow:0_2px_8px_#000]">
                💀
              </span>
            </span>
          );
        })()}

      {renderAim()}

      {inspected &&
        renderInspect((inspected as { m: FieldMonster }).m, (inspected as { slot: Slot }).slot)}
    </div>
  );
}
