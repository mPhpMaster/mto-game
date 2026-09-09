import { def } from './cards';
import { ARCHETYPE_PASSIVE, archetypeOf } from './archetypes';
import type { GearId, WeatherId } from './loadout';
import type { FieldMonster } from './types';

/**
 * حساب أثر التجهيزات والطقس والقدرات الكامنة.
 *
 * فُصلت عن `engine.ts` لأنها دوالّ خالصة بلا حالة: تأخذ وحشاً وطقساً وتعيد
 * رقماً. المحرّك ينادي هذه في نقاطٍ معدودة (الهجوم، تلقّي الضرر، بداية
 * الدور) فيبقى حلّ القتال قابلاً للقراءة، ويبقى هذا الملفّ قابلاً للاختبار
 * وحده — وهو ما يفعله `npm run check:loadout`.
 */

export const hasGear = (m: FieldMonster, id: GearId): boolean => (m.gear ?? []).includes(id);

/** مفتاح القدرة الكامنة للطراز، أو `null` لغير الوحوش */
export function passiveOf(m: FieldMonster): string | null {
  const a = archetypeOf(def(m.defId).species);
  return a ? ARCHETYPE_PASSIVE[a].key : null;
}

/**
 * هجوم الوحش بعد التجهيزات — هذا ما يُعرض وما يحسب به الذكاء الاصطناعي.
 * «نصل البرق» مشروط بالعنصر، فالتحقّق هنا لا عند التركيب وحده: لو انتقل
 * التجهيز يوماً بين وحشين وجب أن يسقط أثره على غير أهله.
 */
export function atkOf(m: FieldMonster): number {
  const d = def(m.defId);
  let atk = m.atk;
  if (hasGear(m, 'lightning_blade') && d.element === 'electric') atk += 3;
  return atk;
}

/**
 * الضربة الفعلية: الهجوم بعد التجهيز ثم بعد الطقس.
 *
 * «عاصفة رعدية» تضاعف هجمات الكهرباء بنصف، والكسر يُجبَر إلى أسفل — فوحش
 * بهجوم 3 يضرب بـ4 لا 4.5. الجبر إلى أسفل لا أعلى كي لا يربح وحشٌ ضعيف
 * نقطةً كاملة من كسرٍ صغير.
 */
export function strikeOf(m: FieldMonster, weather: WeatherId | null): number {
  const atk = atkOf(m);
  if (weather === 'thunderstorm' && def(m.defId).element === 'electric') {
    return Math.floor(atk * 1.5);
  }
  return atk;
}

/** ما ينقص من الضرر الواقع على هذا الوحش: «حراسة» 1 و«درع الصخر» 2 */
export function reductionOf(m: FieldMonster): number {
  let r = def(m.defId).ability === 'guard' ? 1 : 0;
  if (hasGear(m, 'rock_shield')) r += 2;
  return r;
}

/** «صاعقة خارقة» (فليكس): يتجاهل المهاجم نصف تخفيض المدافع، مجبوراً لأسفل */
export const surgeCut = (reduction: number): number => Math.floor(reduction / 2);

/** «نصل البرق» يخترق الدفاع أيضاً، فلا يقتصر الاختراق على قدرة البطاقة */
export function piercesOf(m: FieldMonster): boolean {
  return def(m.defId).ability === 'pierce' || hasGear(m, 'lightning_blade');
}

/** احتمالات مضبوطة في مكان واحد كي لا تتفرّق أرقامها بين المحرّك والنصوص */
export const FOG_MISS_CHANCE = 0.2;
export const AIR_DODGE_CHANCE = 0.2;

/** «أمطار حمضية»: نقطة على كل وحش كل دور، ويتضاعف معها أثر السُم */
export const ACID_RAIN_TICK = 1;
export const poisonTick = (poison: number, weather: WeatherId | null): number =>
  weather === 'acid_rain' ? poison * 2 : poison;
