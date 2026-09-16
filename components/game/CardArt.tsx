import type { Ability, CardDef, Element } from '@/lib/game/types';
import { type Archetype, archetypeOf } from '@/lib/game/archetypes';
import { artPathOf } from '@/lib/game/artManifest';

/**
 * فنّ الكروت — رسوم SVG تُولَّد من تعريف الكارت نفسه.
 *
 * لماذا التوليد بدل ملفّات صور: 86 تصميماً تبقى حادّة في كل المقاسات،
 * بلا أي بايت إضافي في الحزمة، وتتبع ألوان العنصر تلقائياً.
 * الشكل يأتي من جدول الطُّرُز في lib/game/archetypes.ts، والبذرة تبقى
 * لتنويع التفاصيل داخل الشكل الواحد.
 */

const PALETTE: Record<Element, { main: string; deep: string; glow: string }> = {
  fire: { main: '#ff8a4c', deep: '#a02b12', glow: '#ffd08a' },
  water: { main: '#4cb4ff', deep: '#134a8f', glow: '#a8e0ff' },
  grass: { main: '#5fdc93', deep: '#14663c', glow: '#c2f5d5' },
  electric: { main: '#ffd83d', deep: '#8a6a00', glow: '#fff2a8' },
  psychic: { main: '#cb84ff', deep: '#5b1f8f', glow: '#ecd0ff' },
  dark: { main: '#98a0bd', deep: '#252a45', glow: '#d3d8ea' },
  wild: { main: '#ff7ab5', deep: '#8f1f57', glow: '#ffd0e5' },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


export interface Ink {
  main: string;
  deep: string;
  glow: string;
  /** المرحلة الثانية أضخم وأكثر زينة */
  evolved: boolean;
  seed: number;
  /** خاصية الوحش — تُرسم علامتها على جسده */
  ability?: Ability;
}

// ===================== الوحوش =====================

/*
  الأسلوب: فانتازيا مُنمّقة مفترسة، لا دمى. ثلاثة أشياء صنعت الفرق عن
  الرسوم السابقة، وتتكرّر في كل طراز عمداً:
  - **العين الشقّية المتوهّجة** بدل الدائرة السوداء: البؤبؤ المستدير لطيف،
    والشقّ مفترس.
  - **الحوافّ الحادّة** (أشواك، مخالب، أنياب) بدل الأطراف المستديرة.
  - **التدرّج من اللون إلى عمقه** بدل اللون المسطّح: يعطي الجسد كتلة.
  والهيئة تختلف بين الطُّرُز لا اللونُ وحده، فيُعرف الوحش من ظلّه.
*/

function Shade({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stopColor={top} />
      <stop offset="1" stopColor={bottom} />
    </linearGradient>
  );
}

/** معرّف تدرّجٍ ثابت من البذرة — النسختان من البطاقة نفسها تتشاركانه بلا تعارض */
const gradId = (ink: Ink, name: string) => `${name}-${ink.seed % 100000}-${ink.evolved ? 2 : 1}`;

function SlitEye({ cx, cy, r = 3, glow }: { cx: number; cy: number; r?: number; glow: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r * 1.7} ry={r * 1.2} fill={glow} opacity="0.35" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.62} fill={glow} />
      <ellipse cx={cx} cy={cy} rx={r * 0.22} ry={r * 0.58} fill="#0b0e1c" />
    </g>
  );
}

function Beast({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved, seed } = ink;
  const g = gradId(ink, 'bst');
  const spikes = evolved ? 6 : 3 + (seed % 3);
  return (
    <g>
      <defs>
        <Shade id={g} top={main} bottom={deep} />
      </defs>
      {/* ذيلٌ ينتهي بشوكة */}
      <path d="M26 56 Q10 58 8 44 Q7 36 14 32" stroke={deep} strokeWidth={evolved ? 6 : 5} fill="none" strokeLinecap="round" />
      <path d="M14 32 L8 23 L20 29 Z" fill={glow} />
      {/* الساقان البعيدتان في الظلّ */}
      <path d="M30 60 L24 78 L30 79 L36 64 Z" fill={deep} />
      <path d="M64 60 L60 79 L66 79 L72 62 Z" fill={deep} />
      {/* جسدٌ منحنٍ متأهّب للانقضاض */}
      <path d="M20 56 Q22 38 42 36 Q58 33 72 40 L80 50 Q76 64 62 66 L36 67 Q22 66 20 56 Z" fill={`url(#${g})`} />
      <path d="M30 62 Q48 70 70 60" stroke="#000" strokeOpacity="0.35" strokeWidth="5" fill="none" />
      {[38, 46, 54].map((x) => (
        <path key={x} d={`M${x} 47 q3 6 1 12`} stroke={deep} strokeWidth="1.4" fill="none" opacity="0.75" />
      ))}
      {/* أشواك الظهر — عددها وطولها من البذرة، فتختلف الفصائل داخل الطراز */}
      {Array.from({ length: spikes }, (_, i) => {
        const x = 26 + i * (42 / spikes);
        const h = 8 + ((seed >> i) & 3) * 2 + (evolved ? 4 : 0);
        return <path key={i} d={`M${x} 40 L${x + 3} ${38 - h} L${x + 7} 39 Z`} fill={glow} opacity="0.92" />;
      })}
      {/* الساقان القريبتان بمخالب */}
      <path d="M40 62 L36 80 L43 80 L47 64 Z" fill={`url(#${g})`} />
      <path d="M70 58 L68 80 L75 80 L78 58 Z" fill={`url(#${g})`} />
      {[36, 68].map((x) => (
        <path key={x} d={`M${x} 80 l-2 3 l3 -1 l1 3 l2 -3 l2 2 l0 -4 Z`} fill="#f1f5f9" />
      ))}
      {/* الرأس: خطمٌ حادّ وفكٌّ مفتوح */}
      <path d="M68 38 Q74 26 86 28 L98 38 Q94 44 86 44 L74 48 Z" fill={`url(#${g})`} />
      <path d="M76 46 L96 42 L90 52 L78 52 Z" fill="#1a0b0b" />
      {[80, 84, 88, 92].map((x) => (
        <path key={x} d={`M${x} 43.5 l1.4 3.5 l1.4 -3.8 Z`} fill="#fff" />
      ))}
      {[82, 88].map((x) => (
        <path key={x} d={`M${x} 52 l1.4 -3.2 l1.4 3.2 Z`} fill="#fff" />
      ))}
      {/* قرنان مائلان للخلف */}
      <path d={`M76 30 Q70 ${evolved ? 10 : 16} ${evolved ? 56 : 60} ${evolved ? 12 : 16} Q68 22 72 34 Z`} fill={glow} />
      {evolved && <path d="M82 28 Q80 14 70 8 Q78 18 78 30 Z" fill={glow} opacity="0.8" />}
      <SlitEye cx={86} cy={34} r={3} glow={glow} />
      <path d="M80 30.5 L91 32.5" stroke="#000" strokeWidth="1.6" opacity="0.6" />
    </g>
  );
}

function Serpent({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const g = gradId(ink, 'srp');
  const body = 'M10 76 Q20 50 40 62 Q58 74 66 52 Q72 36 80 34';
  return (
    <g>
      <defs>
        <Shade id={g} top={main} bottom={deep} />
      </defs>
      {/* زعانف الظهر المسنّنة على طول الجسد */}
      {[
        [18, 58],
        [30, 55],
        [46, 66],
        [58, 62],
        [65, 46],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l-3 ${evolved ? -13 : -9} l9 6 Z`} fill={glow} opacity="0.9" />
      ))}
      <path d={body} stroke={deep} strokeWidth={evolved ? 21 : 17} strokeLinecap="round" fill="none" />
      <path d={body} stroke={`url(#${g})`} strokeWidth={evolved ? 15 : 12} strokeLinecap="round" fill="none" />
      {/* حراشف البطن */}
      <path d={body} stroke={glow} strokeOpacity="0.4" strokeWidth="3" strokeDasharray="2 4" fill="none" />
      {evolved && <path d="M36 62 Q30 78 44 82 Q42 72 48 66 Z" fill={glow} opacity="0.55" />}
      {/* الرأس: عُرفٌ مسنّن وفكّان مفتوحان بنابين طويلين */}
      <path d="M74 26 L62 12 L80 21 Z" fill={glow} />
      <path d="M80 22 L74 6 L88 20 Z" fill={glow} opacity={evolved ? 1 : 0.7} />
      <path d="M72 26 Q84 18 96 26 L100 34 Q94 40 86 40 L74 42 Q68 36 72 26 Z" fill={`url(#${g})`} />
      <path d="M78 40 L98 36 L92 49 L80 46 Z" fill="#120712" />
      <path d="M84 39 l2 8 l2 -8 Z" fill="#fff" />
      <path d="M92 37.5 l1.6 7 l1.6 -7 Z" fill="#fff" />
      <path d="M86 47 l1.4 -4 l1.4 4 Z" fill="#fff" opacity="0.9" />
      <SlitEye cx={88} cy={30} r={2.8} glow={glow} />
    </g>
  );
}

function Avian({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const g = gradId(ink, 'avn');
  const tip = evolved ? 2 : 8;
  return (
    <g>
      <defs>
        <Shade id={g} top={main} bottom={deep} />
      </defs>
      {/* جناحان غشائيان حادّا الأطراف — هيئة الوايفرن لا العصفور */}
      <path d={`M46 40 L${tip} 12 L14 30 L3 34 L16 44 L8 54 L30 50 Z`} fill={deep} />
      <path d={`M58 40 L${104 - tip} 12 L90 30 L101 34 L88 44 L96 54 L74 50 Z`} fill={deep} />
      {[
        [tip, 12],
        [3, 34],
        [8, 54],
      ].map(([x, y], i) => (
        <path key={`l${i}`} d={`M46 40 L${x} ${y}`} stroke={glow} strokeWidth="1.2" opacity="0.45" />
      ))}
      {[
        [104 - tip, 12],
        [101, 34],
        [96, 54],
      ].map(([x, y], i) => (
        <path key={`r${i}`} d={`M58 40 L${x} ${y}`} stroke={glow} strokeWidth="1.2" opacity="0.45" />
      ))}
      {/* ذيلٌ بثلاث شفرات */}
      <path d="M47 62 L40 84 L51 72 L57 85 L57 62 Z" fill={glow} opacity="0.85" />
      {/* الجذع والصدر */}
      <path d="M43 38 Q52 29 61 38 L63 60 Q52 71 41 60 Z" fill={`url(#${g})`} />
      {[44, 50, 56].map((y) => (
        <path key={y} d={`M46 ${y} L52 ${y + 4} L58 ${y}`} stroke={deep} strokeWidth="1.3" fill="none" opacity="0.8" />
      ))}
      {/* المخالب */}
      <path d="M45 64 l-3 9 l2 0 l1 -3 l1 4 l2 -4 l1 3 l0 -9 Z" fill="#f1f5f9" />
      <path d="M55 64 l0 9 l1 -3 l2 4 l1 -4 l1 3 l2 0 l-3 -9 Z" fill="#f1f5f9" />
      {/* الرأس: عُرفٌ وتاجٌ من الريش ومنقارٌ معقوف */}
      <path d="M48 20 L39 4 L53 16 Z" fill={glow} />
      <path d="M56 20 L64 3 L58 18 Z" fill={glow} />
      {evolved && <path d="M52 16 L52 0 L55 15 Z" fill={glow} />}
      <path d="M43 31 Q52 13 62 29 L60 37 L44 37 Z" fill={`url(#${g})`} />
      <path d="M49 33 L53 46 L58 33 Q53 30 49 33 Z" fill={glow} />
      <path d="M53 46 L51.5 42 L55 41 Z" fill="#1a1208" />
      <SlitEye cx={47.5} cy={28.5} r={2.3} glow={glow} />
      <SlitEye cx={57.5} cy={28.5} r={2.3} glow={glow} />
    </g>
  );
}

function Orb({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved, seed } = ink;
  const g = gradId(ink, 'orb');
  const spikes = evolved ? 14 : 10;
  return (
    <g>
      <defs>
        <radialGradient id={g} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor={main} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
      </defs>
      {/* مجسّات تتلوّى تحت الكرة */}
      {[36, 46, 58, 68].map((x, i) => (
        <path
          key={x}
          d={`M${x} 60 Q${x + (i % 2 ? 8 : -8)} 70 ${x + (i % 2 ? -2 : 2)} 84`}
          stroke={deep}
          strokeWidth={4 - i * 0.3}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* أشواكٌ تشعّ من الكرة */}
      {Array.from({ length: spikes }, (_, i) => {
        const a = (i / spikes) * Math.PI * 2 + (seed % 7) * 0.1;
        const b = a + 0.16;
        const c = a - 0.16;
        const R = i % 2 ? 30 : 34;
        return (
          <path
            key={i}
            d={`M${(52 + 20 * Math.cos(b)).toFixed(1)} ${(44 + 20 * Math.sin(b)).toFixed(1)} L${(52 + R * Math.cos(a)).toFixed(1)} ${(44 + R * Math.sin(a)).toFixed(1)} L${(52 + 20 * Math.cos(c)).toFixed(1)} ${(44 + 20 * Math.sin(c)).toFixed(1)} Z`}
            fill={glow}
            opacity="0.8"
          />
        );
      })}
      <circle cx="52" cy="44" r="22" fill={`url(#${g})`} stroke="#05060c" strokeOpacity="0.6" strokeWidth="2" />
      {/* فمٌ مسنّن تحت العين */}
      <path d="M38 55 Q52 64 66 55 L62 58 Q52 62 42 58 Z" fill="#12050f" />
      {[42, 47, 52, 57, 62].map((x) => (
        <path key={x} d={`M${x - 1.5} 56.5 l1.5 3.4 l1.5 -3.4 Z`} fill="#fff" opacity="0.9" />
      ))}
      {/* عينٌ مركزية واحدة — هي الوحش كلّه */}
      <ellipse cx="52" cy="40" rx="12" ry="8.5" fill="#f8fafc" opacity="0.85" />
      <circle cx="52" cy="40" r="6.5" fill={glow} />
      <ellipse cx="52" cy="40" rx="1.6" ry="6" fill="#0b0e1c" />
      <path d="M39 36 Q52 28 65 36" stroke="#05060c" strokeWidth="2.2" fill="none" opacity="0.7" />
      {/* شظايا تدور حولها */}
      {[0, 1, 2].map((i) => {
        const a = ((seed % 360) / 57.3) + i * 2.1;
        const x = 52 + 40 * Math.cos(a);
        const y = 44 + 30 * Math.sin(a);
        return (
          <path
            key={i}
            d={`M${x.toFixed(1)} ${(y - 4).toFixed(1)} l3 4 l-3 4 l-3 -4 Z`}
            fill={glow}
            opacity="0.85"
          />
        );
      })}
    </g>
  );
}

function Golem({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const g = gradId(ink, 'glm');
  return (
    <g>
      <defs>
        <Shade id={g} top={main} bottom={deep} />
      </defs>
      {/* ساقان ثقيلتان */}
      <path d="M34 64 L30 84 L45 84 L46 64 Z" fill={deep} />
      <path d="M58 64 L59 84 L74 84 L70 64 Z" fill={deep} />
      {/* الجذع العريض */}
      <path d="M26 32 L78 32 L72 66 L32 66 Z" fill={`url(#${g})`} />
      {/* شقوقٌ متوهّجة: طاقةٌ حبيسة في الصخر */}
      {['M36 38 L42 46 L38 54 L44 62', 'M66 36 L60 44 L66 52 L62 60'].map((d) => (
        <g key={d}>
          <path d={d} stroke={glow} strokeWidth="4" fill="none" opacity="0.35" />
          <path d={d} stroke={glow} strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <path d="M52 42 L59 50 L52 58 L45 50 Z" fill={glow} />
      <path d="M52 46 L55 50 L52 54 L49 50 Z" fill="#fff" opacity="0.7" />
      {/* كتفان صخريتان وقبضتان ضخمتان — الطراز الذي يُضرب ولا يسقط */}
      <path d="M8 30 L26 20 L38 32 L30 46 L12 46 Z" fill={main} stroke={deep} strokeWidth="1.5" />
      <path d="M96 30 L78 20 L66 32 L74 46 L92 46 Z" fill={main} stroke={deep} strokeWidth="1.5" />
      <path d="M12 46 L28 46 L30 64 L14 68 Z" fill={deep} />
      <path d="M92 46 L76 46 L74 64 L90 68 Z" fill={deep} />
      <path d="M8 64 L32 62 L30 78 L10 80 Z" fill={`url(#${g})`} stroke={deep} strokeWidth="1.2" />
      <path d="M96 64 L72 62 L74 78 L94 80 Z" fill={`url(#${g})`} stroke={deep} strokeWidth="1.2" />
      {/* رأسٌ غائرٌ بين الكتفين بخوذةٍ وشقّ نظر */}
      <path d="M41 16 L63 16 L66 32 L38 32 Z" fill={deep} />
      <rect x="44" y="23" width="16" height="3.6" rx="1.2" fill={glow} />
      {evolved && (
        <>
          <path d="M42 17 L34 2 L47 15 Z" fill={glow} />
          <path d="M62 17 L70 2 L57 15 Z" fill={glow} />
        </>
      )}
    </g>
  );
}

function Wraith({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const g = gradId(ink, 'wrt');
  return (
    <g>
      <defs>
        <Shade id={g} top={main} bottom="#05060c" />
      </defs>
      {/* عباءةٌ ممزّقة الحافّة */}
      <path
        d="M52 8 Q76 16 78 42 L84 80 L74 72 L68 84 L58 74 L52 86 L46 74 L36 84 L30 72 L20 80 L26 42 Q28 16 52 8 Z"
        fill={`url(#${g})`}
      />
      <path d="M52 8 Q66 20 62 60" stroke={deep} strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M52 8 Q38 20 42 60" stroke={deep} strokeWidth="2" fill="none" opacity="0.6" />
      {evolved && (
        <>
          <path d="M40 18 L28 0 L47 13 Z" fill={glow} opacity="0.85" />
          <path d="M64 18 L76 0 L57 13 Z" fill={glow} opacity="0.85" />
        </>
      )}
      {/* فراغ القلنسوة: لا وجه، عينان فقط */}
      <path d="M52 16 Q68 22 68 40 Q60 48 52 48 Q44 48 36 40 Q36 22 52 16 Z" fill="#04050a" />
      <SlitEye cx={45} cy={34} r={3.3} glow={glow} />
      <SlitEye cx={59} cy={34} r={3.3} glow={glow} />
      {/* يدان بمخالب طويلة */}
      <path d="M24 50 L10 56 L15 58 L6 62 L15 63 L9 70 L25 60 Z" fill={deep} />
      <path d="M80 50 L94 56 L89 58 L98 62 L89 63 L95 70 L79 60 Z" fill={deep} />
      {[
        [10, 56],
        [6, 62],
        [9, 70],
        [94, 56],
        [98, 62],
        [95, 70],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill={glow} />
      ))}
      {/* خيوط دخان تتبعه */}
      {[40, 52, 64].map((x, i) => (
        <path
          key={x}
          d={`M${x} 80 q-4 5 1 9`}
          stroke={main}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity={0.55 - i * 0.12}
        />
      ))}
    </g>
  );
}

/** هالة المرحلة الثانية: توهّجٌ خلف الجسد وتاجٌ من الأشواك الخافتة */
function EvolvedAura({ ink }: { ink: Ink }) {
  return (
    <g opacity="0.9">
      <ellipse cx="52" cy="46" rx="46" ry="38" fill={ink.glow} opacity="0.13" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x = 52 + 42 * Math.cos(a);
        const y = 46 + 34 * Math.sin(a);
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="1.3" fill={ink.glow} opacity="0.5" />;
      })}
    </g>
  );
}

/**
 * علامة الكلمة المفتاحية فوق الجسد: الشكل يقول ما يفعله الوحش قبل قراءة
 * كلمة — «سرعة» خطوطُ اندفاع، «حرق» جمرٌ متصاعد، «لعنة» سيجيلٌ زاحف،
 * «انسحاب» أثرُ مغادرة. ولكل عنصرٍ ثلاثُ علاماتٍ لا تتشابه مع غيره.
 */
function AbilityMark({ ink }: { ink: Ink }) {
  const { glow } = ink;
  switch (ink.ability) {
    // ── 🔥 نار ──
    case 'burn':
      return (
        <g fill="#ff8a3d" opacity="0.9">
          <path d="M12 74 q3 -8 0 -12 q7 4 5 12 Z" />
          <path d="M26 78 q2 -6 0 -9 q5 3 3.6 9 Z" opacity="0.8" />
          <path d="M84 72 q3.4 -9 0 -13 q8 4.4 5.6 13 Z" opacity="0.85" />
        </g>
      );
    case 'rage':
      return (
        <g stroke="#ff4d3d" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M6 22 L20 30" strokeWidth="2.6" />
          <path d="M4 32 L18 36" strokeWidth="2" />
          <path d="M98 22 L84 30" strokeWidth="2.6" />
          <path d="M100 32 L86 36" strokeWidth="2" />
        </g>
      );
    case 'overheat':
      return (
        <g>
          <path d="M40 58 L48 44 L46 56 L58 40" stroke="#ffd08a" strokeWidth="2.2" fill="none" />
          <path d="M34 66 L44 62 M62 64 L72 60" stroke="#ff5a1f" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </g>
      );

    // ── 🌿 عشب ──
    case 'growth':
      return (
        <g stroke="#7ddc7d" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M52 84 L52 66" strokeWidth="2.4" />
          <path d="M52 74 q-9 -2 -11 -10 q9 1 11 10" fill="#7ddc7d" stroke="none" />
          <path d="M52 70 q9 -3 10 -11 q-9 2 -10 11" fill="#7ddc7d" stroke="none" opacity="0.85" />
        </g>
      );
    case 'regen':
      return (
        <g stroke="#9ff5b8" fill="none" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
          <path d="M14 20 a9 9 0 1 1 -3 7" />
          <path d="M9 20 L14 19 L15 25" />
        </g>
      );
    case 'swarm':
      return (
        <g fill={glow} opacity="0.85">
          <circle cx="14" cy="70" r="3.4" />
          <circle cx="26" cy="78" r="2.6" />
          <circle cx="88" cy="68" r="3" />
          <circle cx="78" cy="78" r="2.2" />
        </g>
      );

    // ── 💧 ماء ──
    case 'flow_control':
      return (
        <g stroke="#7dd3fc" fill="none" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
          <path d="M8 66 q10 -8 20 0 t20 0" />
          <path d="M8 76 q10 -8 20 0 t20 0" opacity="0.7" />
        </g>
      );
    case 'bounce':
      return (
        <g stroke="#7dd3fc" fill="none" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
          <path d="M96 30 q-14 -12 -26 0" />
          <path d="M70 30 L70 22 M70 30 L78 30" />
        </g>
      );
    case 'purify':
      return (
        <g fill="#e0f2fe" opacity="0.9">
          <path d="M52 6 L54.5 14 L62 16.5 L54.5 19 L52 27 L49.5 19 L42 16.5 L49.5 14 Z" />
          <circle cx="30" cy="22" r="1.8" opacity="0.8" />
          <circle cx="74" cy="20" r="1.4" opacity="0.7" />
        </g>
      );

    // ── 🌑 ظلام ──
    case 'sacrifice':
      return (
        <g fill="#f43f5e" opacity="0.85">
          <path d="M52 72 q3 5 0 8 a3.6 3.6 0 0 1 -3.6 -3.6 q0 -2 3.6 -4.4 Z" />
          <path d="M34 78 q2.4 4 0 6.4 a3 3 0 0 1 -3 -3 q0 -1.6 3 -3.4 Z" opacity="0.7" />
          <path d="M70 76 q2.4 4 0 6.4 a3 3 0 0 1 -3 -3 q0 -1.6 3 -3.4 Z" opacity="0.6" />
        </g>
      );
    case 'graveyard':
      return (
        <g fill="none" stroke="#cbd5e1" strokeWidth="2" opacity="0.8">
          <path d="M14 84 L14 72 a7 7 0 0 1 14 0 L28 84" />
          <path d="M10 84 L32 84" />
        </g>
      );
    case 'curse':
      return (
        <g fill="none" stroke="#c084fc" strokeWidth="1.8" opacity="0.85">
          <circle cx="88" cy="18" r="9" />
          <path d="M88 9 L88 27 M79 18 L97 18 M82 12 L94 24 M94 12 L82 24" />
        </g>
      );

    // ── 🌪️ ريح ──
    case 'speed':
      return (
        <g stroke={glow} strokeLinecap="round" opacity="0.8">
          <path d="M2 38 L18 38" strokeWidth="2.4" />
          <path d="M0 48 L22 48" strokeWidth="3" />
          <path d="M4 58 L16 58" strokeWidth="2" />
        </g>
      );
    case 'dodge':
      return (
        <g stroke="#e2e8f0" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.75">
          <path d="M6 40 q12 -6 22 0 q10 6 18 0" />
          <path d="M8 52 q12 -6 22 0" opacity="0.7" />
        </g>
      );
    case 'mobility':
      return (
        <g stroke="#a5f3fc" fill="none" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
          <path d="M70 76 q14 -4 22 -16" />
          <path d="M92 60 L86 62 M92 60 L92 67" />
        </g>
      );

    // ── ⚡ كهرباء ──
    case 'overcharge':
      return (
        <g fill="#fde047" opacity="0.95">
          <path d="M10 10 L16 10 L12 18 L18 18 L8 30 L11 20 L6 20 Z" />
          <path d="M92 58 L98 58 L94 66 L100 66 L90 78 L93 68 L88 68 Z" />
        </g>
      );
    case 'chain':
      return (
        <g stroke="#fde047" fill="none" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
          <path d="M18 30 L30 40 L22 44 L34 54" />
          <path d="M86 30 L74 40 L82 44 L70 54" opacity="0.75" />
        </g>
      );
    case 'recharge':
      return (
        <g>
          <rect x="6" y="40" width="14" height="22" rx="2.5" fill="none" stroke={glow} strokeWidth="2" />
          <rect x="10" y="36" width="6" height="4" rx="1" fill={glow} />
          <rect x="9" y="48" width="8" height="11" rx="1" fill={glow} opacity="0.9" />
        </g>
      );
    default:
      return null;
  }
}

/** الوحش كاملاً: هالة التطوّر خلفه، ثم جسده، ثم علامة خاصيته فوقه */
function framed(Body: (p: { ink: Ink }) => React.JSX.Element, ink: Ink) {
  return (
    <g>
      {ink.evolved && <EvolvedAura ink={ink} />}
      <Body ink={ink} />
      <AbilityMark ink={ink} />
    </g>
  );
}

function BeastArt({ ink }: { ink: Ink }) {
  return framed(Beast, ink);
}
function SerpentArt({ ink }: { ink: Ink }) {
  return framed(Serpent, ink);
}
function AvianArt({ ink }: { ink: Ink }) {
  return framed(Avian, ink);
}
function OrbArt({ ink }: { ink: Ink }) {
  return framed(Orb, ink);
}
function GolemArt({ ink }: { ink: Ink }) {
  return framed(Golem, ink);
}
function WraithArt({ ink }: { ink: Ink }) {
  return framed(Wraith, ink);
}

const BODY: Record<Archetype, (p: { ink: Ink }) => React.JSX.Element> = {
  beast: BeastArt,
  serpent: SerpentArt,
  avian: AvianArt,
  orb: OrbArt,
  golem: GolemArt,
  wraith: WraithArt,
};

// ===================== الكروت غير الوحوش =====================

function ActionArt({ card, ink }: { card: CardDef; ink: Ink }) {
  const { main, deep, glow } = ink;
  switch (card.action) {
    case 'skip':
      return (
        <g>
          <circle cx="52" cy="46" r="26" fill="none" stroke={main} strokeWidth="8" />
          <line x1="34" y1="28" x2="70" y2="64" stroke={main} strokeWidth="8" strokeLinecap="round" />
          <circle cx="52" cy="46" r="26" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.6" />
        </g>
      );
    case 'draw2':
    case 'wild4':
      return (
        <g>
          {(card.action === 'wild4' ? [0, 1, 2, 3] : [0, 1]).map((i) => (
            <rect
              key={i}
              x={30 + i * 9}
              y={26 + i * 4}
              width="26"
              height="38"
              rx="4"
              fill={i % 2 ? deep : main}
              stroke={glow}
              strokeWidth="1.2"
              transform={`rotate(${-14 + i * 9} 52 46)`}
            />
          ))}
          <path d="M52 70 L52 82 M46 76 L52 82 L58 76" stroke={glow} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'reverse':
      return (
        <g fill="none" stroke={main} strokeWidth="6" strokeLinecap="round">
          <path d="M30 38 A22 22 0 0 1 74 40" />
          <path d="M74 54 A22 22 0 0 1 30 52" />
          <path d="M68 30 L76 40 L64 44" stroke={glow} />
          <path d="M36 62 L28 52 L40 48" stroke={glow} />
        </g>
      );
    case 'wild':
      return (
        <g>
          {['#ff6b3d', '#ffd23d', '#46d17f', '#3da5ff', '#c471ff', '#ff5fa2'].map((c, i) => (
            <path
              key={c}
              d={`M52 46 L${52 + 30 * Math.cos(((i * 60 - 90) * Math.PI) / 180)} ${
                46 + 30 * Math.sin(((i * 60 - 90) * Math.PI) / 180)
              } L${52 + 30 * Math.cos(((i * 60 - 30) * Math.PI) / 180)} ${
                46 + 30 * Math.sin(((i * 60 - 30) * Math.PI) / 180)
              } Z`}
              fill={c}
              opacity="0.9"
            />
          ))}
          <circle cx="52" cy="46" r="9" fill="#0b0e1c" />
          <circle cx="52" cy="46" r="4" fill="#fff" opacity="0.9" />
        </g>
      );
    default:
      return <circle cx="52" cy="46" r="20" fill={main} />;
  }
}

function TrapArt({ card, ink }: { card: CardDef; ink: Ink }) {
  const { main, deep, glow } = ink;
  const S = { fill: 'none', stroke: main, strokeWidth: 5, strokeLinecap: 'round' as const };
  switch (card.trap) {
    case 'ambush':
      return (
        <g>
          <path d="M26 24 L52 44 L78 24" {...S} />
          <path d="M26 68 L52 48 L78 68" {...S} />
          <circle cx="52" cy="46" r="7" fill={glow} />
        </g>
      );
    case 'barrier':
      return (
        <g>
          <path d="M52 18 L78 28 V50 Q78 68 52 78 Q26 68 26 50 V28 Z" fill={main} opacity="0.35" />
          <path d="M52 18 L78 28 V50 Q78 68 52 78 Q26 68 26 50 V28 Z" fill="none" stroke={main} strokeWidth="4" />
          <path d="M40 46 L49 56 L66 36" stroke={glow} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'net':
      return (
        <g stroke={main} strokeWidth="2.5" fill="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`v${i}`} x1={28 + i * 12} y1="22" x2={28 + i * 12} y2="70" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <line key={`h${i}`} x1="28" y1={22 + i * 16} x2="76" y2={22 + i * 16} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={`d${i}`} cx={28 + i * 12} cy={38} r="2" fill={glow} stroke="none" />
          ))}
        </g>
      );
    case 'blast':
      return (
        <g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d={`M52 46 L${52 + 32 * Math.cos((a * Math.PI) / 180)} ${46 + 32 * Math.sin((a * Math.PI) / 180)}`}
              stroke={main}
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
          <circle cx="52" cy="46" r="13" fill={glow} />
          <circle cx="52" cy="46" r="7" fill="#fff" opacity="0.85" />
        </g>
      );
    case 'curse':
      return (
        <g>
          <circle cx="52" cy="40" r="20" fill={main} />
          <ellipse cx="45" cy="38" rx="5" ry="7" fill="#0b0e1c" />
          <ellipse cx="59" cy="38" rx="5" ry="7" fill="#0b0e1c" />
          <path d="M40 58 H64 M46 58 V66 M58 58 V66" stroke={main} strokeWidth="4" strokeLinecap="round" />
          <path d="M52 12 L56 22 L48 22 Z" fill={glow} />
        </g>
      );
    case 'energy_steal':
      // شفط الطاقة: صاعقة تُسحب بأقواس نحو اليسار
      return (
        <g>
          <path d="M62 14 L38 50 H54 L50 78 L74 40 H58 Z" fill={main} stroke={glow} strokeWidth="2" />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${30 - i * 7} ${30 + i * 2} Q${20 - i * 7} 46 ${30 - i * 7} ${62 - i * 2}`}
              stroke={glow}
              strokeWidth={4 - i}
              fill="none"
              strokeLinecap="round"
              opacity={0.9 - i * 0.25}
            />
          ))}
        </g>
      );
    case 'counter_surge':
      // شحن مضاد: صاعقة داخل مقياس شحن متصاعد
      return (
        <g>
          <rect x="20" y="16" width="64" height="60" rx="10" fill="none" stroke={main} strokeWidth="4" />
          <path d="M56 24 L38 50 H50 L46 70 L66 44 H54 Z" fill={main} stroke={glow} strokeWidth="1.5" />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={26 + i * 9}
              y={68 - i * 8}
              width="6"
              height={6 + i * 8}
              rx="2"
              fill={glow}
              opacity={0.45 + i * 0.2}
            />
          ))}
          <path d="M84 34 V58" stroke={main} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'relic_break':
      return (
        <g>
          <path d="M36 30 L52 20 L68 30 L62 62 H42 Z" fill={deep} stroke={main} strokeWidth="3" />
          <path d="M52 20 L46 44 L58 48 L50 66" stroke={glow} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M22 68 L38 54 M82 68 L66 54" stroke={main} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'mirror':
      return (
        <g>
          <ellipse cx="52" cy="46" rx="22" ry="28" fill={main} opacity="0.3" stroke={main} strokeWidth="4" />
          <path d="M40 30 L64 62" stroke={glow} strokeWidth="4" strokeLinecap="round" />
          <path d="M30 46 L18 46 M74 46 L86 46" stroke={main} strokeWidth="4" strokeLinecap="round" />
          <path d="M24 40 L18 46 L24 52" stroke={glow} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );

    // ===== الموجة الثانية =====
    case 'thorns':
      return (
        <g>
          <circle cx="52" cy="46" r="16" fill={deep} stroke={main} strokeWidth="3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d="M52 30 L48 16 L56 16 Z"
              fill={main}
              transform={`rotate(${a} 52 46)`}
            />
          ))}
          <circle cx="52" cy="46" r="5" fill={glow} />
        </g>
      );
    case 'chain':
      return (
        <g fill="none" stroke={main} strokeWidth="5">
          <ellipse cx="34" cy="34" rx="11" ry="8" transform="rotate(-40 34 34)" />
          <ellipse cx="52" cy="46" rx="11" ry="8" transform="rotate(-40 52 46)" />
          <ellipse cx="70" cy="58" rx="11" ry="8" transform="rotate(-40 70 58)" />
          <path d="M22 70 L82 22" stroke={glow} strokeWidth="3" opacity="0.6" />
        </g>
      );
    case 'spike_wall':
      return (
        <g>
          <rect x="24" y="52" width="56" height="20" rx="3" fill={deep} stroke={main} strokeWidth="3" />
          {[30, 44, 58, 72].map((x) => (
            <path key={x} d={`M${x} 52 L${x + 6} 22 L${x + 12} 52 Z`} fill={main} />
          ))}
          <path d="M24 62 H80" stroke={glow} strokeWidth="2" opacity="0.7" />
        </g>
      );
    case 'siphon_strike':
      return (
        <g>
          <path d="M52 74 C26 56 30 30 46 30 C51 30 52 36 52 36 C52 36 53 30 58 30 C74 30 78 56 52 74 Z" fill={main} />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${30 + i * 22} 20 L${34 + i * 22} 34`}
              stroke={glow}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case 'disarm':
      return (
        <g>
          <path d="M32 68 L64 26" stroke={main} strokeWidth="7" strokeLinecap="round" />
          <path d="M58 20 L74 34 L66 42 L50 28 Z" fill={deep} stroke={main} strokeWidth="3" />
          <path d="M26 24 L78 70" stroke={glow} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        </g>
      );
    case 'frost':
      return (
        <g stroke={main} strokeWidth="4" strokeLinecap="round">
          {[0, 60, 120].map((a) => (
            <path key={a} d="M52 20 V72" transform={`rotate(${a} 52 46)`} />
          ))}
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={`b${a}`} d="M52 26 L46 34 M52 26 L58 34" transform={`rotate(${a} 52 46)`} strokeWidth="3" />
          ))}
          <circle cx="52" cy="46" r="5" fill={glow} stroke="none" />
        </g>
      );
    case 'sinkhole':
      return (
        <g>
          <ellipse cx="52" cy="58" rx="30" ry="14" fill={deep} />
          <ellipse cx="52" cy="56" rx="20" ry="9" fill="#05070f" />
          <path d="M40 26 L52 44 L64 26" fill="none" stroke={main} strokeWidth="5" strokeLinecap="round" />
          <path d="M52 18 V44" stroke={glow} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'tax':
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx="52" cy={62 - i * 12} rx="20" ry="7" fill={i === 2 ? main : deep} stroke={main} strokeWidth="2" />
          ))}
          <path d="M76 30 L88 22 M76 30 L86 36" stroke={glow} strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'mimic':
      return (
        <g>
          <rect x="24" y="24" width="34" height="46" rx="4" fill={deep} stroke={main} strokeWidth="3" />
          <rect x="46" y="30" width="34" height="46" rx="4" fill={main} opacity="0.55" stroke={main} strokeWidth="3" />
          <circle cx="63" cy="52" r="5" fill={glow} />
        </g>
      );
    case 'weaken':
      return (
        <g>
          <path d="M34 30 Q52 18 70 30 L64 62 Q52 72 40 62 Z" fill={deep} stroke={main} strokeWidth="3" />
          <path d="M40 44 H64" stroke={glow} strokeWidth="6" strokeLinecap="round" />
          <path d="M30 74 L74 74" stroke={main} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case 'soul_tithe':
      return (
        <g>
          <path d="M52 72 C28 54 32 30 47 30 C51 30 52 35 52 35 C52 35 53 30 57 30 C72 30 76 54 52 72 Z" fill={deep} stroke={main} strokeWidth="3" />
          <circle cx="52" cy="46" r="7" fill={glow} />
          <path d="M52 20 L52 8" stroke={glow} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'plague':
      return (
        <g>
          <circle cx="52" cy="46" r="18" fill={deep} stroke={main} strokeWidth="3" />
          {[30, 90, 150, 210, 270, 330].map((a) => (
            <circle key={a} cx="52" cy="20" r="6" fill={main} transform={`rotate(${a} 52 46)`} />
          ))}
          <circle cx="46" cy="42" r="3" fill={glow} />
          <circle cx="58" cy="50" r="3" fill={glow} />
        </g>
      );
    case 'time_theft':
      return (
        <g>
          <circle cx="52" cy="46" r="24" fill="none" stroke={main} strokeWidth="4" />
          <path d="M52 30 V46 L64 54" stroke={glow} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M74 22 L88 14 M74 22 L86 30" stroke={main} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'hex':
      return (
        <g>
          <path d="M52 16 L84 34 V64 L52 82 L20 64 V34 Z" fill="none" stroke={main} strokeWidth="4" />
          <path d="M38 38 L66 58 M66 38 L38 58" stroke={glow} strokeWidth="5" strokeLinecap="round" />
          <circle cx="52" cy="48" r="4" fill={glow} />
        </g>
      );
    case 'drought':
      return (
        <g>
          <circle cx="52" cy="34" r="14" fill={main} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M52 14 V6" stroke={main} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 52 34)`} />
          ))}
          <path d="M28 62 Q40 56 52 62 T76 62" fill="none" stroke={deep} strokeWidth="4" />
          <path d="M32 72 H72" stroke={glow} strokeWidth="3" opacity="0.5" />
        </g>
      );
    case 'bramble':
      return (
        <g fill="none" stroke={main} strokeWidth="4" strokeLinecap="round">
          <path d="M24 74 Q40 50 34 26" />
          <path d="M80 74 Q64 50 70 26" />
          <path d="M52 78 V34" />
          {[34, 46, 58].map((y) => (
            <g key={y}>
              <path d={`M52 ${y} L42 ${y - 8}`} strokeWidth="3" />
              <path d={`M52 ${y} L62 ${y - 8}`} strokeWidth="3" />
            </g>
          ))}
          <circle cx="52" cy="28" r="5" fill={glow} stroke="none" />
        </g>
      );
    case 'regrowth':
      return (
        <g>
          <path d="M52 76 V40" stroke={main} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M52 48 Q30 44 30 24 Q52 24 52 48 Z" fill={main} opacity="0.8" />
          <path d="M52 40 Q74 36 74 18 Q52 18 52 40 Z" fill={glow} opacity="0.7" />
          <ellipse cx="52" cy="78" rx="20" ry="5" fill={deep} />
        </g>
      );
    case 'fortify':
      return (
        <g>
          <path d="M52 16 L80 27 V50 Q80 70 52 80 Q24 70 24 50 V27 Z" fill={main} opacity="0.3" stroke={main} strokeWidth="4" />
          <path d="M52 16 V80" stroke={main} strokeWidth="3" opacity="0.6" />
          <path d="M24 44 H80" stroke={main} strokeWidth="3" opacity="0.6" />
          {[36, 68].map((x) => (
            <circle key={x} cx={x} cy="34" r="4" fill={glow} />
          ))}
        </g>
      );

    default:
      return <circle cx="52" cy="46" r="20" fill={main} />;
  }
}

function SpellArt({ card, ink }: { card: CardDef; ink: Ink }) {
  const { main, deep, glow } = ink;
  switch (card.spell) {
    case 'heal':
      return (
        <g>
          <path
            d="M52 76 C22 56 26 28 44 28 C50 28 52 34 52 34 C52 34 54 28 60 28 C78 28 82 56 52 76 Z"
            fill={main}
          />
          <path d="M52 40 V60 M42 50 H62" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        </g>
      );
    case 'boost':
      return (
        <g>
          <path d="M52 12 L66 40 H58 L58 74 H46 V40 H38 Z" fill={main} stroke={glow} strokeWidth="2" />
          <path d="M28 60 L36 52 M76 60 L68 52" stroke={glow} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'storm':
      return (
        <g>
          <ellipse cx="50" cy="34" rx="26" ry="14" fill={deep} />
          <ellipse cx="62" cy="30" rx="16" ry="11" fill={main} opacity="0.8" />
          {[36, 52, 68].map((x, i) => (
            <path
              key={x}
              d={`M${x} 48 L${x - 6} 62 H${x + 1} L${x - 4} 76`}
              stroke={glow}
              strokeWidth={4 - i * 0.4}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case 'surge':
      return (
        <g>
          <path d="M58 10 L32 50 H50 L44 82 L72 40 H54 Z" fill={main} stroke={glow} strokeWidth="2" />
          <circle cx="52" cy="46" r="30" fill="none" stroke={main} strokeWidth="1.5" opacity="0.35" />
        </g>
      );
    case 'search':
      return (
        <g>
          <circle cx="46" cy="40" r="20" fill="none" stroke={main} strokeWidth="6" />
          <circle cx="46" cy="40" r="13" fill={glow} opacity="0.28" />
          <line x1="60" y1="55" x2="78" y2="74" stroke={main} strokeWidth="7" strokeLinecap="round" />
          <path d="M40 34 L44 42 L52 38" stroke={glow} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'swap':
      return (
        <g fill="none" stroke={main} strokeWidth="6" strokeLinecap="round">
          <path d="M28 34 H70" />
          <path d="M60 24 L72 34 L60 44" stroke={glow} />
          <path d="M76 60 H34" />
          <path d="M44 50 L32 60 L44 70" stroke={glow} />
        </g>
      );
    case 'amplify':
      return (
        <g>
          <path d="M30 66 L44 26 L52 46 L60 26 L74 66" fill="none" stroke={main} strokeWidth="6" strokeLinecap="round" />
          <circle cx="52" cy="72" r="6" fill={glow} />
          <path d="M18 40 Q10 46 18 52 M86 40 Q94 46 86 52" stroke={main} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'revive':
      return (
        <g>
          <path d="M52 78 Q30 62 30 44 A22 22 0 1 1 74 44 Q74 62 52 78 Z" fill={main} opacity="0.35" />
          <path d="M52 18 V50 M38 34 L52 50 L66 34" stroke={glow} strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="52" cy="70" rx="18" ry="5" fill={deep} />
        </g>
      );
    case 'purge':
      return (
        <g>
          <path d="M34 26 L70 62 M70 26 L34 62" stroke={main} strokeWidth="8" strokeLinecap="round" />
          <circle cx="52" cy="44" r="28" fill="none" stroke={glow} strokeWidth="2" opacity="0.5" />
          <circle cx="52" cy="44" r="6" fill={glow} />
        </g>
      );

    // ===== الموجة الثانية =====
    case 'strike':
      return (
        <g>
          <path d="M30 72 L70 24" stroke={main} strokeWidth="9" strokeLinecap="round" />
          <path d="M64 18 L82 32 L72 42 L56 28 Z" fill={glow} stroke={main} strokeWidth="2" />
          <path d="M24 78 L36 66" stroke={deep} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'bolt':
      return (
        <g>
          <path d="M58 10 L32 48 H50 L44 82 L74 40 H54 Z" fill={main} stroke={glow} strokeWidth="2" />
          <path d="M58 10 L32 48 H50 L44 82" fill="none" stroke={glow} strokeWidth="2" opacity="0.7" />
        </g>
      );
    case 'drain_life':
      return (
        <g>
          <path d="M34 66 C16 50 20 28 33 28 C37 28 38 33 38 33 C38 33 39 28 43 28 C56 28 60 50 38 68 Z" fill={deep} stroke={main} strokeWidth="2" />
          <path d="M70 70 C54 54 58 34 69 34 C73 34 74 38 74 38 C74 38 75 34 79 34 C90 34 92 54 74 70 Z" fill={main} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={48 + i * 6} cy={50 - i * 5} r={2.5 - i * 0.4} fill={glow} />
          ))}
        </g>
      );
    case 'shield_wall':
      return (
        <g>
          {[30, 52, 74].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${24 + (i === 1 ? 0 : 6)} L${x + 15} ${30 + (i === 1 ? 0 : 6)} V${52 + (i === 1 ? 0 : 6)} Q${x + 15} ${64 + (i === 1 ? 0 : 6)} ${x} ${70 + (i === 1 ? 0 : 6)} Q${x - 15} ${64 + (i === 1 ? 0 : 6)} ${x - 15} ${52 + (i === 1 ? 0 : 6)} V${30 + (i === 1 ? 0 : 6)} Z`}
              fill={i === 1 ? main : deep}
              opacity={i === 1 ? 0.9 : 0.65}
              stroke={main}
              strokeWidth="3"
            />
          ))}
          <circle cx="52" cy="44" r="5" fill={glow} />
        </g>
      );
    case 'rally':
      return (
        <g>
          {[28, 52, 76].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${70 - i * 4} V${34 - i * 6}`}
              stroke={main}
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
          {[28, 52, 76].map((x, i) => (
            <path key={`h${x}`} d={`M${x} ${34 - i * 6} l12 6 l-12 6 z`} fill={glow} />
          ))}
          <path d="M20 78 H84" stroke={deep} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'recall':
      return (
        <g fill="none" stroke={main} strokeWidth="5" strokeLinecap="round">
          <path d="M76 46 A24 24 0 1 1 52 22" />
          <path d="M52 10 L52 34 L40 22 Z" fill={glow} stroke="none" />
          <circle cx="52" cy="46" r="6" fill={deep} stroke={main} strokeWidth="3" />
        </g>
      );
    case 'foresight':
      return (
        <g>
          <path d="M18 46 Q52 18 86 46 Q52 74 18 46 Z" fill={deep} stroke={main} strokeWidth="4" />
          <circle cx="52" cy="46" r="13" fill={main} />
          <circle cx="52" cy="46" r="6" fill="#05070f" />
          <circle cx="56" cy="41" r="3" fill={glow} />
        </g>
      );
    case 'mana_well':
      return (
        <g>
          <ellipse cx="52" cy="66" rx="26" ry="10" fill={deep} stroke={main} strokeWidth="3" />
          <path d="M30 66 Q52 30 74 66" fill={main} opacity="0.45" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={40 + i * 12} cy={38 - i * 6} r={4 - i * 0.6} fill={glow} />
          ))}
          <path d="M52 24 V12" stroke={glow} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'cleanse':
      return (
        <g>
          <circle cx="52" cy="46" r="24" fill="none" stroke={main} strokeWidth="4" />
          <path d="M38 46 L48 57 L68 34" stroke={glow} strokeWidth="6" fill="none" strokeLinecap="round" />
          {[20, 84].map((x) => (
            <path key={x} d={`M${x} 20 L${x} 30`} stroke={main} strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
      );
    case 'overload':
      return (
        <g>
          <path d="M56 10 L34 46 H50 L46 82 L72 42 H54 Z" fill={main} stroke={glow} strokeWidth="2" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={22 + i * 20} cy={70 - (i % 2) * 46} r="3" fill={glow} opacity="0.8" />
          ))}
        </g>
      );
    case 'mirror_image':
      return (
        <g>
          <circle cx="36" cy="46" r="17" fill={main} />
          <circle cx="68" cy="46" r="17" fill={main} opacity="0.45" stroke={main} strokeWidth="2" />
          <path d="M52 16 V76" stroke={glow} strokeWidth="3" strokeDasharray="5 5" />
        </g>
      );
    case 'banish':
      return (
        <g>
          <ellipse cx="52" cy="66" rx="26" ry="10" fill="#05070f" stroke={main} strokeWidth="3" />
          <path d="M40 60 Q38 30 52 16 Q66 30 64 60" fill={deep} stroke={main} strokeWidth="3" />
          <path d="M34 26 L70 62 M70 26 L34 62" stroke={glow} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'chain_lightning':
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${28 + i * 22} 12 L${18 + i * 22} 42 H${28 + i * 22} L${20 + i * 22} 78`}
              fill="none"
              stroke={i === 1 ? glow : main}
              strokeWidth={4 - i * 0.3}
              strokeLinecap="round"
            />
          ))}
          <path d="M18 46 H84" stroke={main} strokeWidth="2" opacity="0.5" />
        </g>
      );
    case 'titan_call':
      return (
        <g>
          <path d="M52 12 L74 30 L66 68 H38 L30 30 Z" fill={deep} stroke={main} strokeWidth="4" />
          <circle cx="44" cy="40" r="4" fill={glow} />
          <circle cx="60" cy="40" r="4" fill={glow} />
          <path d="M42 54 L52 62 L62 54" fill="none" stroke={main} strokeWidth="4" strokeLinecap="round" />
          {[26, 78].map((x) => (
            <path key={x} d={`M${x} 74 l4 8 l-8 0 z`} fill={glow} />
          ))}
        </g>
      );
    case 'graft':
      return (
        <g>
          <path d="M52 78 V44" stroke={main} strokeWidth="5" strokeLinecap="round" />
          <path d="M52 52 Q32 48 32 30 Q52 30 52 52 Z" fill={main} opacity="0.85" />
          <path d="M52 44 Q72 40 72 22 Q52 22 52 44 Z" fill={glow} opacity="0.75" />
          <path d="M42 62 H62" stroke={deep} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'barricade':
      return (
        <g>
          <path d="M52 14 L80 26 V50 Q80 70 52 82 Q24 70 24 50 V26 Z" fill={main} opacity="0.35" stroke={main} strokeWidth="4" />
          {[34, 46, 58].map((y) => (
            <path key={y} d={`M28 ${y} H76`} stroke={main} strokeWidth="4" opacity="0.7" />
          ))}
          <circle cx="52" cy="70" r="5" fill={glow} />
        </g>
      );
    case 'reflect':
      return (
        <g>
          <path d="M52 14 V78" stroke={main} strokeWidth="4" strokeDasharray="6 5" />
          <path d="M40 30 L18 46 L40 62" fill="none" stroke={glow} strokeWidth="5" strokeLinecap="round" />
          <path d="M64 30 L86 46 L64 62" fill="none" stroke={main} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'second_wind':
      return (
        <g fill="none" stroke={main} strokeWidth="5" strokeLinecap="round">
          <path d="M28 34 A24 24 0 1 1 28 58" />
          <path d="M20 26 L32 36 L18 42" stroke={glow} />
          <path d="M62 40 L54 50 H62 L54 62" stroke={glow} strokeWidth="4" />
        </g>
      );

    default:
      return <circle cx="52" cy="46" r="20" fill={main} />;
  }
}

function FragmentArt({ card, ink }: { card: CardDef; ink: Ink }) {
  const { main, deep, glow } = ink;
  const base = (
    <>
      <circle cx="52" cy="46" r="30" fill={main} opacity="0.12" />
      <circle cx="52" cy="46" r="30" fill="none" stroke={glow} strokeWidth="1.2" opacity="0.45" strokeDasharray="4 5" />
    </>
  );
  switch (card.fragment) {
    case 'heart':
      return (
        <g>
          {base}
          <path d="M52 72 C26 54 30 28 46 28 C51 28 52 33 52 33 C52 33 53 28 58 28 C74 28 78 54 52 72 Z" fill={main} stroke={glow} strokeWidth="2" />
          <path d="M44 42 L52 50 L60 38" stroke={glow} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'fang':
      return (
        <g>
          {base}
          <path d="M38 18 Q52 22 66 18 L58 74 Q52 82 46 74 Z" fill={main} stroke={glow} strokeWidth="2" />
          <path d="M46 30 L52 60" stroke={deep} strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        </g>
      );
    case 'shield':
      return (
        <g>
          {base}
          <path d="M52 16 L78 26 V48 Q78 68 52 78 Q26 68 26 48 V26 Z" fill={main} stroke={glow} strokeWidth="2" />
          <path d="M52 28 L52 66 M36 40 H68" stroke={deep} strokeWidth="4" opacity="0.55" strokeLinecap="round" />
        </g>
      );
    case 'crown':
      return (
        <g>
          {base}
          <path d="M26 66 L30 26 L42 42 L52 20 L62 42 L74 26 L78 66 Z" fill={main} stroke={glow} strokeWidth="2" />
          <rect x="26" y="66" width="52" height="9" rx="3" fill={deep} />
          {[36, 52, 68].map((x) => (
            <circle key={x} cx={x} cy="56" r="3.4" fill={glow} />
          ))}
        </g>
      );
    default:
      return <circle cx="52" cy="46" r="20" fill={main} />;
  }
}

// ===================== المكوّن =====================

export default function CardArt({ card, className }: { card: CardDef; className?: string }) {
  /**
   * الرسم المُصوَّر يسبق المولّد حين يوجد. البيان مُولَّد عند البناء
   * (`npm run art:scan`) فلا يومض البديل قبل الصورة ولا يظهر مربّع مكسور.
   *
   * `object-cover`: النصوص تطلب صورة مربّعة والنافذة أعرض من مربّع، فالقصّ
   * من الأعلى والأسفل مقصود — والوحش في وسط الإطار فلا يقطع القصُّ منه طرفاً.
   */
  const art = artPathOf(card.id);
  if (art) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ملفّ محلّي بمقاس ثابت، لا يحتاج مُحسّن الصور
      <img
        src={art}
        alt={`رسم ${card.name.ar}`}
        // المركز أعلى من المنتصف قليلاً: رأس الوحش يُقرأ قبل قدميه، والقصّ يقع على الأرض
        className={`${className ?? ''} object-cover object-[50%_38%]`}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
  }

  const pal = PALETTE[card.element];
  const seed = hash(card.species ?? card.id);
  const ink: Ink = { ...pal, evolved: card.stage === 2, seed, ability: card.ability };
  const gid = `art-${card.id}`;

  let body: React.JSX.Element;
  if (card.kind === 'monster') {
    // الطراز مكتوب في lib/game/archetypes.ts لا محسوب من الهاش: الشكل هوية
    // تشترك فيها البطاقة مع مجسّمها ثلاثي الأبعاد، فلا يجوز أن تقرّرها البذرة.
    const Body = BODY[archetypeOf(card.species) ?? 'beast'];
    body = <Body ink={ink} />;
  } else if (card.kind === 'action') {
    body = <ActionArt card={card} ink={ink} />;
  } else if (card.kind === 'trap') {
    body = <TrapArt card={card} ink={ink} />;
  } else if (card.kind === 'spell') {
    body = <SpellArt card={card} ink={ink} />;
  } else {
    body = <FragmentArt card={card} ink={ink} />;
  }

  return (
    <svg
      viewBox="0 0 104 88"
      className={className}
      role="img"
      aria-label={`رسم ${card.name}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={pal.main} stopOpacity="0.36" />
          <stop offset="70%" stopColor={pal.deep} stopOpacity="0.16" />
          <stop offset="100%" stopColor="#05070f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="104" height="88" fill={`url(#${gid})`} rx="8" />
      {body}
    </svg>
  );
}

export { PALETTE as ART_PALETTE };

/**
 * أشكال الطُّرُز الستّة تُصدَّر ليعيد استعمالَها مسرحُ التحضير: الشكل هوية
 * واحدة تشترك فيها البطاقة والمجسّم، فرسمُه مرّتين يجعلهما ينحرفان.
 */
export { BODY as ARCHETYPE_BODY };

/**
 * بذرة الرسم — من هوية البطاقة لا من نسخة الكارت في المباراة.
 *
 * كنتُ أشتقّها في مسرح التحضير من `uid` النسخة، و`uid` عدّادٌ في وحدةٍ
 * يحيا في الخادم عبر الطلبات ويبدأ من الصفر في المتصفّح — فتختلف البذرة بين
 * الرسمتين، ويختلف عدد القرون، فينهار الترطيب. والأصحّ منطقاً أيضاً: نسختان
 * من البطاقة نفسها يجب أن تُرسما سواءً.
 */
export const artSeed = (card: CardDef): number => hash(card.species ?? card.id);
