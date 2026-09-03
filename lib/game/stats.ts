import { CARD_BY_ID } from './cards';
import type { Element, LogEntry, Seat } from './types';

/**
 * حصيلة ما لعبه اللاعب في مباراة: أكثر الكروت، أكثر العناصر، واستدعاءات
 * الوحش الأعظم. تُشتقّ من السجل **خارج المحرّك** فيبقى مُختزِلاً خالصاً
 * ولا تتغيّر بنية الحالة المبثوثة في اللعب الجماعي.
 *
 * ثلاث حقائق تمنع قراءة السجل دفعة واحدة عند النهاية:
 *  1) السجل حلقة تُقصّ عند 200 سطر، فالمباريات الطويلة تفقد أوائلها.
 *     لذلك التجميع تزايديّ بمؤشّر `cursor` على `logSeq` لا على الطول.
 *  2) مفاتيح كثيرة تحمل معامل `card` وليست لعباً (`monster_fell`,
 *     `revived`, `bounced`, `boosted`, `ability_guard`, `venom_bite`...)،
 *     فالعدّ يقتصر على قائمة بيضاء صريحة.
 *  3) `trap_set` لا يسجّل هوية الكارت عمداً — السجل يُبَثّ للخصم والفخّ
 *     المقلوب يجب أن يبقى مقلوباً. لذلك الفخاخ عدّاد منفصل لا تدخل
 *     «أكثر الكروت لعباً».
 */

/** مفاتيح اللعب الحقيقية وحدها */
const PLAY_KEYS = new Set(['summoned', 'played', 'played_wild']);

export interface MatchTally {
  /** معرّف الكارت ← عدد مرّات لعبه */
  cards: Record<string, number>;
  elements: Partial<Record<Element, number>>;
  titans: number;
  trapsSet: number;
  /** آخر قيمة logSeq استُهلكت — يجعل التجميع تزايدياً */
  cursor: number;
}

export function emptyTally(): MatchTally {
  return { cards: {}, elements: {}, titans: 0, trapsSet: 0, cursor: 0 };
}

function elementOf(entry: LogEntry, cardId: string): Element {
  // الكارت البري: العنصر المختار هو ما لُعب به فعلاً
  if (entry.key === 'played_wild' && typeof entry.params?.element === 'string') {
    return entry.params.element as Element;
  }
  return CARD_BY_ID[cardId]?.element ?? 'wild';
}

/**
 * يستهلك ما استجدّ في السجل منذ آخر نداء ويعيد حصيلة جديدة.
 * `logSeq` عدّاد لا يتجمّد، فالمقارنة به تلتقط الأسطر المقصوصة أيضاً —
 * ما دام النداء يقع بين لقطتين لم يسقط بينهما أكثر من 200 سطر.
 */
export function advanceTally(
  prev: MatchTally,
  log: LogEntry[],
  logSeq: number,
  seat: Seat
): MatchTally {
  // مباراة جديدة: العدّاد رجع للوراء
  const base = logSeq < prev.cursor ? emptyTally() : prev;
  const fresh = logSeq - base.cursor;
  if (fresh <= 0) return base.cursor === logSeq ? base : { ...base, cursor: logSeq };

  const slice = log.slice(Math.max(0, log.length - fresh));
  const cards = { ...base.cards };
  const elements = { ...base.elements };
  let titans = base.titans;
  let trapsSet = base.trapsSet;

  for (const entry of slice) {
    if (entry.side !== seat) continue;

    if (entry.key === 'titan_summon') {
      titans += 1;
      continue;
    }
    if (entry.key === 'trap_set') {
      trapsSet += 1;
      continue;
    }
    if (!PLAY_KEYS.has(entry.key)) continue;

    const card = entry.params?.card;
    if (typeof card !== 'string') continue;
    cards[card] = (cards[card] ?? 0) + 1;
    const el = elementOf(entry, card);
    elements[el] = (elements[el] ?? 0) + 1;
  }

  return { cards, elements, titans, trapsSet, cursor: logSeq };
}

/** الحمولة التي تُرسَل إلى الخادم — عنصر كل كارت مُدمَج معه */
export type TallyPayload = Record<string, { element: Element; plays: number }>;

export function tallyToPayload(tally: MatchTally): TallyPayload {
  const out: TallyPayload = {};
  for (const [cardDefId, plays] of Object.entries(tally.cards)) {
    if (plays <= 0) continue;
    out[cardDefId] = { element: CARD_BY_ID[cardDefId]?.element ?? 'wild', plays };
  }
  return out;
}
