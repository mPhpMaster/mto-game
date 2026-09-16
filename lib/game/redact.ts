import { HIDDEN_CARD_ID } from './cards';
import type { CardInstance, GameState, Seat } from './types';

function hiddenCards(count: number, prefix: string): CardInstance[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `${prefix}${i}`,
    defId: HIDDEN_CARD_ID,
  }));
}

/**
 * ينتج نسخة من الحالة تصلح للإرسال إلى لاعب بعينه: تُحذف منها كل معلومة
 * لا يحقّ له رؤيتها — يد الخصوم، ترتيب السطح، وهوية الفخاخ المقلوبة.
 *
 * الأعداد تبقى صحيحة (عدد كروت اليد، حجم السطح، عدد الفخاخ) لأن الواجهة تعرضها.
 */
export function redactFor(state: GameState, viewer: Seat): GameState {
  const s = structuredClone(state);

  /*
    ديك كل لاعب مخفيٌّ عن الجميع — وعن صاحبه أيضاً: ترتيب سحبك سرٌّ عنك
    كما هو سرٌّ عن خصمك، وإلا عرفتَ ما ستسحبه قبل أن تسحبه.
  */
  for (let i = 0; i < s.players.length; i++) {
    s.players[i].deck = hiddenCards(s.players[i].deck.length, `hd${i}_`);
  }

  for (let i = 0; i < s.players.length; i++) {
    if (i === viewer) continue;
    const foe = s.players[i];
    foe.hand = hiddenCards(foe.hand.length, `hh${i}_`);
    // الفخاخ المجهّزة تبقى مقلوبة حتى تنطلق
    foe.traps = foe.traps.map((_, ti) => ({ uid: `ht${i}_${ti}`, defId: HIDDEN_CARD_ID }));
  }

  if (s.reveal && s.reveal.side !== viewer) s.reveal = null;

  return s;
}
