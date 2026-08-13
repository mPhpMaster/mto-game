import type { Localized } from '@/lib/i18n/locale';
import type { PlayableElement } from '@/lib/game/types';

/** إحصاءات البطل التي تعدّلها الترقيات — كائن قابل للتغيير يملكه المحرّك. */
export interface Stats {
  maxHp: number;
  damage: number;
  /** طلقات في الثانية */
  fireRate: number;
  projSpeed: number;
  projCount: number;
  pierce: number;
  projRadius: number;
  moveSpeed: number;
  /** نصف قطر جذب كرات الخبرة */
  magnet: number;
  /** شفاء في الثانية */
  regen: number;
  /** شفاء عند كل قتلة */
  lifesteal: number;
  /** ضرر هالة السُم في الثانية */
  auraDps: number;
  auraRadius: number;
  /** عدد كرات الظلام الدائرة */
  orbitCount: number;
  knockback: number;
}

export function baseStats(): Stats {
  return {
    maxHp: 100,
    damage: 10,
    fireRate: 2.2,
    projSpeed: 500,
    projCount: 1,
    pierce: 0,
    projRadius: 5,
    moveSpeed: 215,
    magnet: 70,
    regen: 0,
    lifesteal: 0,
    auraDps: 0,
    auraRadius: 0,
    orbitCount: 0,
    knockback: 40,
  };
}

export interface Upgrade {
  id: string;
  icon: string;
  element: PlayableElement;
  name: Localized;
  desc: Localized;
  max: number;
  /** يُطبَّق مرّة عند كل اختيار */
  apply: (s: Stats) => void;
  /** شفاء فوري اختياري عند الاختيار */
  heal?: number;
}

export const UPGRADES: Upgrade[] = [
  // 🔥 نار
  {
    id: 'power', icon: '🔥', element: 'fire',
    name: { ar: 'لهب مركّز', en: 'Focused Flame' },
    desc: { ar: '+6 ضرر لكل طلقة', en: '+6 damage per shot' },
    max: 8, apply: (s) => { s.damage += 6; },
  },
  {
    id: 'bigshot', icon: '☄️', element: 'fire',
    name: { ar: 'كرة نار', en: 'Fireball' },
    desc: { ar: 'طلقات أكبر ترتدّ الأعداء (+2 ضرر)', en: 'Bigger shots that knock back (+2 dmg)' },
    max: 5, apply: (s) => { s.projRadius += 3; s.knockback += 70; s.damage += 2; },
  },
  // 💧 ماء
  {
    id: 'vitality', icon: '💧', element: 'water',
    name: { ar: 'حيوية', en: 'Vitality' },
    desc: { ar: '+25 أقصى حياة، وشفاء فوري', en: '+25 max HP, and heal now' },
    max: 6, apply: (s) => { s.maxHp += 25; }, heal: 25,
  },
  {
    id: 'regen', icon: '🌊', element: 'water',
    name: { ar: 'تجدّد', en: 'Regeneration' },
    desc: { ar: '+1.2 شفاء في الثانية', en: '+1.2 HP per second' },
    max: 5, apply: (s) => { s.regen += 1.2; },
  },
  // 🌿 عشب
  {
    id: 'lifesteal', icon: '🌿', element: 'grass',
    name: { ar: 'امتصاص', en: 'Lifesteal' },
    desc: { ar: '+2 شفاء عند كل قتلة', en: '+2 HP per kill' },
    max: 5, apply: (s) => { s.lifesteal += 2; },
  },
  {
    id: 'aura', icon: '🍃', element: 'grass',
    name: { ar: 'هالة سُم', en: 'Venom Aura' },
    desc: { ar: 'تؤذي الأعداء القريبين باستمرار', en: 'Constantly harms nearby foes' },
    max: 5, apply: (s) => { s.auraDps += 16; s.auraRadius = Math.max(s.auraRadius, 58) + 10; },
  },
  // ⚡ كهرباء
  {
    id: 'rapid', icon: '⚡', element: 'electric',
    name: { ar: 'إطلاق سريع', en: 'Rapid Fire' },
    desc: { ar: '+0.5 طلقة في الثانية', en: '+0.5 shots per second' },
    max: 8, apply: (s) => { s.fireRate += 0.5; },
  },
  {
    id: 'swift', icon: '💨', element: 'electric',
    name: { ar: 'خفّة', en: 'Swiftness' },
    desc: { ar: '+14% سرعة حركة', en: '+14% move speed' },
    max: 6, apply: (s) => { s.moveSpeed *= 1.14; },
  },
  // 🔮 نفسي
  {
    id: 'multishot', icon: '🔮', element: 'psychic',
    name: { ar: 'انقسام', en: 'Split Shot' },
    desc: { ar: '+1 طلقة إضافية', en: '+1 extra projectile' },
    max: 6, apply: (s) => { s.projCount += 1; },
  },
  {
    id: 'magnet', icon: '🧲', element: 'psychic',
    name: { ar: 'جذب', en: 'Magnetism' },
    desc: { ar: '+45 مدى جذب الخبرة', en: '+45 XP pickup range' },
    max: 5, apply: (s) => { s.magnet += 45; },
  },
  // 🌑 ظلام
  {
    id: 'pierce', icon: '🌑', element: 'dark',
    name: { ar: 'اختراق', en: 'Pierce' },
    desc: { ar: 'تخترق الطلقات عدوّاً إضافياً', en: 'Shots pierce one more enemy' },
    max: 5, apply: (s) => { s.pierce += 1; },
  },
  {
    id: 'orbit', icon: '🌀', element: 'dark',
    name: { ar: 'مدارات الظلّ', en: 'Shadow Orbits' },
    desc: { ar: '+1 كرة ظلام تدور حولك', en: '+1 orb circling you' },
    max: 4, apply: (s) => { s.orbitCount += 1; },
  },
];

export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

/** الترقية «التوقيعية» لكل عنصر — تُمنح مجاناً كقوّة بداية عند اختيار العنصر. */
export const SIGNATURE: Record<PlayableElement, string> = {
  fire: 'power',
  water: 'vitality',
  grass: 'lifesteal',
  electric: 'rapid',
  psychic: 'multishot',
  dark: 'pierce',
};
