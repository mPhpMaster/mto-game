import type { CardDef, Element } from '@/lib/game/types';

/**
 * فنّ الكروت — رسوم SVG تُولَّد من تعريف الكارت نفسه.
 *
 * لماذا التوليد بدل ملفّات صور: 86 تصميماً تبقى حادّة في كل المقاسات،
 * بلا أي بايت إضافي في الحزمة، وتتبع ألوان العنصر تلقائياً.
 * الشكل يُشتقّ من اسم الفصيلة فيبقى ثابتاً للكارت نفسه في كل مرة.
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

type Archetype = 'beast' | 'serpent' | 'avian' | 'orb' | 'golem' | 'wraith';
const ARCHETYPES: Archetype[] = ['beast', 'serpent', 'avian', 'orb', 'golem', 'wraith'];

interface Ink {
  main: string;
  deep: string;
  glow: string;
  /** المرحلة الثانية أضخم وأكثر زينة */
  evolved: boolean;
  seed: number;
}

// ===================== الوحوش =====================

function Beast({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved, seed } = ink;
  const horns = evolved ? 3 : seed % 2 ? 2 : 1;
  return (
    <g>
      {/* الذيل */}
      <path
        d={`M28 56 Q12 54 ${evolved ? 8 : 14} ${evolved ? 38 : 44}`}
        stroke={deep}
        strokeWidth={evolved ? 7 : 5}
        strokeLinecap="round"
        fill="none"
      />
      {/* الجسم */}
      <ellipse cx="52" cy="52" rx={evolved ? 24 : 20} ry={evolved ? 17 : 14} fill={main} />
      <ellipse cx="52" cy="57" rx={evolved ? 20 : 16} ry={evolved ? 10 : 8} fill={deep} opacity="0.45" />
      {/* الأرجل */}
      {[38, 50, 62].slice(0, evolved ? 3 : 2).map((x) => (
        <rect key={x} x={x} y={62} width={evolved ? 8 : 6} height={evolved ? 14 : 11} rx="3" fill={deep} />
      ))}
      {/* الرأس */}
      <circle cx="70" cy="36" r={evolved ? 16 : 13} fill={main} />
      <circle cx="70" cy="36" r={evolved ? 16 : 13} fill="none" stroke={deep} strokeWidth="1.5" opacity="0.6" />
      {/* القرون */}
      {Array.from({ length: horns }, (_, i) => (
        <path
          key={i}
          d={`M${62 + i * 8} 25 L${64 + i * 8} ${evolved ? 10 : 16} L${68 + i * 8} 25 Z`}
          fill={glow}
        />
      ))}
      {/* العينان */}
      <circle cx="65" cy="34" r="3" fill="#0b0e1c" />
      <circle cx="76" cy="34" r="3" fill="#0b0e1c" />
      <circle cx="66" cy="33" r="1" fill={glow} />
      <circle cx="77" cy="33" r="1" fill={glow} />
      {/* الأنياب */}
      <path d="M65 44 L67 49 L69 44 Z" fill="#fff" opacity="0.9" />
      <path d="M73 44 L75 49 L77 44 Z" fill="#fff" opacity="0.9" />
    </g>
  );
}

function Serpent({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  return (
    <g>
      <path
        d="M18 68 Q34 46 50 60 Q66 74 82 48"
        stroke={deep}
        strokeWidth={evolved ? 18 : 14}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M18 68 Q34 46 50 60 Q66 74 82 48"
        stroke={main}
        strokeWidth={evolved ? 12 : 9}
        strokeLinecap="round"
        fill="none"
      />
      {/* الزعانف — مثبّتة على منحنى الجسد لا طافية بجانبه */}
      {evolved && (
        <>
          <path d="M28 53 L34 38 L42 51 Z" fill={glow} opacity="0.85" />
          <path d="M60 66 L66 80 L74 65 Z" fill={glow} opacity="0.7" />
        </>
      )}
      {/* الرأس */}
      <ellipse cx="84" cy="42" rx={evolved ? 15 : 12} ry={evolved ? 12 : 10} fill={main} />
      <ellipse cx="84" cy="46" rx={evolved ? 12 : 9} ry={evolved ? 6 : 5} fill={deep} opacity="0.4" />
      <circle cx="80" cy="39" r="2.8" fill="#0b0e1c" />
      <circle cx="90" cy="39" r="2.8" fill="#0b0e1c" />
      <circle cx="81" cy="38" r="0.9" fill={glow} />
      <path d="M84 52 L84 60" stroke={glow} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Avian({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const span = evolved ? 34 : 26;
  return (
    <g>
      {/* الجناحان */}
      <path
        d={`M48 46 Q${48 - span} ${28} ${48 - span + 6} ${58} Q${48 - span / 2} 52 48 52 Z`}
        fill={main}
        opacity="0.95"
      />
      <path
        d={`M56 46 Q${56 + span} ${28} ${56 + span - 6} ${58} Q${56 + span / 2} 52 56 52 Z`}
        fill={main}
        opacity="0.95"
      />
      <path
        d={`M48 46 Q${48 - span} ${28} ${48 - span + 6} ${58}`}
        stroke={deep}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* الجسم */}
      <ellipse cx="52" cy="52" rx={evolved ? 13 : 10} ry={evolved ? 19 : 15} fill={deep} />
      <ellipse cx="52" cy="50" rx={evolved ? 8 : 6} ry={evolved ? 13 : 10} fill={main} opacity="0.7" />
      {/* الرأس */}
      <circle cx="52" cy="28" r={evolved ? 12 : 10} fill={main} />
      <path d={`M52 ${evolved ? 16 : 18} L58 ${evolved ? 6 : 10} L46 ${evolved ? 6 : 10} Z`} fill={glow} />
      <circle cx="48" cy="27" r="2.6" fill="#0b0e1c" />
      <circle cx="57" cy="27" r="2.6" fill="#0b0e1c" />
      {/* المنقار */}
      <path d="M52 33 L48 40 L56 40 Z" fill={glow} />
      {/* الذيل */}
      <path d="M52 70 L44 82 L60 82 Z" fill={deep} />
    </g>
  );
}

function Orb({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved, seed } = ink;
  const rings = evolved ? 3 : 2;
  return (
    <g>
      {Array.from({ length: rings }, (_, i) => (
        <ellipse
          key={i}
          cx="52"
          cy="48"
          rx={30 - i * 5}
          ry={11 - i * 2.5}
          fill="none"
          stroke={glow}
          strokeWidth="1.6"
          opacity={0.55 - i * 0.12}
          transform={`rotate(${-28 + i * 26 + (seed % 20)} 52 48)`}
        />
      ))}
      <circle cx="52" cy="48" r={evolved ? 21 : 17} fill={deep} />
      <circle cx="52" cy="48" r={evolved ? 17 : 13} fill={main} />
      <circle cx="47" cy="43" r={evolved ? 7 : 5} fill={glow} opacity="0.75" />
      {/* عين مركزية */}
      <ellipse cx="52" cy="48" rx={evolved ? 7 : 5.5} ry={evolved ? 10 : 8} fill="#0b0e1c" />
      <ellipse cx="52" cy="48" rx={evolved ? 3 : 2.4} ry={evolved ? 6 : 4.6} fill={glow} />
      {evolved &&
        [0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={52 + 30 * Math.cos((a * Math.PI) / 180)}
            cy={48 + 30 * Math.sin((a * Math.PI) / 180)}
            r="2.6"
            fill={glow}
            opacity="0.8"
          />
        ))}
    </g>
  );
}

function Golem({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  const w = evolved ? 40 : 32;
  return (
    <g>
      {/* الذراعان */}
      <rect x={52 - w / 2 - 11} y="44" width="10" height={evolved ? 28 : 22} rx="4" fill={deep} />
      <rect x={52 + w / 2 + 1} y="44" width="10" height={evolved ? 28 : 22} rx="4" fill={deep} />
      {/* الجذع */}
      <rect x={52 - w / 2} y="38" width={w} height={evolved ? 34 : 28} rx="6" fill={main} />
      <rect
        x={52 - w / 2 + 5}
        y="46"
        width={w - 10}
        height={evolved ? 16 : 12}
        rx="3"
        fill={glow}
        opacity="0.28"
      />
      {/* الرأس */}
      <rect x={52 - (evolved ? 14 : 11)} y={evolved ? 12 : 16} width={evolved ? 28 : 22} height={evolved ? 24 : 20} rx="5" fill={main} />
      <rect x={52 - (evolved ? 9 : 7)} y={evolved ? 20 : 23} width={evolved ? 18 : 14} height="6" rx="3" fill="#0b0e1c" />
      <circle cx={52 - (evolved ? 5 : 4)} cy={evolved ? 23 : 26} r="1.8" fill={glow} />
      <circle cx={52 + (evolved ? 5 : 4)} cy={evolved ? 23 : 26} r="1.8" fill={glow} />
      {/* الأقدام */}
      <rect x={52 - w / 2 + 2} y={evolved ? 72 : 66} width="12" height="9" rx="3" fill={deep} />
      <rect x={52 + w / 2 - 14} y={evolved ? 72 : 66} width="12" height="9" rx="3" fill={deep} />
      {evolved && <path d="M52 6 L58 14 L46 14 Z" fill={glow} />}
    </g>
  );
}

function Wraith({ ink }: { ink: Ink }) {
  const { main, deep, glow, evolved } = ink;
  return (
    <g>
      {/* الهالة */}
      <ellipse cx="52" cy="46" rx={evolved ? 30 : 24} ry={evolved ? 32 : 26} fill={main} opacity="0.16" />
      {/* الجسد المتموّج */}
      <path
        d={
          evolved
            ? 'M52 12 Q78 22 76 50 Q74 74 52 82 Q30 74 28 50 Q26 22 52 12 Z'
            : 'M52 18 Q73 27 71 50 Q69 70 52 77 Q35 70 33 50 Q31 27 52 18 Z'
        }
        fill={deep}
      />
      <path
        d={
          evolved
            ? 'M52 20 Q70 28 69 50 Q68 68 52 74 Q36 68 35 50 Q34 28 52 20 Z'
            : 'M52 25 Q66 32 65 50 Q64 64 52 70 Q40 64 39 50 Q38 32 52 25 Z'
        }
        fill={main}
        opacity="0.55"
      />
      {/* أذيال دخانية */}
      {[38, 52, 66].map((x, i) => (
        <path
          key={x}
          d={`M${x} ${evolved ? 78 : 72} q-3 8 2 ${evolved ? 14 : 10}`}
          stroke={main}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity={0.5 - i * 0.1}
        />
      ))}
      {/* العينان */}
      <ellipse cx="45" cy="42" rx="4" ry={evolved ? 7 : 5.5} fill={glow} />
      <ellipse cx="59" cy="42" rx="4" ry={evolved ? 7 : 5.5} fill={glow} />
      <ellipse cx="45" cy="43" rx="1.6" ry="3" fill="#0b0e1c" />
      <ellipse cx="59" cy="43" rx="1.6" ry="3" fill="#0b0e1c" />
      {evolved && (
        <>
          <path d="M34 24 L30 8 L44 20 Z" fill={glow} opacity="0.7" />
          <path d="M70 24 L74 8 L60 20 Z" fill={glow} opacity="0.7" />
        </>
      )}
    </g>
  );
}

const BODY: Record<Archetype, (p: { ink: Ink }) => React.JSX.Element> = {
  beast: Beast,
  serpent: Serpent,
  avian: Avian,
  orb: Orb,
  golem: Golem,
  wraith: Wraith,
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
  const pal = PALETTE[card.element];
  const seed = hash(card.species ?? card.id);
  const ink: Ink = { ...pal, evolved: card.stage === 2, seed };
  const gid = `art-${card.id}`;

  let body: React.JSX.Element;
  if (card.kind === 'monster') {
    const Body = BODY[ARCHETYPES[seed % ARCHETYPES.length]];
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
