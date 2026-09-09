import type { Localized } from '../i18n/locale';
import type { PlayableElement } from './types';

/**
 * التجهيزات والطقس — طبقة «مرحلة التحضير».
 *
 * لماذا خارج `CATALOG`: هذه ليست كروتاً تُسحب. في التصميم تعيش في **مخزون**
 * له عدّاد، وتُفعَّل قبل الجولة لا من اليد. ولو أُدخلت السطح لغيّرت منحنى
 * التوزيع (`check:curve`) واليد الافتتاحية (`check:opening`)، وأضافت
 * `card_def_id` جديدة إلى `profile_card_stats` المخزَّنة في قاعدة حيّة.
 * فصلُها يُبقي الأربعة عشر فحصاً وإحصاءات اللاعبين صالحةً كما هي.
 *
 * ### ترجمة DEF وSPD
 * الوثيقة تفترض عمودَي دفاع وسرعة، وليس في `FieldMonster` إلا `atk`/`hp`.
 * ولم أُضِف عمودين لأن ذلك يعيد ضبط توازن الوحوش الثلاثين ومرحلتيها. بدلاً
 * من ذلك تُرجمت النيّة إلى أفعال المحرّك القائمة:
 *
 *   +2 DEF  → ينقص الضرر الواقع عليه 2 (نفس فعل «حراسة» بمقدار أكبر)
 *   +1 SPD  → يهاجم فور نزوله. السرعة في لعبة أدوار لا تُعيد ترتيب مبادرة
 *             لأنه لا مبادرة أصلاً؛ أقرب معنى لها هو أن يتصرّف قبل انتظار دور.
 */

export type GearId = 'rock_shield' | 'lightning_blade' | 'speed_jewel' | 'healing_amulet';

export interface GearDef {
  id: GearId;
  name: Localized;
  /** الرمز المعروض على الكرت المربّع في لوحة التجهيزات */
  icon: string;
  /** السطر المختصر تحت الاسم — «+2 DEF» في الصورة */
  stat: string;
  cost: number;
  text: Localized;
  /** لا يُركَّب إلا على وحش من هذا العنصر؛ غيابه يعني «أي وحش» */
  onlyElement?: PlayableElement;
  /** كم نسخة يبدأ بها اللاعب في المخزون */
  stock: number;
  /** لون الإطار — يتبع لون التأثير لا لون العنصر */
  tint: string;
}

export const GEAR: GearDef[] = [
  {
    id: 'rock_shield',
    name: { ar: 'درع الصخر', en: 'Rock Shield' },
    icon: '🛡️',
    stat: '+2 DEF',
    cost: 1,
    text: {
      ar: 'دفاع الوحش المستهدَف: يتلقّى ضرراً أقلّ بمقدار 2.',
      en: 'The equipped monster takes 2 less damage.',
    },
    stock: 3,
    tint: 'amber',
  },
  {
    id: 'lightning_blade',
    name: { ar: 'نصل البرق', en: 'Lightning Blade' },
    icon: '⚔️',
    stat: '+3 ATK',
    cost: 3,
    text: {
      ar: 'هجوم +3 لوحوش الكهرباء وحدها، ويخترق الدفاع.',
      en: '+3 attack for Electric monsters only, and it pierces.',
    },
    onlyElement: 'electric',
    stock: 3,
    tint: 'sky',
  },
  {
    id: 'healing_amulet',
    name: { ar: 'تميمة الشفاء', en: 'Healing Amulet' },
    icon: '❤️',
    stat: '+1 HP REGEN',
    cost: 2,
    text: {
      ar: 'يستعيد نقطة صحة واحدة في بداية كل دور من أدوارك.',
      en: 'Restores 1 health at the start of each of your turns.',
    },
    stock: 2,
    tint: 'rose',
  },
  {
    id: 'speed_jewel',
    name: { ar: 'جوهرة السرعة', en: 'Speed Jewel' },
    icon: '💎',
    stat: '+1 SPD',
    cost: 3,
    text: {
      ar: 'يهاجم فور استدعائه دون انتظار دور كامل.',
      en: 'Attacks the turn it is summoned, without waiting a full turn.',
    },
    stock: 3,
    tint: 'cyan',
  },
];

export const GEAR_BY_ID: Record<GearId, GearDef> = Object.fromEntries(
  GEAR.map((g) => [g.id, g])
) as Record<GearId, GearDef>;

// ---------------------------------------------------------------------------

export type WeatherId = 'thunderstorm' | 'acid_rain' | 'heavy_fog';

export interface WeatherDef {
  id: WeatherId;
  name: Localized;
  /** الاسم الإنجليزي المطبوع تحت العربي في الصورة — ثابت في اللغتين */
  sub: string;
  icon: string;
  cost: number;
  text: Localized;
  stock: number;
  tint: string;
}

/**
 * الطقس حالة **عامّة**: واحد فقط فعّال في المباراة كلّها، وتفعيل جديد يزيح
 * القديم — كسحر الحقل في يوغي. ولذلك يعيش في `GameState` لا في `PlayerState`.
 */
export const WEATHER: WeatherDef[] = [
  {
    id: 'thunderstorm',
    name: { ar: 'عاصفة رعدية', en: 'Thunderstorm' },
    sub: 'THUNDERSTORM',
    icon: '⛈️',
    cost: 2,
    text: {
      ar: 'تزيد قوة هجمات الكهرباء بنسبة 50%.',
      en: 'Electric attacks deal 50% more damage.',
    },
    stock: 2,
    tint: 'sky',
  },
  {
    id: 'acid_rain',
    name: { ar: 'أمطار حمضية', en: 'Acid Rain' },
    sub: 'ACID RAIN',
    icon: '🌧️',
    cost: 2,
    text: {
      ar: 'كل وحش على الساحة يفقد نقطة صحة في بداية كل دور، وأثر السُم يتضاعف.',
      en: 'Every monster on the field loses 1 health each turn, and Venom is doubled.',
    },
    stock: 2,
    tint: 'lime',
  },
  {
    id: 'heavy_fog',
    name: { ar: 'ضباب كثيف', en: 'Heavy Fog' },
    sub: 'HEAVY FOG',
    icon: '☁️',
    cost: 1,
    text: {
      ar: 'كل هجوم معرَّض للإخفاق باحتمال 20%.',
      en: 'Every attack has a 20% chance to miss.',
    },
    stock: 3,
    tint: 'slate',
  },
];

/**
 * تكلفة انقشاع الطقس. زرّ «تحديث» في لوحة الطقس يفعل شيئاً حقيقياً: يزيح
 * الطقس القائم بثمن. ولولا الثمن لصار ردّاً مجّانياً على كل طقس يفعّله
 * الخصم، فلا يبقى للطقس معنى.
 */
export const WEATHER_DISPEL_COST = 1;

export const WEATHER_BY_ID: Record<WeatherId, WeatherDef> = Object.fromEntries(
  WEATHER.map((w) => [w.id, w])
) as Record<WeatherId, WeatherDef>;
