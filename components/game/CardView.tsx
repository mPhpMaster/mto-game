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

interface Props {
  card: CardDef;
  size?: 'sm' | 'md';
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
  const { t, L } = useLocale();
  const color = ELEMENT_HEX[card.element];
  const small = size === 'sm';
  const label = title ?? `${L(card.name)} — ${L(card.text)}`;

  const className = [
    'card-face relative shrink-0 rounded-xl text-right transition-all duration-150',
    small ? 'w-[86px] h-[122px] p-1.5' : 'w-[116px] h-[166px] p-2',
    onClick ? 'cursor-pointer hover:-translate-y-1.5' : 'cursor-default',
    // الكارت غير القابل للعب يخفت لكن **يبقى ملوّناً**: اللون هو العنصر،
    // وإخفاؤه يمنع اللاعب من التخطيط لدوره القادم. grayscale كان يمحوه.
    dimmed ? 'opacity-75 saturate-[0.85]' : '',
    selected ? 'ring-2 ring-white -translate-y-2' : '',
    playable ? 'ring-2 ring-emerald-400/80' : '',
    fresh ? 'card-fresh' : '',
  ].join(' ');

  const style = {
    background: `linear-gradient(160deg, ${color}38 0%, rgba(10,12,24,0.94) 58%, rgba(6,8,16,0.98) 100%)`,
    border: `1px solid ${color}66`,
  };

  /**
   * تخطيط عمودي مرن لا مواضع مطلقة: الكتلة السفلى كانت `absolute bottom`
   * فتركب على الاسم حين يطول النص. مع flex يأخذ كل جزء ارتفاعه ولا يتداخل.
   */
  const body = (
    <div className="flex h-full flex-col">
      {/* الرأس: التكلفة · العنصر · الرقم */}
      <div className="flex shrink-0 items-center justify-between gap-1">
        <span
          className={`grid shrink-0 place-items-center rounded-full font-black text-black ${
            small ? 'size-5 text-[10px]' : 'size-6 text-xs'
          }`}
          style={{ background: color }}
          title={t('costTip')}
        >
          {card.cost}
        </span>

        {/* شارة العنصر — تبقى واضحة حتى على الكارت الخافت */}
        <span
          className={`grid shrink-0 place-items-center rounded-full bg-black/60 ${
            small ? 'size-[18px] text-[10px]' : 'size-[21px] text-xs'
          }`}
          style={{ boxShadow: `0 0 0 1.5px ${color}` }}
          title={L(ELEMENT_NAME[card.element])}
        >
          {dimmed ? '🔒' : ELEMENT_ICON[card.element]}
        </span>

        <span
          className={`shrink-0 rounded-md bg-black/50 px-1.5 font-black tabular-nums ${
            small ? 'text-[11px]' : 'text-sm'
          }`}
          style={{ color }}
          title={t('numberTip')}
        >
          {numberLabel(card)}
        </span>
      </div>

      {/* رسم الكارت */}
      <CardArt
        card={card}
        className={small ? 'mt-0.5 h-[32px] w-full shrink-0' : 'mt-1 h-[46px] w-full shrink-0'}
      />

      {/* الاسم */}
      <div
        className={`shrink-0 text-center font-bold leading-tight ${
          small ? 'mt-0.5 text-[10px]' : 'mt-1 text-[12px]'
        }`}
      >
        {L(card.name)}
      </div>

      {/* النوع/العنصر */}
      <div
        className={`shrink-0 text-center leading-tight opacity-70 ${
          small ? 'text-[8px]' : 'text-[9px]'
        }`}
      >
        {L(KIND_NAME[card.kind])} · {L(ELEMENT_NAME[card.element])}
        {card.stage === 2 ? ` · ${t('evolvedTag')}` : ''}
      </div>

      {/* الكتلة السفلى: mt-auto تدفعها للأسفل دون أن تركب على ما فوقها */}
      {card.kind === 'monster' ? (
        <div className="mt-auto shrink-0 pt-1">
          {card.ability && card.ability !== 'none' && (
            <div
              className={`mb-0.5 truncate rounded bg-black/45 px-1 text-center ${
                small ? 'text-[8px]' : 'text-[9px]'
              }`}
              style={{ color }}
            >
              {L(ABILITY_NAME[card.ability])}
            </div>
          )}
          <div className={`flex justify-between font-black ${small ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-orange-300">⚔ {card.atk}</span>
            <span className="text-emerald-300">❤ {card.hp}</span>
          </div>
        </div>
      ) : (
        <div
          className={`mt-auto overflow-hidden rounded bg-black/45 px-1 py-0.5 leading-snug opacity-95 ${
            small ? 'text-[7.5px] line-clamp-3' : 'text-[8.5px] line-clamp-4'
          }`}
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

export function CardBack({ size = 'md', label }: { size?: 'sm' | 'md'; label?: string }) {
  const small = size === 'sm';
  return (
    <div
      className={`card-face grid shrink-0 place-items-center rounded-xl border border-white/15 ${
        small ? 'w-[86px] h-[122px]' : 'w-[116px] h-[166px]'
      }`}
      style={{
        background: 'repeating-linear-gradient(135deg, #1a1f3d 0 8px, #131735 8px 16px)',
      }}
    >
      <div className="text-center">
        <div className={small ? 'text-lg' : 'text-2xl'}>🃏</div>
        {label && <div className="mt-1 text-[9px] opacity-70">{label}</div>}
      </div>
    </div>
  );
}
