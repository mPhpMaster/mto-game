'use client';

import { ABILITY_NAME, ELEMENT_ICON, ELEMENT_NAME, KIND_NAME } from '@/lib/game/cards';
import type { CardDef, Element } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import CardArt from './CardArt';

export const ELEMENT_HEX: Record<Element, string> = {
  fire: '#ff6b3d',
  water: '#3da5ff',
  grass: '#46d17f',
  electric: '#ffd23d',
  psychic: '#c471ff',
  dark: '#8b8fa8',
  wild: '#ff5fa2',
};

export function numberLabel(d: CardDef): string {
  if (d.number === null) return '★';
  if (d.number === 10) return '⊘';
  if (d.number === 11) return '+2';
  if (d.number === 12) return '⇄';
  return String(d.number);
}

export type CardSize = 'xs' | 'sm' | 'md';

/**
 * الكارت طبقتان: إطار خارجي بتدرّج معدني، وسطح داخلي يحمل المحتوى.
 * الطبقتان ضروريتان للحافة المجسّمة — حدٌّ بلون واحد يقرأ مسطّحاً مهما ثخُن.
 */
const BOX: Record<CardSize, string> = {
  xs: 'w-[52px] h-[76px] rounded-lg p-[1.5px]',
  sm: 'w-[86px] h-[122px] rounded-xl p-[2px]',
  md: 'w-[116px] h-[166px] rounded-xl p-[2.5px]',
};

const SURFACE: Record<CardSize, string> = {
  xs: 'rounded-[6px] p-[3px]',
  sm: 'rounded-[9px] p-1',
  md: 'rounded-[10px] p-1.5',
};

const ART_H: Record<CardSize, string> = {
  xs: 'h-[20px]',
  sm: 'h-[28px]',
  md: 'h-[44px]',
};

interface Props {
  card: CardDef;
  size?: CardSize;
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  footer?: React.ReactNode;
  /** يومض عند وصول كارت جديد إلى اليد */
  fresh?: boolean;
  /** الضغط المطوّل يفتح شرح الكارت */
  onLongPress?: () => void;
}

export default function CardView({
  card,
  size = 'md',
  playable,
  dimmed,
  selected,
  onClick,
  title,
  footer,
  fresh,
  onLongPress,
}: Props) {
  const { t, L, locale } = useLocale();
  const color = ELEMENT_HEX[card.element];
  const tiny = size === 'xs';
  const small = size === 'sm' || tiny;
  const label = title ?? `${L(card.name)} — ${L(card.text)}`;
  // الاسم الآخر يُعرض تحت الأساسي كما في تصميم البطاقة المرجعي. البيانات
  // ثنائية اللغة أصلاً، فلا يكلّف هذا حرفاً واحداً من الترجمة.
  const altName = card.name[locale === 'ar' ? 'en' : 'ar'];
  const evolved = card.kind === 'monster' && card.stage === 2;

  const className = [
    'card-face relative shrink-0 text-right transition-all duration-150',
    BOX[size],
    onClick ? (tiny ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-pointer hover:-translate-y-1.5') : 'cursor-default',
    // الكارت غير القابل للعب يخفت لكن **يبقى ملوّناً**: اللون هو العنصر،
    // وإخفاؤه يمنع اللاعب من التخطيط لدوره القادم. grayscale كان يمحوه.
    dimmed ? 'opacity-75 saturate-[0.85]' : '',
    selected ? 'ring-2 ring-white -translate-y-2' : '',
    // إشعاع أصفر هادئ على الجوال والكمبيوتر (الحركة في globals.css)
    playable ? 'playable-glow ring-2 ring-amber-300/70' : '',
    fresh ? 'card-fresh' : '',
  ].join(' ');

  // فاتح عند الزاوية العليا وغامق عند السفلى، فيقرأ الإطار كحافة لها سماكة
  const style = {
    background: `linear-gradient(150deg, ${color}e6 0%, ${color}70 24%, rgba(255,255,255,0.24) 46%, ${color}5c 64%, ${color}b8 100%)`,
  };

  /** زاوية مزخرفة — خطّان قصيران يلتقيان، تُحذف على المصغّر فتبقى الحافة نظيفة */
  const corner = (pos: string, sides: string) => (
    <span
      className={`pointer-events-none absolute ${pos} ${sides} ${small ? 'size-1.5' : 'size-2'}`}
      style={{ borderColor: `${color}b0` }}
    />
  );

  /**
   * تخطيط عمودي مرن لا مواضع مطلقة: الكتلة السفلى كانت `absolute bottom`
   * فتركب على الاسم حين يطول النص. مع flex يأخذ كل جزء ارتفاعه ولا يتداخل.
   */
  const body = (
    <div
      className={`relative flex h-full flex-col overflow-hidden ${SURFACE[size]} ${evolved ? 'card-holo' : ''}`}
      style={{
        background: `linear-gradient(160deg, ${color}30 0%, rgba(10,12,24,0.95) 55%, rgba(5,7,14,0.99) 100%)`,
      }}
    >
      {!tiny && (
        <>
          {corner('left-[2px] top-[2px]', 'border-l border-t')}
          {corner('right-[2px] top-[2px]', 'border-r border-t')}
          {corner('bottom-[2px] left-[2px]', 'border-b border-l')}
          {corner('bottom-[2px] right-[2px]', 'border-b border-r')}
        </>
      )}

      {/* الرأس: التكلفة · العنصر · الرقم */}
      <div className="flex shrink-0 items-center justify-between gap-1">
        <span
          className={`grid shrink-0 place-items-center rounded-full font-black text-black ${
            tiny ? 'size-3.5 text-[8px]' : small ? 'size-5 text-[10px]' : 'size-6 text-xs'
          }`}
          style={{ background: color, boxShadow: `0 0 6px -1px ${color}` }}
          title={t('costTip')}
        >
          {card.cost}
        </span>

        {/* شارة العنصر — على الكارت المصغّر يبقى رمز العنصر أوضح من القفل */}
        <span
          className={`grid shrink-0 place-items-center rounded-full bg-black/60 ${
            tiny ? 'size-[14px] text-[8px]' : small ? 'size-[18px] text-[10px]' : 'size-[21px] text-xs'
          }`}
          style={{ boxShadow: `0 0 0 1.5px ${color}, 0 0 8px -2px ${color}` }}
          title={L(ELEMENT_NAME[card.element])}
        >
          {dimmed && !tiny ? '🔒' : ELEMENT_ICON[card.element]}
        </span>

        <span
          className={`shrink-0 rounded-md bg-black/50 font-black tabular-nums ${
            tiny ? 'px-0.5 text-[8px]' : small ? 'px-1.5 text-[11px]' : 'px-1.5 text-sm'
          }`}
          style={{ color }}
          title={t('numberTip')}
        >
          {numberLabel(card)}
        </span>
      </div>

      {/* نافذة الرسم — إطار غائر يفصل الفنّ عن سطح الكارت */}
      <div
        className={`relative mt-0.5 w-full shrink-0 overflow-hidden ${tiny ? 'rounded-sm' : 'rounded'} ${ART_H[size]}`}
        style={{
          background: `radial-gradient(120% 110% at 50% 0%, ${color}26 0%, rgba(0,0,0,0.34) 100%)`,
          boxShadow: `inset 0 0 0 1px ${color}3d`,
        }}
      >
        <CardArt card={card} className="h-full w-full" />
      </div>

      {/* الاسم — الأساسي بلغة الواجهة، والآخر تحته كما في التصميم المرجعي */}
      <div className={`shrink-0 text-center ${size === 'md' ? 'mt-1' : 'mt-0.5'}`}>
        <div
          className={`truncate font-bold leading-tight ${
            tiny ? 'text-[7px]' : small ? 'text-[10px]' : 'text-[12px]'
          }`}
        >
          {L(card.name)}
        </div>
        {/* على المقاسين الأصغر يُحذف: سطره كان يقصّ سطراً من نصّ الفخّ والسحر */}
        {size === 'md' && (
          <div
            className="truncate text-[7.5px] uppercase leading-none opacity-55"
            style={{ letterSpacing: '0.06em' }}
          >
            {altName}
          </div>
        )}
      </div>

      {/* النوع/العنصر — يُحذف على المصغّر حتى يبقى الكارت قابلاً للتعرّف لا للقراءة */}
      {!tiny && (
        <div
          className={`shrink-0 text-center leading-tight opacity-70 ${
            small ? 'text-[8px]' : 'mt-0.5 text-[9px]'
          }`}
        >
          {L(KIND_NAME[card.kind])} · {L(ELEMENT_NAME[card.element])}
          {evolved ? ` · ${t('evolvedTag')}` : ''}
        </div>
      )}

      {/* الكتلة السفلى: mt-auto تدفعها للأسفل دون أن تركب على ما فوقها */}
      {card.kind === 'monster' ? (
        <div className="mt-auto shrink-0 pt-0.5">
          {!tiny && card.ability && card.ability !== 'none' && (
            <div
              className={`mb-0.5 truncate rounded-sm px-1 text-center font-bold ${
                small ? 'text-[8px]' : 'text-[9px]'
              }`}
              style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}47` }}
            >
              [{L(ABILITY_NAME[card.ability])}]
            </div>
          )}
          <div
            className={`flex justify-between rounded-sm bg-black/55 font-black ${
              tiny ? 'text-[7px]' : small ? 'px-1 text-[10px]' : 'px-1 text-xs'
            }`}
            style={tiny ? undefined : { boxShadow: `inset 0 0 0 1px ${color}33` }}
          >
            <span className="text-orange-300">⚔{tiny ? '' : ' '}{card.atk}</span>
            <span className="text-emerald-300">❤{tiny ? '' : ' '}{card.hp}</span>
          </div>
        </div>
      ) : tiny ? (
        <div className="mt-auto truncate text-center text-[6px] leading-tight opacity-80">
          {L(KIND_NAME[card.kind])}
        </div>
      ) : (
        // 6.5px على المقاس الصغير لا 7.5: بالحجم الأكبر كانت 11 قاعدة من 74
        // تُقصّ في المنتصف، وقاعدةٌ كاملة صغيرة أنفع من نصف قاعدة أوضح.
        <div
          className={`mt-auto overflow-hidden rounded-sm bg-black/45 px-1 py-0.5 leading-snug opacity-95 ${
            small ? 'text-[6.5px] line-clamp-3' : 'text-[8.5px] line-clamp-4'
          }`}
          style={{ boxShadow: `inset 0 0 0 1px ${color}2e` }}
        >
          {L(card.text)}
        </div>
      )}

      {footer}
    </div>
  );

  // بدون onClick يكون الكارت للعرض فقط، فلا يصحّ أن يكون زراً في شجرة الوصول
  if (!onClick) {
    return (
      <div className={className} style={style} title={label} aria-label={label}>
        {body}
      </div>
    );
  }

  // الضغط المطوّل: مؤقّت يبدأ مع الضغط ويُلغى إن رُفع الإصبع أو تحرّك مبكراً
  const longPress = onLongPress
    ? (() => {
        let timer: number | undefined;
        const start = () => {
          timer = window.setTimeout(() => {
            timer = undefined;
            onLongPress();
          }, 450);
        };
        const cancel = () => {
          if (timer !== undefined) window.clearTimeout(timer);
          timer = undefined;
        };
        return {
          onPointerDown: start,
          onPointerUp: cancel,
          onPointerLeave: cancel,
          onPointerCancel: cancel,
          onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
            onLongPress();
          },
        };
      })()
    : {};

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
      style={style}
      {...longPress}
    >
      {body}
    </button>
  );
}

const BACK_BOX: Record<CardSize, string> = {
  xs: 'w-[52px] h-[76px] rounded-lg',
  sm: 'w-[86px] h-[122px] rounded-xl',
  md: 'w-[116px] h-[166px] rounded-xl',
};

export function CardBack({
  size = 'md',
  label,
  onClick,
  title,
}: {
  size?: CardSize;
  label?: string;
  onClick?: () => void;
  title?: string;
}) {
  const tiny = size === 'xs';
  const small = size === 'sm' || tiny;
  const className = [
    'card-face grid shrink-0 place-items-center border border-white/15',
    BACK_BOX[size],
    onClick ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-fuchsia-300' : '',
  ].join(' ');
  const style = {
    background: 'repeating-linear-gradient(135deg, #1a1f3d 0 8px, #131735 8px 16px)',
  };
  const inner = (
    <div className="text-center">
      <div className={tiny ? 'text-base' : small ? 'text-lg' : 'text-2xl'}>🃏</div>
      {label && <div className="mt-0.5 text-[9px] leading-tight opacity-70">{label}</div>}
    </div>
  );
  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick} title={title} aria-label={title}>
        {inner}
      </button>
    );
  }
  return (
    <div className={className} style={style} title={title}>
      {inner}
    </div>
  );
}
