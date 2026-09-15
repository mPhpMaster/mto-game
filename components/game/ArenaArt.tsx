'use client';

import type { FieldMonster } from '@/lib/game/types';
import { archetypeOf } from '@/lib/game/archetypes';
import { def } from '@/lib/game/cards';
import { ARCHETYPE_BODY, ART_PALETTE, artSeed, type Ink } from './CardArt';
import { SunsetRuins } from './LoadoutArt';

/**
 * الطبقة الفنّية لساحة المباراة: الخلفية، والأرضية المنظورية، ومجسّمات الوحوش.
 *
 * **لماذا منظورٌ أماميّ لا إيزومتريّ مائل** كما في شاشة التحضير: المباراة
 * طرفان متقابلان، والمائل يجعل «أين الخصم؟» سؤالاً. المنظور الأمامي يضع
 * الخصم بعيداً وأنت قريباً فيُقرأ بلا شرح، ويملأ عرض الهاتف بدل أن يهدر
 * زاويتيه. والإسقاط هنا أيضاً حسبةٌ نقية تعطي نقاطاً يُوضع عليها HTML قائم.
 */

// ===================== المجسّم =====================

/** مجسّم الوحش — نفس أشكال البطاقة، فالشكل هويةٌ واحدة في اليد وعلى الأرض */
export function Effigy({ m, className }: { m: FieldMonster; className?: string }) {
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

// ===================== تخطيط الساحة =====================

/** صفٌّ من الأرضية: ثلاث خانات لطرفٍ ما، أو صفّ الوسط (السطح · التدفق · الطقس) */
export type ArenaRow =
  | { kind: 'side'; owner: number; line: 'front' | 'back'; z0: number; z1: number }
  | { kind: 'middle'; z0: number; z1: number };

export interface ArenaLayout {
  rows: ArenaRow[];
  width: number;
  height: number;
  /** نقطة على الأرض ⇐ نقطة في مساحة الرسم */
  project(x: number, z: number): { x: number; y: number };
  /** مقياس المنظور عند عمقٍ ما — 1 عند الحافّة القريبة */
  scaleAt(z: number): number;
  /** مركز خانة: العمود 0 يمينٌ، كما يبدأ الترتيب في واجهةٍ عربية */
  slot(row: ArenaRow, col: number): { x: number; y: number; s: number };
  /** حدود صفوف طرفٍ بعينه في مساحة الرسم */
  band(owner: number): { top: number; bottom: number };
  rimX: number;
}

const W = 600;
const COLS = 3;
/** عرض الحافّة خارج الخانات — فيها تستلقي الفخاخ */
const RIM_X = 0.75;
const RIM_Z = 0.42;
/*
  بُعد الكاميرا. كان 7 فصار الصفّ البعيد نصف القريب، والساحة ممرّاً ضيّقاً
  على الهاتف. 12 يُبقي العمق مقروءاً (البعيد ≈ ثلثا القريب) ويملأ العرض.
*/
const D0 = 12;
const A = 15700;
const B = 1540;
const TOP = 70;
export const WALL = 34;

/**
 * `owner` هو ترتيب الطرف: 0 أنت، و1.. الخصوم بترتيب قربهم من الوسط.
 * الصفّ الأمامي لكل طرفٍ هو الأقرب إلى الوسط — فيه الوحوش 0..2، وخلفه 3..5.
 */
export function arenaLayout(foeCount: number): ArenaLayout {
  // يُبنى من القريب إلى البعيد لأن العمق يتراكم من حافّتك
  const nearToFar: Array<{ kind: 'side'; owner: number; line: 'front' | 'back'; depth: number } | { kind: 'middle'; depth: number }> = [
    { kind: 'side', owner: 0, line: 'back', depth: 1 },
    { kind: 'side', owner: 0, line: 'front', depth: 1 },
    // أعمق من صفوف الوحوش: كارت التدفق واقفٌ عليه، وبعمق 1.3 كان يلامس الصفّين المجاورين
    { kind: 'middle', depth: 1.8 },
  ];
  for (let f = 1; f <= foeCount; f++) {
    nearToFar.push(
      { kind: 'side', owner: f, line: 'front', depth: 1 },
      { kind: 'side', owner: f, line: 'back', depth: 1 }
    );
  }
  let z = 0;
  const rows: ArenaRow[] = nearToFar.map((r) => {
    const z0 = z;
    z += r.depth;
    return r.kind === 'middle'
      ? { kind: 'middle', z0, z1: z }
      : { kind: 'side', owner: r.owner, line: r.line, z0, z1: z };
  });
  const total = z;
  const yh = TOP - A / (D0 + total + RIM_Z);
  const project = (x: number, zz: number) => {
    const depth = D0 + zz;
    return { x: W / 2 + (B * x) / depth, y: yh + A / depth };
  };
  const scaleAt = (zz: number) => (D0 - RIM_Z) / (D0 + zz);
  const height = Math.ceil(project(0, -RIM_Z).y + WALL + 6);

  return {
    // يُعاد من البعيد إلى القريب: ترتيبُ الرسم نفسه
    rows: rows.slice().reverse(),
    width: W,
    height,
    project,
    scaleAt,
    rimX: RIM_X,
    slot(row, col) {
      const zz = (row.z0 + row.z1) / 2;
      const p = project((COLS - 1) / 2 - col, zz);
      return { ...p, s: scaleAt(zz) };
    },
    band(owner) {
      const own = rows.filter((r) => r.kind === 'side' && r.owner === owner);
      const z0 = Math.min(...own.map((r) => r.z0));
      const z1 = Math.max(...own.map((r) => r.z1));
      return { top: project(0, z1).y, bottom: project(0, z0).y };
    },
  };
}

// ===================== الأرضية =====================

export interface TileLight {
  color: string;
  /** شدّة التوهّج: خافت للجاهز، قويّ للمحدَّد والتدفق */
  strong?: boolean;
  pulse?: boolean;
}

/** شقوقٌ ثابتة على الحافّتين — ثابتة لا عشوائية كي يتطابق رسم الخادم والمتصفّح */
const CRACKS: Array<Array<[number, number]>> = [
  // [موضع العمق 0..1، البعد عن الخانات 0..1] — خطوطٌ متكسّرة لا أسهم
  [[0.04, 0.3], [0.1, 0.62], [0.15, 0.45], [0.24, 0.8]],
  [[0.3, 0.2], [0.36, 0.5], [0.4, 0.38], [0.5, 0.7]],
  [[0.56, 0.6], [0.62, 0.3], [0.7, 0.52], [0.76, 0.25]],
  [[0.82, 0.4], [0.88, 0.72], [0.93, 0.55], [0.98, 0.85]],
];

export function ArenaFloor({
  layout,
  lights,
}: {
  layout: ArenaLayout;
  /** «صفّ:عمود» ⇐ إضاءة؛ الصفّ هو موضعه في `layout.rows` */
  lights: Record<string, TileLight>;
}) {
  const { project, rows, width, height, rimX } = layout;
  const far = rows[0].z1 + RIM_Z;
  const near = -RIM_Z;
  const half = COLS / 2 + rimX;
  const pt = (x: number, z: number) => {
    const p = project(x, z);
    return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  };
  const nl = project(-half, near);
  const nr = project(half, near);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="arena-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a302b" />
          <stop offset="1" stopColor="#5b4b40" />
        </linearGradient>
        <linearGradient id="arena-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a201b" />
          <stop offset="1" stopColor="#0d0907" />
        </linearGradient>
        <linearGradient id="arena-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d5d51" />
          <stop offset="1" stopColor="#8a7767" />
        </linearGradient>
        <radialGradient id="arena-lava" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#ff5a1f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7a1600" stopOpacity="0" />
        </radialGradient>
        <filter id="arena-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* بِرَك الحِمَم على جانبي المنصّة — مصدرُ الضوء البرتقالي من الأسفل */}
      <ellipse cx={nl.x - 10} cy={nl.y - 40} rx="90" ry="120" fill="url(#arena-lava)" className="lava-flicker" />
      <ellipse cx={nr.x + 10} cy={nr.y - 90} rx="80" ry="140" fill="url(#arena-lava)" className="lava-flicker [animation-delay:1.3s]" />

      {/* الجدار الأمامي ثم سطح المنصّة */}
      <polygon
        points={`${pt(-half, near)} ${pt(half, near)} ${nr.x} ${nr.y + WALL} ${nl.x} ${nl.y + WALL}`}
        fill="url(#arena-wall)"
      />
      {[0.25, 0.5, 0.75].map((f) => {
        const x = nl.x + (nr.x - nl.x) * f;
        return <line key={f} x1={x} y1={nl.y + 2} x2={x} y2={nl.y + WALL} stroke="#000" strokeOpacity="0.45" strokeWidth="1.5" />;
      })}
      <polygon
        points={`${pt(-half, far)} ${pt(half, far)} ${pt(half, near)} ${pt(-half, near)}`}
        fill="url(#arena-top)"
        stroke="#9a8570"
        strokeOpacity="0.5"
        strokeWidth="2"
      />

      {/* فواصل البلاطات الكبيرة على الحافّة — بدونها تبدو الحافّة لوحاً واحداً أملس */}
      {rows.map((row) =>
        [-1, 1].map((side) => (
          <line
            key={`slab-${row.z0}-${side}`}
            x1={project(side * (COLS / 2 + 0.04), row.z0).x}
            y1={project(0, row.z0).y}
            x2={project(side * half, row.z0).x}
            y2={project(0, row.z0).y}
            stroke="#1a1310"
            strokeOpacity="0.7"
            strokeWidth="1.5"
          />
        ))
      )}

      {/* شقوق الحِمَم في الحافّتين: خطٌّ مضيء فوق خطٍّ مموّه يعطيه الوهج */}
      {[-1, 1].map((side) =>
        CRACKS.map((points, i) => {
          const d = points
            .map(([zf, xf], k) => `${k ? 'L' : 'M'}${pt(side * (COLS / 2 + 0.08 + (rimX - 0.16) * xf), near + (far - near) * zf)}`)
            .join(' ');
          return (
            <g key={`${side}-${i}`} className="lava-flicker" style={{ animationDelay: `${i * 0.7}s` }}>
              <path d={d} stroke="#ff6a1a" strokeWidth="5" fill="none" filter="url(#arena-blur)" opacity="0.8" />
              <path d={d} stroke="#ffd08a" strokeWidth="1.4" fill="none" />
            </g>
          );
        })
      )}

      {rows.map((row, ri) => {
        const cols = row.kind === 'middle' ? [0, 1, 2] : [0, 1, 2];
        return cols.map((c) => {
          const cx = (COLS - 1) / 2 - c;
          const x0 = cx - 0.46;
          const x1 = cx + 0.46;
          const z0 = row.z0 + 0.05;
          const z1 = row.z1 - 0.05;
          const quad = `${pt(x0, z1)} ${pt(x1, z1)} ${pt(x1, z0)} ${pt(x0, z0)}`;
          const inner = `${pt(x0 + 0.12, z1 - 0.12)} ${pt(x1 - 0.12, z1 - 0.12)} ${pt(x1 - 0.12, z0 + 0.12)} ${pt(x0 + 0.12, z0 + 0.12)}`;
          const light = lights[`${ri}:${c}`];
          const front = project(0, z0);
          const lip = 5 * layout.scaleAt(z0);
          return (
            <g key={`${ri}-${c}`}>
              {/* حافّة البلاطة الأمامية: السُّمك الذي يفصلها عن الأرضية */}
              <polygon
                points={`${pt(x0, z0)} ${pt(x1, z0)} ${project(x1, z0).x} ${front.y + lip} ${project(x0, z0).x} ${front.y + lip}`}
                fill="#1f1814"
              />
              <polygon points={quad} fill="url(#arena-stone)" />
              <polyline points={`${pt(x0, z0)} ${pt(x0, z1)} ${pt(x1, z1)}`} fill="none" stroke="#b8a48d" strokeOpacity="0.55" strokeWidth="1.4" />
              <polygon points={inner} fill="none" stroke="#4b3f37" strokeOpacity="0.6" strokeWidth="1.1" />
              {/* شعرةُ تشقّقٍ تختلف من بلاطةٍ لأخرى — مشتقّةٌ من الموضع كي تثبت بين الرسمين */}
              <polyline
                points={`${pt(x0 + 0.18 + ((ri + c) % 3) * 0.12, z1 - 0.18)} ${pt(cx + (((ri * 2 + c) % 3) - 1) * 0.12, (z0 + z1) / 2)} ${pt(x1 - 0.2 - (c % 2) * 0.1, z0 + 0.2)}`}
                fill="none"
                stroke="#3b312b"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
              {light && (
                <g className={light.pulse ? 'tile-pulse' : undefined}>
                  <polygon points={quad} fill={light.color} opacity={light.strong ? 0.34 : 0.16} />
                  <polygon points={quad} fill="none" stroke={light.color} strokeWidth={light.strong ? 3 : 2} opacity="0.95" />
                  <polygon points={quad} fill="none" stroke={light.color} strokeWidth="9" opacity="0.35" filter="url(#arena-blur)" />
                </g>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}

// ===================== الخلفية =====================

/** شررٌ صاعد: مواضعُ وتوقيتاتٌ مشتقّةٌ من الترتيب لا من Math.random — حتى يتطابق الترطيب */
const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: (i * 0.83) % 7,
  duration: 6 + (i % 5) * 1.4,
  size: 2 + (i % 3),
}));

/**
 * خلفية المباراة: أنقاض الغروب نفسها التي في شاشة التحضير، مُعتَّمةً إلى
 * ليلٍ خافت كي تبقى اللوحة أوضح ما في الشاشة، مع شررٍ صاعد من الحِمَم.
 */
export function ArenaBackdrop({ titanReady = false }: { titanReady?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08070c]">
      <svg viewBox="0 0 800 470" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-70">
        <SunsetRuins />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,14,0.55)_0%,rgba(8,7,14,0.25)_35%,rgba(20,8,4,0.55)_75%,rgba(6,5,8,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(255,90,20,0.22),transparent_70%)]" />
      {titanReady && <div className="titan-aura absolute inset-0" />}
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className={`ember absolute bottom-0 rounded-full ${titanReady ? 'bg-amber-200' : 'bg-orange-300'}`}
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
