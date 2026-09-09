'use client';

import type { GearId, WeatherId } from '@/lib/game/loadout';

/**
 * الطبقة الفنّية لمرحلة التحضير: أيقونات التجهيز، ومشاهد الطقس، والمنصّة
 * الإيزومترية وخلفيّتها.
 *
 * **لماذا SVG لا إيموجي:** الإيموجي يرسمه خطّ النظام، فيختلف بين ويندوز
 * وأندرويد وiOS، ويحمل أسلوباً ليس أسلوب اللعبة، ولا يقبل تلويناً ولا
 * توهّجاً. و«☁️» للضباب لم يكن يُرسم أصلاً على خطّ الاختبار.
 *
 * **ولماذا SVG لا تحويلات CSS ثلاثية الأبعاد:** المنصّة تحتاج وجوهاً جانبية
 * وظلالاً وتوهّجاً لكل بلاطة على حدة. بـ`rotateX` تصير كل عناصر المحتوى
 * مائلةً فتحتاج دوراناً مضادّاً، ويتداخل ترتيب العمق. الإسقاط الإيزومتري
 * حسبةٌ من سطرين تعطي إحداثيات دقيقة أضع عليها HTML عادياً غير مائل.
 */

// ===================== أيقونات التجهيزات =====================

interface IconProps {
  size?: number;
  className?: string;
}

function Defs({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

function RockShield({ size = 64, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <Defs id="rs-face" from="#e8e2d4" to="#8d8577" />
        <Defs id="rs-rim" from="#f6d98a" to="#a67c2e" />
        <radialGradient id="rs-boss" cx="0.38" cy="0.32">
          <stop offset="0" stopColor="#fff8e3" />
          <stop offset="1" stopColor="#9a8757" />
        </radialGradient>
      </defs>
      {/* الحافّة الذهبية ثم الوجه الحجري داخلها */}
      <path d="M32 4 56 12v22c0 12-10 21-24 26C18 55 8 46 8 34V12Z" fill="url(#rs-rim)" />
      <path d="M32 9 51 15v19c0 10-8 17-19 21-11-4-19-11-19-21V15Z" fill="url(#rs-face)" />
      {/* الضلع الأوسط يعطي الدرع سُمكاً */}
      <path d="M32 9v46" stroke="#6f6656" strokeWidth="1.4" opacity="0.55" />
      <path d="M13 24h38" stroke="#6f6656" strokeWidth="1.2" opacity="0.4" />
      <circle cx="32" cy="29" r="7.5" fill="url(#rs-boss)" stroke="#7a6a3f" strokeWidth="1.2" />
      {/* مسامير */}
      {[
        [19, 19],
        [45, 19],
        [19, 41],
        [45, 41],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="#cfc4a8" stroke="#6f6656" strokeWidth="0.7" />
      ))}
      {/* لمعة زاوية */}
      <path d="M32 9 18 14v18Z" fill="#ffffff" opacity="0.18" />
    </svg>
  );
}

function LightningBlade({ size = 64, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <Defs id="lb-blade" from="#dff4ff" to="#3aa5e8" />
        <Defs id="lb-guard" from="#ffe6a2" to="#a9761f" />
        <filter id="lb-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#lb-glow)">
        {/* النصل مسنّنٌ كالصاعقة لا مستقيماً */}
        <path
          d="M32 3 39 20l-5 3 7 12-6 3 5 10-8 7-8-7 5-10-6-3 7-12-5-3Z"
          fill="url(#lb-blade)"
          stroke="#1b6ea8"
          strokeWidth="1.1"
        />
      </g>
      <path d="M32 6v42" stroke="#ffffff" strokeWidth="1.2" opacity="0.65" />
      {/* المقبض والحاجز */}
      <rect x="18" y="47" width="28" height="5" rx="2.5" fill="url(#lb-guard)" />
      <rect x="29.5" y="51" width="5" height="9" rx="2" fill="#5a3f1c" />
      <circle cx="32" cy="61" r="3" fill="url(#lb-guard)" />
      {/* شرر */}
      <path d="M46 24l4-3-2 5 4-1-6 6 1-4Z" fill="#bfe9ff" opacity="0.9" />
    </svg>
  );
}

function HealingAmulet({ size = 64, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id="ha-heart" cx="0.35" cy="0.28">
          <stop offset="0" stopColor="#ff9bb0" />
          <stop offset="0.55" stopColor="#e83e5c" />
          <stop offset="1" stopColor="#8d1229" />
        </radialGradient>
        <Defs id="ha-gold" from="#ffe9ac" to="#a97c25" />
      </defs>
      {/* الحلقة والسلسلة */}
      <path d="M24 12q8-7 16 0" stroke="url(#ha-gold)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="13" r="4" fill="none" stroke="url(#ha-gold)" strokeWidth="2.6" />
      {/* الإطار الذهبي ثم القلب داخله */}
      <path
        d="M32 55C20 46 11 38 11 29c0-7 5-11 11-11 4 0 8 2 10 6 2-4 6-6 10-6 6 0 11 4 11 11 0 9-9 17-21 26Z"
        fill="url(#ha-gold)"
      />
      <path
        d="M32 50C22 42 15 36 15 29c0-5 3-8 7-8 3 0 6 2 8 5l2 3 2-3c2-3 5-5 8-5 4 0 7 3 7 8 0 7-7 13-17 21Z"
        fill="url(#ha-heart)"
      />
      <path d="M23 26q3-4 7-2" stroke="#ffd7e0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* جناحان صغيران كما في التصميم */}
      <path d="M11 30 2 26l4 7-3 1 8 3Z" fill="url(#ha-gold)" opacity="0.85" />
      <path d="M53 30 62 26l-4 7 3 1-8 3Z" fill="url(#ha-gold)" opacity="0.85" />
    </svg>
  );
}

function SpeedJewel({ size = 64, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <Defs id="sj-top" from="#e9fbff" to="#6fd6f5" />
        <Defs id="sj-bot" from="#3fb6e0" to="#12557a" />
        <Defs id="sj-wing" from="#ffffff" to="#a9d8ea" />
      </defs>
      {/* جناحان ثم الجوهرة فوقهما */}
      <path d="M30 30 6 22q-4 6 2 10l16 4Z" fill="url(#sj-wing)" opacity="0.92" />
      <path d="M34 30 58 22q4 6-2 10l-16 4Z" fill="url(#sj-wing)" opacity="0.92" />
      <path d="M28 34 10 32q-2 5 3 7l13 1Z" fill="url(#sj-wing)" opacity="0.6" />
      <path d="M36 34 54 32q2 5-3 7l-13 1Z" fill="url(#sj-wing)" opacity="0.6" />
      {/* الأوجه: علوية فاتحة وسفلية غائرة، فتُقرأ كحجرٍ مقطوع */}
      <path d="M32 8 44 23H20Z" fill="url(#sj-top)" />
      <path d="M20 23h24L32 50Z" fill="url(#sj-bot)" />
      <path d="M32 8 26 23l6 27Z" fill="#ffffff" opacity="0.28" />
      <path d="M20 23h24" stroke="#dff6ff" strokeWidth="1.2" opacity="0.8" />
      <path d="M26 23 32 50 38 23" stroke="#0f4f72" strokeWidth="0.9" fill="none" opacity="0.7" />
    </svg>
  );
}

const GEAR_ART: Record<GearId, (p: IconProps) => React.JSX.Element> = {
  rock_shield: RockShield,
  lightning_blade: LightningBlade,
  healing_amulet: HealingAmulet,
  speed_jewel: SpeedJewel,
};

export function GearIcon({ id, size, className }: { id: GearId } & IconProps) {
  const Art = GEAR_ART[id];
  return <Art size={size} className={className} />;
}

// ===================== مشاهد الطقس =====================

/** مشهدٌ مصغَّر بأرضٍ وسماء — أوقع من رمزٍ واحد لأنه يُري الأثر لا يسمّيه */
function Scene({ children, sky }: { children: React.ReactNode; sky: [string, string] }) {
  return (
    <svg viewBox="0 0 64 48" width="100%" height="100%" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky-${sky[0].slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="64" height="48" fill={`url(#sky-${sky[0].slice(1)})`} />
      {children}
    </svg>
  );
}

function Thunderstorm() {
  return (
    <Scene sky={['#1c2740', '#0b1120']}>
      <path d="M0 40h64v8H0Z" fill="#0a1a2e" />
      {/* أرضٌ مشحونة: التوهّج تحت السحابة مباشرةً */}
      <ellipse cx="30" cy="41" rx="18" ry="3" fill="#7dd3fc" opacity="0.35" />
      {[8, 18, 44, 54].map((x, i) => (
        <line key={x} x1={x} y1={18 + i} x2={x - 3} y2={36} stroke="#9fd6ff" strokeWidth="1" opacity="0.5" />
      ))}
      <path
        d="M14 22a8 8 0 0 1 8-8 10 10 0 0 1 19 2 7 7 0 0 1-1 14H21a7 7 0 0 1-7-8Z"
        fill="#4b5675"
      />
      <path d="M20 16a8 8 0 0 1 14-2 10 10 0 0 0-14 2Z" fill="#697698" />
      <path d="M32 27 24 39h6l-3 9 11-14h-6l4-7Z" fill="#ffe066" stroke="#fff3b0" strokeWidth="0.6" />
    </Scene>
  );
}

function AcidRain() {
  return (
    <Scene sky={['#243318', '#0e1508']}>
      <path d="M0 40h64v8H0Z" fill="#16220c" />
      <ellipse cx="32" cy="41" rx="22" ry="3.5" fill="#a3e635" opacity="0.3" />
      {[10, 20, 30, 40, 50].map((x, i) => (
        <g key={x}>
          <path
            d={`M${x} ${20 + (i % 3) * 4}q1.6 3 0 4.6a2.2 2.2 0 0 1-2.4-2.4Z`}
            fill="#bef264"
            opacity="0.9"
          />
          <line x1={x - 1} y1={28 + (i % 3) * 2} x2={x - 2} y2={37} stroke="#a3e635" strokeWidth="0.9" opacity="0.55" />
        </g>
      ))}
      <path d="M13 20a8 8 0 0 1 8-8 10 10 0 0 1 19 2 7 7 0 0 1-1 14H20a7 7 0 0 1-7-8Z" fill="#5b7a35" />
      <path d="M19 14a8 8 0 0 1 14-2 10 10 0 0 0-14 2Z" fill="#7ea04b" />
      {/* فقاعات في البِركة تحت المطر */}
      <circle cx="22" cy="42" r="1.4" fill="#d9f99d" opacity="0.8" />
      <circle cx="41" cy="43" r="1" fill="#d9f99d" opacity="0.7" />
    </Scene>
  );
}

function HeavyFog() {
  return (
    <Scene sky={['#4b5563', '#1f2937']}>
      <path d="M0 40h64v8H0Z" fill="#111827" />
      {/* هيئةٌ غائمة خلف الضباب: تُري أن الضباب يُخفي لا أنه أبيض فقط */}
      <path d="M26 40V26l6-6 6 6v14Z" fill="#0b1220" opacity="0.55" />
      {[
        [22, 0.5, 0.55],
        [28, 0.72, 0.4],
        [34, 0.55, 0.62],
        [40, 0.8, 0.35],
      ].map(([y, w, o], i) => (
        <rect
          key={i}
          x={i % 2 ? 4 : -6}
          y={y as number}
          width={64 * (w as number) + 20}
          height="5"
          rx="2.5"
          fill="#e5e7eb"
          opacity={o as number}
        />
      ))}
    </Scene>
  );
}

const WEATHER_ART: Record<WeatherId, () => React.JSX.Element> = {
  thunderstorm: Thunderstorm,
  acid_rain: AcidRain,
  heavy_fog: HeavyFog,
};

export function WeatherScene({ id }: { id: WeatherId }) {
  const Art = WEATHER_ART[id];
  return <Art />;
}

// ===================== المنصّة والخلفيّة =====================

/** الإسقاط الإيزومتري: عمودٌ وصفّ ⇐ نقطةٌ على الشاشة */
export const ISO = {
  w: 84,
  h: 42,
  // مضبوطان ليقع مركز المعيّن (4×3) على منتصف مساحة العرض أفقياً
  originX: 358,
  originY: 140,
  project(col: number, row: number): { x: number; y: number } {
    return {
      x: ISO.originX + (col - row) * ISO.w,
      y: ISO.originY + (col + row) * ISO.h,
    };
  },
};

/**
 * رأس البلاطة معيّنٌ حول مركزه، ووجهاها الأماميان يعطيانها سُمكاً.
 *
 * التوهّج **طبقةٌ فوق الحجر لا بديلٌ عنه**: لو استبدل اللونَ لصارت البلاطة
 * مربّعاً ملوّناً مسطّحاً وضاع الحجر تحته — والمطلوب حجرٌ مضاء لا لوحُ لون.
 */
function Tile({
  col,
  row,
  glow,
  lit,
}: {
  col: number;
  row: number;
  glow?: string;
  lit?: boolean;
}) {
  const { x, y } = ISO.project(col, row);
  const { w, h } = ISO;
  const d = 16; // سُمك الحجر
  const top = `${x} ${y - h} ${x + w} ${y} ${x} ${y + h} ${x - w} ${y}`;
  const inner = `${x} ${y - h * 0.72} ${x + w * 0.72} ${y} ${x} ${y + h * 0.72} ${x - w * 0.72} ${y}`;
  return (
    <g>
      {/* الوجهان السفليان: الأيسر أغمق فيُقرأ الضوء آتياً من اليمين */}
      <polygon points={`${x - w} ${y} ${x} ${y + h} ${x} ${y + h + d} ${x - w} ${y + d}`} fill="#33282300" />
      <polygon points={`${x + w} ${y} ${x} ${y + h} ${x} ${y + h + d} ${x + w} ${y + d}`} fill="#4a3b3400" />

      <polygon points={top} fill={lit ? '#7e6d5e' : '#6a5b50'} />
      {/* حافّتان مضيئتان أعلى وغائرتان أسفل — هما ما يعطي البلاطة نتوءها */}
      <path d={`M${x - w} ${y} L${x} ${y - h} L${x + w} ${y}`} stroke="#a08d78" strokeWidth="1.6" fill="none" opacity="0.75" />
      <path d={`M${x - w} ${y} L${x} ${y + h} L${x + w} ${y}`} stroke="#2f2621" strokeWidth="1.6" fill="none" opacity="0.85" />
      {/* بلاطة داخلية غائرة: أثرُ حجرٍ منحوت لا مربّعٍ مصمت */}
      <polygon points={inner} fill="none" stroke="#5b4d44" strokeWidth="1.1" opacity="0.7" />
      <path
        d={`M${x - w * 0.45} ${y - h * 0.2} L${x - w * 0.05} ${y + h * 0.12} L${x + w * 0.3} ${y - h * 0.05}`}
        stroke="#4a3e37"
        strokeWidth="1"
        fill="none"
        opacity="0.55"
      />

      {glow && (
        <>
          <polygon points={top} fill={glow} opacity="0.2" />
          <polygon points={inner} fill={glow} opacity="0.3" />
          <polygon points={top} fill="none" stroke={glow} strokeWidth="2.4" opacity="0.9" />
          {/* عمودُ ضوءٍ رفيع يصعد من البلاطة إلى ما يطفو فوقها */}
          <polygon
            points={`${x - w * 0.34} ${y} ${x + w * 0.34} ${y} ${x + w * 0.14} ${y - 62} ${x - w * 0.14} ${y - 62}`}
            fill={glow}
            opacity="0.13"
          />
        </>
      )}
    </g>
  );
}

/**
 * ظلٌّ بيضويّ على رأس البلاطة — بدونه يطفو كلّ شيء بلا وزن.
 * صغيرٌ وناعم عمداً: الظلّ الواسع الغامق يبتلع نقشَ الحجر تحته فيعود
 * المشهد مسطّحاً من حيث أراد أن يعمّق.
 */
function TileShadow({ col, row }: { col: number; row: number }) {
  const { x, y } = ISO.project(col, row);
  return (
    <ellipse
      cx={x}
      cy={y + 3}
      rx={ISO.w * 0.26}
      ry={ISO.h * 0.26}
      fill="#140f0c"
      opacity="0.5"
      filter="url(#soft)"
    />
  );
}

/**
 * المسرح: سماء غروبٍ وأنقاض ومنصّة إيزومترية.
 *
 * `cols × rows` تحدّد المنصّة، و`glowTiles` تلوّن بلاطاتٍ بعينها — وهي ما
 * يجعل بلاطةَ التجهيز تتوهّج بلونه كما في التصميم.
 */
export function IsoStage({
  cols,
  rows,
  glowTiles = {},
  shadowTiles = [],
}: {
  cols: number;
  rows: number;
  glowTiles?: Record<string, string>;
  /** «عمود,صفّ» لكل بلاطةٍ يقف عليها شيء */
  shadowTiles?: string[];
}) {
  const tiles: React.JSX.Element[] = [];
  // الرسم من الخلف إلى الأمام كي تحجب البلاطةُ القريبة ما خلفها
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push(
        <Tile
          key={`${col}-${row}`}
          col={col}
          row={row}
          glow={glowTiles[`${col},${row}`]}
          lit={(col + row) % 2 === 0}
        />
      );
    }
  }

  return (
    <svg
      viewBox="0 0 800 470"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241a3e" />
          <stop offset="0.42" stopColor="#5b3352" />
          <stop offset="0.68" stopColor="#a85f45" />
          <stop offset="0.86" stopColor="#e0954f" />
          <stop offset="1" stopColor="#f6c877" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c877" stopOpacity="0" />
          <stop offset="1" stopColor="#f6c877" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="ember" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a2f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
        </linearGradient>
        <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="800" height="470" fill="url(#sky)" />
      {/* شرائط سحابٍ رفيعة تكسر فراغ السماء العلوي */}
      {[
        [40, 22, 210, 0.1],
        [520, 44, 250, 0.08],
        [180, 74, 300, 0.07],
      ].map((c, i) => (
        <rect key={i} x={c[0]} y={c[1]} width={c[2]} height="9" rx="4.5" fill="#ffd9a0" opacity={c[3]} />
      ))}
      <ellipse cx="400" cy="330" rx="330" ry="150" fill="url(#sun)" />
      <circle cx="400" cy="316" r="46" fill="#ffe6b8" opacity="0.5" filter="url(#soft)" />

      {/*
        ثلاث طبقات من الأنقاض تفتَح كلّما بعُدت. الفتحُ مع البعد هو ما يصنع
        العمق الجوّي: صفٌّ واحدٌ من المستطيلات يبقى مسطّحاً مهما كثُر.
      */}
      {[
        { xs: [30, 96, 690, 756], fill: '#7d5566', o: 0.42, top: 118, h: 160, w: 30 },
        { xs: [140, 636], fill: '#5a3a53', o: 0.68, top: 138, h: 200, w: 40 },
        { xs: [196, 560], fill: '#3a2440', o: 0.95, top: 150, h: 230, w: 50 },
      ].map((layer, li) => (
        <g key={li} fill={layer.fill} opacity={layer.o}>
          {layer.xs.map((x, i) => {
            const top = layer.top + (i % 3) * 14;
            return (
              <g key={x}>
                {/* بدنٌ ثم تاجٌ ثم قاعدة — العمود بلا تاجٍ يبدو أنبوباً */}
                <rect x={x} y={top} width={layer.w} height={layer.h} />
                <rect x={x - 5} y={top - 9} width={layer.w + 10} height="9" rx="2" />
                <rect x={x - 4} y={top + layer.h - 6} width={layer.w + 8} height="8" rx="2" />
                {/* أخاديد العمود */}
                <rect x={x + layer.w * 0.32} y={top} width="2" height={layer.h} fill="#000" opacity="0.18" />
                <rect x={x + layer.w * 0.62} y={top} width="2" height={layer.h} fill="#000" opacity="0.14" />
              </g>
            );
          })}
          {/* قوسٌ مكسور: نقطةُ تثبيتٍ للعين، ويقول «أنقاض» لا «صفَّ أعمدة» */}
          {li === 2 && (
            <>
              <path d="M196 168h50v-6a26 26 0 0 1 44 18v10h-24v-8a12 12 0 0 0-20-8Z" />
              <rect x="288" y="182" width="26" height="150" />
              <rect x="283" y="174" width="36" height="9" rx="2" />
            </>
          )}
          {li === 1 && <path d="M140 158h40v-8a24 24 0 0 1 40 16v8h-20v-6a10 10 0 0 0-16-6Z" opacity="0.9" />}
        </g>
      ))}
      <rect y="120" width="800" height="270" fill="url(#haze)" opacity="0.55" />

      {/*
        قاعدة المنصّة محسوبةٌ من رؤوس الشبكة نفسها.
        شبكة 4×3 تُسقَط **متوازيَ أضلاع لا معيّناً متساوياً**: مدى
        `col−row` من −2 إلى 3 ومدى `col+row` من 0 إلى 5. وحين افترضتُها
        معيّناً متماثلاً خرجت الحافّة مائلة وزاد اللسان من جهةٍ دون أخرى.
      */}
      {(() => {
        const m = 18; // هامش الحافّة المرتفعة
        const a = ISO.project(0, 0); // الرأس الخلفي
        const b = ISO.project(cols - 1, 0); // اليمين
        const c = ISO.project(cols - 1, rows - 1); // الأمام
        const d = ISO.project(0, rows - 1); // اليسار
        const top = `${a.x} ${a.y - ISO.h - m}`;
        const right = `${b.x + ISO.w + m} ${b.y}`;
        const front = `${c.x} ${c.y + ISO.h + m}`;
        const left = `${d.x - ISO.w - m} ${d.y}`;
        const wall = 44;
        return (
          <g>
            {/* الجدار الجانبي: الوجهان المرئيان من الأمام فقط */}
            <polygon
              points={`${left} ${front} ${right} ${b.x + ISO.w + m} ${b.y + wall} ${c.x} ${c.y + ISO.h + m + wall} ${d.x - ISO.w - m} ${d.y + wall}`}
              fill="#1b1310"
            />
            <polygon points={`${top} ${right} ${front} ${left}`} fill="#2f251f" />
            <polygon
              points={`${top} ${right} ${front} ${left}`}
              fill="none"
              stroke="#7d6a58"
              strokeWidth="2.5"
              opacity="0.55"
            />
          </g>
        );
      })()}
      <rect y="380" width="800" height="90" fill="url(#ember)" />

      {tiles}
      {shadowTiles.map((key) => {
        const [c, r] = key.split(',').map(Number);
        return <TileShadow key={key} col={c} row={r} />;
      })}
    </svg>
  );
}
