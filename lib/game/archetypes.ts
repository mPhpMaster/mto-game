import type { Localized } from '../i18n/locale';

/**
 * الطُّرُز — الأشكال الستّة التي تتخذها الوحوش.
 *
 * هذا الملف هو **المصدر الواحد للحقيقة** لهوية الشكل: يستهلكه فنّ البطاقات
 * ثنائي الأبعاد هنا، ويستهلكه بناء Godot ثلاثي الأبعاد لاختيار المجسّم.
 * الوصف الفنّي الكامل لكل طراز في `docs/archetypes.md`.
 *
 * الطراز صفة **الفصيلة** لا البطاقة: المرحلتان الأولى والثانية شكل واحد
 * يكبر ويتزيّن، وهذا ما يجعل التطوّر مقروءاً بصرياً رغم اختلاف الاسم.
 */
export type Archetype = 'beast' | 'serpent' | 'avian' | 'orb' | 'golem' | 'wraith';

export const ARCHETYPES: Archetype[] = ['beast', 'serpent', 'avian', 'orb', 'golem', 'wraith'];

export const ARCHETYPE_NAME: Record<Archetype, Localized> = {
  beast: { ar: 'فليكس', en: 'Flex' },
  serpent: { ar: 'زحّاف', en: 'Serpi' },
  avian: { ar: 'ريشو', en: 'Resho' },
  orb: { ar: 'هالو', en: 'Halo' },
  golem: { ar: 'كوبو', en: 'Kubo' },
  wraith: { ar: 'خَيال', en: 'Khayal' },
};

/**
 * الفصيلة ← الطراز.
 *
 * كان الشكل يُشتقّ من `hash(species) % 6`، فيقع اعتباطاً: «ناريكس» ناريّ
 * لكن هيئته يقرّرها الهاش. ومع انتقال الأشكال إلى مجسّمات ثلاثية الأبعاد
 * صارت الهيئة هوية لا زينة، فوجب أن تُكتب لا أن تُحسب.
 *
 * التوزيع مقصود: كل عنصر يملك خمسة طُرُز من ستّة، وكل طراز يظهر في خمسة
 * عناصر من ستّة — فلا عنصر يكرّر شكلاً، ولا طراز يغيب عن أكثر من عنصر
 * واحد. العنصر الغائب يختلف في كل صفّ، وهو ما يعطي كل عنصر بصمته:
 *
 *   نار لا طائر لها · ماء لا نواة · عشب لا طيف
 *   كهرباء لا وحش · نفسي لا زحّاف · ظلام لا آليّ
 */
export const SPECIES_ARCHETYPE: Record<string, Archetype> = {
  // نار — بلا «ريشو»
  lahibo: 'beast', // لهيبو ← ضِرغام: أسد لهب
  smoki: 'serpent', // سموكي ← رَماد: دخان ملتفّ
  volkani: 'orb', // حِمَمو ← بُركان: نواة منصهرة
  nariks: 'golem', // ناريكس ← أتون: هيكل أتون
  jamra: 'wraith', // جمرة ← سَعير: لهب حيّ بلا جسد

  // ماء — بلا «هالو»
  muwaija: 'beast', // مويجة ← طوفان: حارس النهر
  leviathi: 'serpent', // حوتو ← ليفياثان: أفعى البحر
  tsuna: 'avian', // تسونا ← هادر: طائر العاصفة
  korali: 'golem', // كورالي ← مِحار: درع صَدَفيّ
  azraqo: 'wraith', // أزرقو ← لُجّة: شبح الأعماق

  // عشب — بلا «خَيال»
  shawka: 'beast', // شوكة ← قَتاد: وحش شائك
  fainks: 'serpent', // فاينكسي ← خانِق: لبلاب خانق
  waraqi: 'avian', // ورقي ← جَريد: طائر الورق
  bur3um: 'orb', // برعوم ← إكليل: برعم طافٍ
  ghabor: 'golem', // غابور ← سِنديان: عملاق خشبيّ

  // كهرباء — بلا «فليكس»
  thandiro: 'serpent', // دينامو ← مِغناط: أنقليس كهربائي
  ra3doon: 'avian', // رعدون ← قاصِف: طائر الرعد
  sharara: 'orb', // شرارة ← وَميض: نواة شرر
  volti: 'golem', // فولتي ← مِلَفّ: آلة ملفّات
  plazmi: 'wraith', // بلازمي ← شَفَق: شفق بلا جسد

  // نفسي — بلا «زحّاف»
  nirfa: 'beast', // عصبو ← ذُبول: وحش ناهب
  taifa: 'avian', // طيفا ← سَراب: طائر السراب
  holmi: 'orb', // حلمي ← سُبات: نواة حُلم
  orakl: 'golem', // أوراكل ← كاهن: تمثال عرّاف
  thehno: 'wraith', // ذهنو ← إدراك: وعي بلا هيئة

  // ظلام — بلا «كوبو»
  shadow: 'beast', // عقربو ← مِنجل: عقرب
  lailks: 'serpent', // ليلكس ← كُسوف: أفعى الليل
  nightmare: 'avian', // كابوس ← هَول: غراب
  voido: 'orb', // فويدو ← عَدَم: كرة عدم
  thilli: 'wraith', // ظلّي ← دُجى: ظلّ حيّ
};

/**
 * طراز الفصيلة. القطع والكروت غير الوحشية لا فصيلة لها، فتعود بـ`null`.
 * الفصيلة المجهولة تعود بـ`null` أيضاً ولا ترمي: `archetype-check` يمنع
 * وقوع ذلك في الكتالوج، والواجهة لا يجوز أن تنهار لو وقع.
 */
export function archetypeOf(species: string | undefined): Archetype | null {
  if (!species) return null;
  return SPECIES_ARCHETYPE[species] ?? null;
}

/**
 * القدرة الكامنة — صفة الطراز، فترثها فصائله الخمس.
 *
 * الوثيقة التصميمية نسبت هذه القدرات إلى «كوبو» و«فليكس» كأنها خمسة وحوش،
 * وهي طُرُز يحمل كلٌّ منها خمس فصائل. ونسبتُها إلى الطراز أصدق للاعب: الشكل
 * يصير قابلاً للقراءة من بعيد — «هذا زحّاف، إذن يسمّم» — فتُفيد الهيئةُ في
 * اللعب لا في العين وحدها.
 *
 * ثلاثٌ منها موجودة في المحرّك أصلاً كقدرات بطاقة (`venom` و`pierce`
 * و`guard`)، فالجديد فيها التعميمُ على الطراز لا البرمجة من الصفر.
 */
export interface ArchetypePassive {
  key: string;
  name: Localized;
  text: Localized;
}

export const ARCHETYPE_PASSIVE: Record<Archetype, ArchetypePassive> = {
  golem: {
    key: 'thermal_shield',
    name: { ar: 'درع حراري', en: 'Thermal Shield' },
    text: {
      ar: 'يردّ نقطة ضرر واحدة إلى كل من يهاجمه.',
      en: 'Reflects 1 damage back at every attacker.',
    },
  },
  serpent: {
    key: 'venom_trail',
    name: { ar: 'أثر سام', en: 'Venom Trail' },
    text: {
      ar: 'هجماته تسمّم: يفقد المصاب نقطة صحة في بداية كل دور.',
      en: 'Its attacks poison: the victim loses 1 health each turn.',
    },
  },
  orb: {
    key: 'absorb_ring',
    name: { ar: 'حلقة امتصاص', en: 'Absorb Ring' },
    text: {
      ar: 'يمتصّ أوّل ضرر سحري أو بيئي يصيبه دون أن يتأثّر.',
      en: 'Absorbs the first spell or weather damage it takes.',
    },
  },
  beast: {
    key: 'surge_strike',
    name: { ar: 'صاعقة خارقة', en: 'Surge Strike' },
    text: {
      ar: 'هجماته تتجاهل نصف ما يخفّضه دفاع الخصم.',
      en: 'Its attacks ignore half of the defender’s damage reduction.',
    },
  },
  avian: {
    key: 'air_dodge',
    name: { ar: 'تفادٍ هوائي', en: 'Air Dodge' },
    text: {
      ar: 'يتفادى الهجوم بالكامل باحتمال 20%.',
      en: 'Has a 20% chance to dodge an attack entirely.',
    },
  },
  wraith: {
    key: 'spectral_return',
    name: { ar: 'عودة الطيف', en: 'Spectral Return' },
    text: {
      ar: 'أوّل مرّة يُهزم فيها يعود إلى الساحة بنقطة صحة واحدة.',
      en: 'The first time it is defeated, it returns to the field with 1 health.',
    },
  },
};
