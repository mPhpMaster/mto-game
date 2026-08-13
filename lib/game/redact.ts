import { HIDDEN_CARD_ID } from './cards';
import type { CardInstance, GameState } from './types';

function hiddenCards(count: number, prefix: string): CardInstance[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `${prefix}${i}`,
    defId: HIDDEN_CARD_ID,
  }));
}

/**
 * ينتج نسخة من الحالة تصلح للإرسال إلى لاعب بعينه: تُحذف منها كل معلومة
 * لا يحقّ له رؤيتها — يد الخصم، ترتيب السطح، وهوية الفخاخ المقلوبة.
 *
 * الأعداد تبقى صحيحة (عدد كروت اليد، حجم السطح، عدد الفخاخ) لأن الواجهة تعرضها.
 */
export function redactFor(state: GameState, viewer: 0 | 1): GameState {
  const other: 0 | 1 = viewer === 0 ? 1 : 0;
  const s = structuredClone(state);

  s.deck = hiddenCards(s.deck.length, 'hd');

  const foe = s.players[other];
  foe.hand = hiddenCards(foe.hand.length, `hh${other}_`);
  // الفخاخ المجهّزة تبقى مقلوبة حتى تنطلق
  foe.traps = foe.traps.map((_, i) => ({ uid: `ht${other}_${i}`, defId: HIDDEN_CARD_ID }));

  if (s.reveal && s.reveal.side !== viewer) s.reveal = null;

  return s;
}
