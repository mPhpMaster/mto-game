import type { Element, PlayableElement } from '@/lib/game/types';
import { ELEMENTS, ELEMENT_ICON, ELEMENT_NAME } from '@/lib/game/cards';

/**
 * ثيم وضع «البقاء» — يعيد استخدام عناصر لعبة الكروت (النار/الماء/العشب/الكهرباء/
 * النفسي/الظلام) وأشكال الوحوش الستّة، لكن كرسوم Canvas بدل SVG لأداء اللعب الحيّ.
 */

export type Archetype = 'beast' | 'serpent' | 'avian' | 'orb' | 'golem' | 'wraith';
export const ARCHETYPES: Archetype[] = ['beast', 'serpent', 'avian', 'orb', 'golem', 'wraith'];

export interface Palette {
  main: string;
  deep: string;
  glow: string;
}

/** نفس ألوان `components/game/CardArt` — تُنسخ هنا ليبقى محرّك اللعبة مستقلّاً عن الواجهة. */
export const PALETTE: Record<Element, Palette> = {
  fire: { main: '#ff8a4c', deep: '#a02b12', glow: '#ffd08a' },
  water: { main: '#4cb4ff', deep: '#134a8f', glow: '#a8e0ff' },
  grass: { main: '#5fdc93', deep: '#14663c', glow: '#c2f5d5' },
  electric: { main: '#ffd83d', deep: '#8a6a00', glow: '#fff2a8' },
  psychic: { main: '#cb84ff', deep: '#5b1f8f', glow: '#ecd0ff' },
  dark: { main: '#98a0bd', deep: '#252a45', glow: '#d3d8ea' },
  wild: { main: '#ff7ab5', deep: '#8f1f57', glow: '#ffd0e5' },
};

export { ELEMENTS, ELEMENT_ICON, ELEMENT_NAME };

/** نوع العدو يحدّد سلوكه وإحصاءاته الأساسية؛ العنصر والشكل يُختاران عشوائياً للتنويع البصري. */
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'caster';

export interface EnemyKindDef {
  kind: EnemyKind;
  /** نصف قطر التصادم */
  r: number;
  hp: number;
  speed: number;
  /** ضرر التلامس */
  touch: number;
  /** خبرة يسقطها عند موته */
  xp: number;
  /** الأشكال المفضّلة لهذا النوع */
  shapes: Archetype[];
  /** caster فقط: يطلق قذائف */
  shoots?: boolean;
}

export const ENEMY_KINDS: Record<EnemyKind, EnemyKindDef> = {
  grunt: { kind: 'grunt', r: 16, hp: 22, speed: 58, touch: 8, xp: 3, shapes: ['beast', 'golem'] },
  runner: { kind: 'runner', r: 13, hp: 12, speed: 132, touch: 6, xp: 4, shapes: ['serpent', 'avian'] },
  tank: { kind: 'tank', r: 26, hp: 64, speed: 40, touch: 14, xp: 9, shapes: ['golem', 'beast'] },
  caster: { kind: 'caster', r: 17, hp: 26, speed: 46, touch: 7, xp: 6, shapes: ['orb', 'wraith'], shoots: true },
};

/** ترتيب جمع قطع الوحش الأعظم مع عنصر كلٍّ منها (للتلوين) — مطابق لكتالوج الكروت. */
export const FRAGMENTS: { id: string; icon: string; element: PlayableElement }[] = [
  { id: 'heart', icon: '❤', element: 'fire' },
  { id: 'fang', icon: '🦷', element: 'dark' },
  { id: 'shield', icon: '🛡', element: 'water' },
  { id: 'crown', icon: '👑', element: 'psychic' },
];

export const TITAN_NAME = { ar: 'الوحش الأعظم — أومِگا', en: 'The Great Titan — Omega' };
