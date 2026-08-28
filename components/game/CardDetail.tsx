'use client';

import { useEffect } from 'react';
import {
  ABILITY_NAME,
  ABILITY_TEXT,
  ELEMENT_ICON,
  ELEMENT_NAME,
  KIND_NAME,
} from '@/lib/game/cards';
import type { CardDef } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import CardArt from './CardArt';
import { ELEMENT_HEX, numberLabel } from './CardView';

/**
 * بطاقة تعريف موسّعة: تُفتح بالضغط المطوّل على أي كارت، أو بضغطة عادية
 * على كارت لا يمكن لعبه (الضغطة كانت تُهدر في رسالة خطأ).
 * أهمّ ما فيها شرح الخاصية — «شحن» و«حراسة» لا تعني شيئاً بلا شرح.
 */
export default function CardDetail({
  card,
  reason,
  trapPeek,
  onClose,
}: {
  card: CardDef;
  reason?: string;
  trapPeek?: boolean;
  onClose: () => void;
}) {
  const { t, L } = useLocale();
  const color = ELEMENT_HEX[card.element];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pop-in panel w-full max-w-sm overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={L(card.name)}
        data-card-detail=""
        data-trap-peek={trapPeek ? '1' : undefined}
      >
        <div
          className="p-4"
          style={{ background: `linear-gradient(160deg, ${color}30, transparent 70%)` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-xl"
              style={{ background: `${color}22`, border: `1px solid ${color}66` }}
            >
              <CardArt card={card} className="h-12 w-12" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black leading-tight">{L(card.name)}</h3>
              <p className="mt-0.5 text-xs" style={{ color }}>
                {ELEMENT_ICON[card.element]} {L(KIND_NAME[card.kind])} ·{' '}
                {L(ELEMENT_NAME[card.element])}
                {card.stage === 2 ? ` · ${t('evolvedTag')}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/12 px-2 py-1 text-xs font-bold hover:bg-white/25"
            >
              {t('close')}
            </button>
          </div>

          {/* الأرقام */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-black/40 px-2 py-1">
              ⚡ {t('costTip')}: <b>{card.cost}</b>
            </span>
            <span className="rounded-lg bg-black/40 px-2 py-1">
              🔢 {t('numberTip')}: <b>{numberLabel(card)}</b>
            </span>
            {card.kind === 'monster' && (
              <>
                <span className="rounded-lg bg-black/40 px-2 py-1 text-orange-300">
                  ⚔ <b>{card.atk}</b>
                </span>
                <span className="rounded-lg bg-black/40 px-2 py-1 text-emerald-300">
                  ❤ <b>{card.hp}</b>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4 pt-0">
          {/* شرح الخاصية — سبب وجود هذه النافذة */}
          {card.ability && card.ability !== 'none' && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3">
              <div className="mb-1 text-sm font-black text-emerald-200">
                ✨ {L(ABILITY_NAME[card.ability])}
              </div>
              <p className="text-[13px] leading-relaxed text-emerald-50/90">
                {L(ABILITY_TEXT[card.ability])}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-white/6 p-3">
            <div className="mb-1 text-xs font-black opacity-70">{t('cardEffect')}</div>
            <p className="text-[13px] leading-relaxed opacity-90">{L(card.text)}</p>
          </div>

          {reason && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/12 p-3">
              <div className="mb-1 text-xs font-black text-rose-200">🔒 {t('whyLocked')}</div>
              <p className="text-[13px] leading-relaxed text-rose-50/90">{reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
