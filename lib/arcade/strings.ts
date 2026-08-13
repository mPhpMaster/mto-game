import type { Localized } from '@/lib/i18n/locale';

/**
 * نصوص وضع «البقاء» ثنائية اللغة — مستقلّة عن قاموس واجهة لعبة الكروت
 * (`lib/i18n/ui.ts`) حتى يبقى هذا الوضع منفصلاً ولا يتأثّر بفحوصات الرسائل هناك.
 * تُقرأ عبر `useLocale().L(...)`.
 */
export const AR: Record<string, Localized> = {
  title: { ar: 'مواجهة الوحوش: البقاء', en: 'Monster Showdown: Survival' },
  tagline: {
    ar: 'اصمد أمام موجات وحوش العناصر الستّة، وارتقِ بقواك، واهزم الوحش الأعظم.',
    en: 'Survive waves of the six elements, level up your powers, and defeat the Great Titan.',
  },
  title3d: { ar: 'مواجهة الوحوش: البقاء 3D', en: 'Monster Showdown: Survival 3D' },
  tagline3d: {
    ar: 'ساحة ثلاثية الأبعاد: حرّك بطلك بين موجات وحوش العناصر، وارتقِ، واسقِط الوحش الأعظم.',
    en: 'A 3D arena: move your hero through elemental monster waves, level up, and fell the Great Titan.',
  },

  chooseElement: { ar: 'اختر عنصرك', en: 'Choose your element' },
  elementHint: {
    ar: 'يحدّد لون هجومك وقوّتك الأولى.',
    en: 'Sets your attack color and starting perk.',
  },
  start: { ar: 'ابدأ ▸', en: 'Start ▸' },
  howMove: { ar: 'اسحب في أي مكان للحركة', en: 'Drag anywhere to move' },
  howShoot: { ar: 'الهجوم تلقائي على أقرب عدو', en: 'You auto-attack the nearest foe' },
  howGems: { ar: 'اجمع كرات الخبرة لترتقي', en: 'Collect XP shards to level up' },

  hp: { ar: 'الحياة', en: 'HP' },
  lvl: { ar: 'مستوى', en: 'LV' },
  time: { ar: 'الزمن', en: 'Time' },
  kills: { ar: 'القتلى', en: 'Kills' },
  wave: { ar: 'الموجة', en: 'Wave' },

  levelUp: { ar: 'ارتقيت!', en: 'Level Up!' },
  levelUpHint: { ar: 'اختر قوّة واحدة', en: 'Choose one power' },
  maxed: { ar: 'أقصى مستوى', en: 'MAX' },
  lvPrefix: { ar: 'مستوى', en: 'Lv' },

  pause: { ar: 'إيقاف', en: 'Pause' },
  paused: { ar: 'متوقّفة', en: 'Paused' },
  resume: { ar: 'متابعة', en: 'Resume' },
  quit: { ar: 'خروج', en: 'Quit' },

  titanIncoming: { ar: '⚠ الوحش الأعظم قادم!', en: '⚠ The Great Titan approaches!' },
  titanDown: { ar: 'سقط الوحش الأعظم!', en: 'The Great Titan has fallen!' },
  fragmentGet: { ar: 'حصلت على قطعة!', en: 'Fragment obtained!' },
  ascension: { ar: '⭐ اكتمل الوحش الأعظم — قوّة مطلقة!', en: '⭐ Titan complete — ultimate power!' },
  fragments: { ar: 'القطع', en: 'Fragments' },

  gameOver: { ar: 'انتهت اللعبة', en: 'Game Over' },
  survived: { ar: 'صمدت', en: 'Survived' },
  reached: { ar: 'بلغت المستوى', en: 'Reached level' },
  best: { ar: 'أفضل زمن', en: 'Best time' },
  newBest: { ar: '🏆 رقم قياسي جديد!', en: '🏆 New record!' },
  retry: { ar: 'العب مجدّداً ↺', en: 'Play again ↺' },
  home: { ar: 'الرئيسية', en: 'Home' },

  back: { ar: '‹ رجوع', en: '‹ Back' },
};
