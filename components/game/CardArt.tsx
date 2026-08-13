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
