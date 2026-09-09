import type { Localized } from '@/lib/i18n/locale';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  label: Localized;
  short: string;
  description: Localized;
  /** حياة الخصم في بداية المباراة */
  aiHp: number;
  /** أقصى سقف طاقة يبلغه الخصم */
  aiMaxEnergyCap: number;
  /** احتمال أن يختار الخصم حركة أضعف من الأفضل */
  mistakeChance: number;
  /** وزن كروت التعطيل (تخطي الدور / اسحب كرتين) — أكثر ما يُحبط اللاعب الجديد */
  denialWeight: number;
  /** هل يدمج الخصم هجماته؟ */
  combo: boolean;
  /** مدى سعي الخصم لجمع قطع الوحش الأعظم */
  fragmentWeight: number;
  /**
   * مدى استعمال الخصم للتجهيزات والطقس — يُضرَب في قيمة الحركة قبل مقارنتها
   * بعتبة `chooseLoadout`، فالوزن الأقلّ يعني ألّا يشتري إلا الحركة الظاهرة
   * النفع.
   *
   * صفرٌ يعطّل الطبقة بالكامل، وقد جُرِّب في السهل فرفع فوز اللاعب من 92.7%
   * إلى 97.7%: الطبقة عمقٌ يستغلّه اللاعب، فخصمٌ يجهلها تماماً يصير هدفاً
   * ثابتاً. الأرقام أدناه مضبوطة بـ`npm run balance` لتُبقي المنحنى حيث كان.
   */
  loadoutWeight: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: { ar: 'سهل', en: 'Easy' },
    short: '🌱',
    description: {
      ar: 'الخصم أقل حياة وطاقة، يخطئ كثيراً، لا يدمج هجماته، ونادراً ما يعطّل دورك. مناسب لأول مبارياتك.',
      en: 'The opponent has less life and energy, makes frequent mistakes, never combos, and rarely denies your turn. Good for your first matches.',
    },
    aiHp: 20,
    aiMaxEnergyCap: 6,
    mistakeChance: 0.5,
    denialWeight: 0.15,
    combo: false,
    fragmentWeight: 0.05,
    loadoutWeight: 0.6,
  },
  normal: {
    id: 'normal',
    label: { ar: 'متوسط', en: 'Normal' },
    short: '⚔️',
    description: {
      ar: 'خصم متوازن: يخطئ أحياناً، يدمج هجماته، ويعطّل دورك من حين لآخر.',
      en: 'A balanced opponent: occasional mistakes, combo attacks, and the odd turn denial.',
    },
    aiHp: 26,
    aiMaxEnergyCap: 8,
    mistakeChance: 0.22,
    denialWeight: 0.55,
    combo: true,
    fragmentWeight: 0.5,
    loadoutWeight: 0.8,
  },
  hard: {
    id: 'hard',
    label: { ar: 'صعب', en: 'Hard' },
    short: '🔥',
    description: {
      ar: 'الخصم يلعب بأفضل ما لديه: لا أخطاء، يكدّس كروت السحب، يدمج هجماته، ويسابقك على الوحش الأعظم.',
      en: 'The opponent plays its best: no mistakes, stacks draw cards, combos attacks, and races you to the Titan.',
    },
    aiHp: 30,
    aiMaxEnergyCap: 10,
    mistakeChance: 0,
    denialWeight: 1,
    combo: true,
    fragmentWeight: 1,
    loadoutWeight: 1,
  },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'easy';

export function parseDifficulty(value: string | undefined | null): Difficulty {
  return value === 'normal' || value === 'hard' || value === 'easy' ? value : DEFAULT_DIFFICULTY;
}
