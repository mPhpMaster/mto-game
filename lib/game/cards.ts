import type { Localized } from '@/lib/i18n/locale';
import type {
  Ability,
  CardDef,
  Element,
  PlayableElement,
  SpellEffect,
  TrapEffect,
  TrapTiming,
} from './types';

export const ELEMENTS: PlayableElement[] = [
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'dark',
];

export const ELEMENT_NAME: Record<Element, Localized> = {
  fire: { ar: 'نار', en: 'Fire' },
  water: { ar: 'ماء', en: 'Water' },
  grass: { ar: 'عشب', en: 'Grass' },
  electric: { ar: 'كهرباء', en: 'Electric' },
  psychic: { ar: 'نفسي', en: 'Psychic' },
  dark: { ar: 'ظلام', en: 'Dark' },
  wild: { ar: 'بري', en: 'Wild' },
};

export const ELEMENT_ICON: Record<Element, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  psychic: '🔮',
  dark: '🌑',
  wild: '🌈',
};

export const KIND_NAME: Record<CardDef['kind'], Localized> = {
  monster: { ar: 'وحش', en: 'Monster' },
  action: { ar: 'حركة', en: 'Action' },
  trap: { ar: 'فخ', en: 'Trap' },
  spell: { ar: 'سحر', en: 'Spell' },
  fragment: { ar: 'قطعة', en: 'Fragment' },
};

/**
 * ترتيب عرض الأنواع في اليد داخل مجموعة القابلية الواحدة: الوحوش أوّلاً
 * (جوهر اللعب)، ثم الأفخاخ، ثم البقية — فتتجمّع الكروت المتشابهة.
 */
export const HAND_KIND_ORDER: Record<CardDef['kind'], number> = {
  monster: 0,
  trap: 1,
  spell: 2,
  action: 3,
  fragment: 4,
};

export const ABILITY_NAME: Record<Ability, Localized> = {
  none: { ar: '—', en: '—' },
  rush: { ar: 'اندفاع', en: 'Rush' },
  charge: { ar: 'شحن', en: 'Charge' },
  guard: { ar: 'حراسة', en: 'Guard' },
  pierce: { ar: 'اختراق', en: 'Pierce' },
  drain: { ar: 'امتصاص', en: 'Drain' },
  link: { ar: 'رابط', en: 'Link' },
  scout: { ar: 'استطلاع', en: 'Scout' },
  venom: { ar: 'سُم', en: 'Venom' },
};

export const ABILITY_TEXT: Record<Ability, Localized> = {
  none: { ar: '', en: '' },
  rush: { ar: 'اندفاع: يهاجم فور استدعائه.', en: 'Rush: can attack the turn it is summoned.' },
  charge: { ar: 'شحن: +1 طاقة في بداية دورك.', en: 'Charge: +1 energy at the start of your turn.' },
  guard: { ar: 'حراسة: يتلقى ضرراً أقل بمقدار 1.', en: 'Guard: takes 1 less damage.' },
  pierce: {
    ar: 'اختراق: الضرر الزائد يصيب الخصم مباشرة.',
    en: 'Pierce: excess damage hits the opponent directly.',
  },
  drain: {
    ar: 'امتصاص: تستعيد حياة بنصف الضرر المُحدث.',
    en: 'Drain: heals you for half the damage dealt.',
  },
  link: {
    ar: 'رابط: يُدمج في هجوم مشترك مع أي عنصر.',
    en: 'Link: can combo with monsters of any element.',
  },
  scout: { ar: 'استطلاع: اسحب كرتاً عند الاستدعاء.', en: 'Scout: draw a card when summoned.' },
  venom: { ar: 'سُم: يصيب المهاجم بـ1 ضرر.', en: 'Venom: deals 1 damage to the attacker.' },
};

interface SpeciesRow {
  species: string;
  base: Localized;
  evo: Localized;
  n1: number;
  a1: number;
  h1: number;
  ab1: Ability;
  n2: number;
  a2: number;
  h2: number;
  ab2: Ability;
}

/**
 * مفتاح `species` جزءٌ من هوية الكارت (`mon_<element>_<species>_<stage>`)، والهوية
 * مخزَّنة في `profile_card_stats.card_def_id` وفي سجلّات المباريات — فلا تُغيَّر.
 * أسماء العرض وحدها هي ما يتغيّر، ولذلك بقي `thandiro` مثلاً مفتاحاً لـ«دينامو».
 */
const SPECIES: Record<PlayableElement, SpeciesRow[]> = {
  fire: [
    { species: 'lahibo', base: { ar: 'لهيبو', en: 'Blazlet' }, evo: { ar: 'لهيبيون', en: 'Blazlion' }, n1: 2, a1: 3, h1: 5, ab1: 'none', n2: 7, a2: 6, h2: 9, ab2: 'rush' },
    { species: 'jamra', base: { ar: 'جمرة', en: 'Emberin' }, evo: { ar: 'جمرالنار', en: 'Emberfang' }, n1: 1, a1: 2, h1: 4, ab1: 'venom', n2: 6, a2: 5, h2: 8, ab2: 'pierce' },
    { species: 'nariks', base: { ar: 'ناريكس', en: 'Narix' }, evo: { ar: 'ناريكس الجحيم', en: 'Narix Inferno' }, n1: 5, a1: 4, h1: 4, ab1: 'rush', n2: 9, a2: 7, h2: 8, ab2: 'pierce' },
    { species: 'smoki', base: { ar: 'سموكي', en: 'Smokel' }, evo: { ar: 'سموكوس', en: 'Smokos' }, n1: 3, a1: 3, h1: 3, ab1: 'scout', n2: 8, a2: 5, h2: 7, ab2: 'drain' },
    { species: 'volkani', base: { ar: 'حِمَمو', en: 'Lavel' }, evo: { ar: 'حِمَموس', en: 'Lavos' }, n1: 4, a1: 5, h1: 6, ab1: 'none', n2: 0, a2: 8, h2: 10, ab2: 'guard' },
  ],
  water: [
    { species: 'muwaija', base: { ar: 'مويجة', en: 'Ripplet' }, evo: { ar: 'مويجاتور', en: 'Rippletor' }, n1: 1, a1: 2, h1: 6, ab1: 'guard', n2: 6, a2: 5, h2: 11, ab2: 'guard' },
    { species: 'azraqo', base: { ar: 'أزرقو', en: 'Azuro' }, evo: { ar: 'أزرقاش', en: 'Azurash' }, n1: 3, a1: 3, h1: 5, ab1: 'drain', n2: 8, a2: 6, h2: 9, ab2: 'drain' },
    { species: 'tsuna', base: { ar: 'تسونا', en: 'Tsuna' }, evo: { ar: 'تسونامي', en: 'Tsunami' }, n1: 2, a1: 4, h1: 5, ab1: 'none', n2: 7, a2: 7, h2: 9, ab2: 'pierce' },
    { species: 'korali', base: { ar: 'كورالي', en: 'Coralin' }, evo: { ar: 'كورالوس', en: 'Coralos' }, n1: 4, a1: 2, h1: 7, ab1: 'charge', n2: 9, a2: 4, h2: 12, ab2: 'charge' },
    { species: 'leviathi', base: { ar: 'ليفياثي', en: 'Leviathi' }, evo: { ar: 'ليفياثان', en: 'Leviathan' }, n1: 0, a1: 5, h1: 6, ab1: 'link', n2: 5, a2: 8, h2: 11, ab2: 'link' },
  ],
  grass: [
    { species: 'bur3um', base: { ar: 'برعوم', en: 'Budlet' }, evo: { ar: 'برعومان', en: 'Budloom' }, n1: 1, a1: 2, h1: 5, ab1: 'charge', n2: 6, a2: 4, h2: 10, ab2: 'charge' },
    { species: 'waraqi', base: { ar: 'ورقي', en: 'Leafin' }, evo: { ar: 'ورقاتور', en: 'Leafator' }, n1: 2, a1: 3, h1: 4, ab1: 'scout', n2: 7, a2: 6, h2: 8, ab2: 'scout' },
    { species: 'fainks', base: { ar: 'فاينكسي', en: 'Vinex' }, evo: { ar: 'فاينكسوس', en: 'Vinexus' }, n1: 3, a1: 4, h1: 6, ab1: 'drain', n2: 8, a2: 7, h2: 10, ab2: 'drain' },
    { species: 'shawka', base: { ar: 'شوكة', en: 'Thornet' }, evo: { ar: 'شوكاتور', en: 'Thornator' }, n1: 0, a1: 3, h1: 3, ab1: 'venom', n2: 5, a2: 5, h2: 6, ab2: 'venom' },
    { species: 'ghabor', base: { ar: 'غابور', en: 'Gabor' }, evo: { ar: 'غابورون', en: 'Gaboron' }, n1: 4, a1: 5, h1: 7, ab1: 'guard', n2: 9, a2: 8, h2: 12, ab2: 'guard' },
  ],
  electric: [
    { species: 'sharara', base: { ar: 'شرارة', en: 'Sparkit' }, evo: { ar: 'شراروس', en: 'Sparkos' }, n1: 1, a1: 3, h1: 3, ab1: 'rush', n2: 6, a2: 6, h2: 6, ab2: 'rush' },
    { species: 'volti', base: { ar: 'فولتي', en: 'Volti' }, evo: { ar: 'فولتاج', en: 'Voltage' }, n1: 2, a1: 2, h1: 4, ab1: 'charge', n2: 7, a2: 5, h2: 7, ab2: 'charge' },
    { species: 'ra3doon', base: { ar: 'رعدون', en: 'Thundon' }, evo: { ar: 'رعدونيوم', en: 'Thundonium' }, n1: 3, a1: 4, h1: 4, ab1: 'none', n2: 8, a2: 7, h2: 8, ab2: 'pierce' },
    { species: 'plazmi', base: { ar: 'بلازمي', en: 'Plazmi' }, evo: { ar: 'بلازمون', en: 'Plazmon' }, n1: 0, a1: 5, h1: 4, ab1: 'link', n2: 5, a2: 8, h2: 7, ab2: 'link' },
    { species: 'thandiro', base: { ar: 'دينامو', en: 'Dynamel' }, evo: { ar: 'ديناموس', en: 'Dynamos' }, n1: 4, a1: 3, h1: 6, ab1: 'venom', n2: 9, a2: 6, h2: 10, ab2: 'rush' },
  ],
  psychic: [
    { species: 'holmi', base: { ar: 'حلمي', en: 'Dreamlet' }, evo: { ar: 'حلماتور', en: 'Dreamator' }, n1: 1, a1: 2, h1: 5, ab1: 'scout', n2: 6, a2: 5, h2: 9, ab2: 'scout' },
    { species: 'thehno', base: { ar: 'ذهنو', en: 'Mindo' }, evo: { ar: 'ذهنوس', en: 'Mindos' }, n1: 2, a1: 3, h1: 4, ab1: 'link', n2: 7, a2: 6, h2: 7, ab2: 'link' },
    { species: 'taifa', base: { ar: 'طيفا', en: 'Spectra' }, evo: { ar: 'طيفانا', en: 'Spectrana' }, n1: 3, a1: 4, h1: 3, ab1: 'pierce', n2: 8, a2: 7, h2: 6, ab2: 'pierce' },
    { species: 'orakl', base: { ar: 'أوراكل', en: 'Oracle' }, evo: { ar: 'أوراكلون', en: 'Oraclon' }, n1: 0, a1: 2, h1: 6, ab1: 'charge', n2: 5, a2: 4, h2: 11, ab2: 'charge' },
    { species: 'nirfa', base: { ar: 'عصبو', en: 'Nervin' }, evo: { ar: 'عصبوس', en: 'Nervos' }, n1: 4, a1: 5, h1: 5, ab1: 'none', n2: 9, a2: 8, h2: 9, ab2: 'drain' },
  ],
  dark: [
    { species: 'thilli', base: { ar: 'ظلّي', en: 'Shadel' }, evo: { ar: 'ظلاتور', en: 'Shadator' }, n1: 1, a1: 3, h1: 4, ab1: 'venom', n2: 6, a2: 6, h2: 8, ab2: 'venom' },
    { species: 'shadow', base: { ar: 'عقربو', en: 'Scorvel' }, evo: { ar: 'عقربون', en: 'Scorvon' }, n1: 2, a1: 4, h1: 3, ab1: 'rush', n2: 7, a2: 7, h2: 6, ab2: 'rush' },
    { species: 'lailks', base: { ar: 'ليلكس', en: 'Nyxel' }, evo: { ar: 'ليلكسون', en: 'Nyxelon' }, n1: 3, a1: 2, h1: 6, ab1: 'guard', n2: 8, a2: 5, h2: 10, ab2: 'guard' },
    { species: 'nightmare', base: { ar: 'نايتمير', en: 'Nightmare' }, evo: { ar: 'نايتميروس', en: 'Nightmaros' }, n1: 0, a1: 5, h1: 5, ab1: 'drain', n2: 5, a2: 8, h2: 9, ab2: 'drain' },
    { species: 'voido', base: { ar: 'فويدو', en: 'Voido' }, evo: { ar: 'فويدوس', en: 'Voidos' }, n1: 4, a1: 3, h1: 7, ab1: 'link', n2: 9, a2: 6, h2: 11, ab2: 'pierce' },
  ],
};

function monsterCost(atk: number, hp: number, ability: Ability): number {
  const strong: Ability[] = ['rush', 'pierce', 'drain', 'link'];
  const base = Math.round((atk + hp) / 4);
  return Math.max(1, Math.min(9, base + (strong.includes(ability) ? 1 : 0)));
}

function monsterText(stage: 1 | 2, ability: Ability): Localized {
  const stageText: Localized =
    stage === 1
      ? { ar: 'وحش أساسي.', en: 'Basic monster.' }
      : { ar: 'وحش متطوّر.', en: 'Evolved monster.' };
  const ab = ABILITY_TEXT[ability];
  return {
    ar: ab.ar ? `${stageText.ar} ${ab.ar}` : stageText.ar,
    en: ab.en ? `${stageText.en} ${ab.en}` : stageText.en,
  };
}

const TRAPS: {
  id: string;
  name: Localized;
  effect: TrapEffect;
  timing: TrapTiming;
  element: PlayableElement;
  number: number;
  cost: number;
  text: Localized;
}[] = [
  {
    id: 'trap_ambush', name: { ar: 'كمين', en: 'Ambush' }, effect: 'ambush', timing: 'opponent_attack',
    element: 'fire', number: 2, cost: 1,
    text: { ar: 'عند هجوم الخصم: 3 ضرر للوحش المهاجم.', en: 'When the opponent attacks: 3 damage to the attacker.' },
  },
  {
    id: 'trap_energy_steal', name: { ar: 'سرقة طاقة', en: 'Energy Siphon' }, effect: 'energy_steal', timing: 'opponent_turn_start',
    element: 'electric', number: 3, cost: 1,
    text: { ar: 'في بداية دور الخصم: اسحب منه 1 طاقة واكسب 2.', en: "At the start of the opponent's turn: drain 1 energy, gain 2." },
  },
  {
    id: 'trap_barrier', name: { ar: 'حاجز', en: 'Barrier' }, effect: 'barrier', timing: 'opponent_attack',
    element: 'water', number: 4, cost: 1,
    text: { ar: 'يلغي الهجوم القادم بالكامل.', en: 'Negates the next attack entirely.' },
  },
  {
    id: 'trap_blast', name: { ar: 'انفجار مضاد', en: 'Counter Blast' }, effect: 'blast', timing: 'opponent_summon',
    element: 'fire', number: 6, cost: 2,
    text: { ar: 'عند استدعاء الخصم لوحش: 4 ضرر له.', en: 'When the opponent summons a monster: 4 damage to it.' },
  },
  {
    id: 'trap_net', name: { ar: 'شبكة', en: 'Net' }, effect: 'net', timing: 'opponent_turn_start',
    element: 'grass', number: 5, cost: 2,
    text: { ar: 'في بداية دور الخصم: لا يستطيع الهجوم هذا الدور.', en: "At the start of the opponent's turn: they cannot attack this turn." },
  },
  {
    id: 'trap_curse', name: { ar: 'لعنة', en: 'Curse' }, effect: 'curse', timing: 'opponent_turn_start',
    element: 'dark', number: 7, cost: 2,
    text: { ar: 'في بداية دور الخصم: يتخلّص من كرتين.', en: "At the start of the opponent's turn: they discard 2 cards." },
  },
  {
    id: 'trap_relic_break', name: { ar: 'تحطيم الأثر', en: 'Relic Break' }, effect: 'relic_break', timing: 'opponent_turn_start',
    element: 'psychic', number: 8, cost: 2,
    text: { ar: 'في بداية دور الخصم: دمّر إحدى قطع الوحش الكبير لديه.', en: "At the start of the opponent's turn: destroy one of their Titan fragments." },
  },
  {
    id: 'trap_counter_surge', name: { ar: 'شحنة مضادة', en: 'Counter Surge' }, effect: 'counter_surge', timing: 'opponent_turn_start',
    element: 'electric', number: 9, cost: 1,
    text: { ar: 'في بداية دور الخصم: اكسب 3 طاقة في دورك القادم.', en: "At the start of the opponent's turn: gain 3 energy next turn." },
  },
  {
    id: 'trap_mirror', name: { ar: 'عكس التيار', en: 'Reverse Current' }, effect: 'mirror', timing: 'opponent_attack',
    element: 'psychic', number: 0, cost: 2,
    text: { ar: 'عند هجوم الخصم: يرتد نصف الضرر إلى حياته.', en: 'When the opponent attacks: half the damage reflects to their life.' },
  },

  // ===== الموجة الثانية: 18 تصميماً =====
  // --- ردّ على الهجوم ---
  {
    id: 'trap_thorns', name: { ar: 'شوك', en: 'Thorns' }, effect: 'thorns', timing: 'opponent_attack',
    element: 'grass', number: 1, cost: 1,
    text: { ar: 'عند هجوم الخصم: المهاجم يتلقّى ضرراً بنصف هجومه.', en: 'When the opponent attacks: the attacker takes damage equal to half its attack.' },
  },
  {
    id: 'trap_chain', name: { ar: 'قيد', en: 'Shackle' }, effect: 'chain', timing: 'opponent_attack',
    element: 'dark', number: 3, cost: 2,
    text: { ar: 'يلغي الهجوم القادم ويُنهك المهاجم.', en: 'Negates the next attack and exhausts the attacker.' },
  },
  {
    id: 'trap_spike_wall', name: { ar: 'جدار شوكي', en: 'Spike Wall' }, effect: 'spike_wall', timing: 'opponent_attack',
    element: 'grass', number: 6, cost: 2,
    text: { ar: 'عند هجوم الخصم: 2 ضرر لكل وحوشه.', en: 'When the opponent attacks: 2 damage to every monster they control.' },
  },
  {
    id: 'trap_siphon_strike', name: { ar: 'امتصاص الضربة', en: 'Siphon Strike' }, effect: 'siphon_strike', timing: 'opponent_attack',
    element: 'water', number: 8, cost: 1,
    text: { ar: 'عند هجوم الخصم: استعد 4 نقاط حياة.', en: 'When the opponent attacks: restore 4 life.' },
  },
  {
    id: 'trap_disarm', name: { ar: 'نزع السلاح', en: 'Disarm' }, effect: 'disarm', timing: 'opponent_attack',
    element: 'psychic', number: 5, cost: 2,
    text: { ar: 'عند هجوم الخصم: المهاجم يفقد 2 هجوم بشكل دائم.', en: 'When the opponent attacks: the attacker permanently loses 2 attack.' },
  },
  {
    id: 'trap_frost', name: { ar: 'صقيع', en: 'Frost' }, effect: 'frost', timing: 'opponent_attack',
    element: 'water', number: 2, cost: 1,
    text: { ar: 'عند هجوم الخصم: يفقد كل طاقته المتبقية.', en: 'When the opponent attacks: they lose all their remaining energy.' },
  },
  // --- ردّ على الاستدعاء ---
  {
    id: 'trap_sinkhole', name: { ar: 'هوّة', en: 'Sinkhole' }, effect: 'sinkhole', timing: 'opponent_summon',
    element: 'grass', number: 4, cost: 2,
    text: { ar: 'عند استدعاء الخصم لوحش: يعود إلى يده.', en: 'When the opponent summons a monster: return it to their hand.' },
  },
  {
    id: 'trap_tax', name: { ar: 'إتاوة', en: 'Tithe' }, effect: 'tax', timing: 'opponent_summon',
    element: 'dark', number: 9, cost: 1,
    text: { ar: 'عند استدعاء الخصم: اسحب منه 2 طاقة واكسب 1.', en: 'When the opponent summons: drain 2 of their energy and gain 1.' },
  },
  {
    id: 'trap_mimic', name: { ar: 'محاكاة', en: 'Mimic' }, effect: 'mimic', timing: 'opponent_summon',
    element: 'psychic', number: 1, cost: 1,
    text: { ar: 'عند استدعاء الخصم: اسحب كرتين.', en: 'When the opponent summons: draw 2 cards.' },
  },
  {
    id: 'trap_weaken', name: { ar: 'إضعاف', en: 'Weaken' }, effect: 'weaken', timing: 'opponent_summon',
    element: 'dark', number: 6, cost: 1,
    text: { ar: 'عند استدعاء الخصم: الوحش المُستدعى يفقد 2 هجوم.', en: 'When the opponent summons: the summoned monster loses 2 attack.' },
  },
  {
    id: 'trap_soul_tithe', name: { ar: 'عُشر الروح', en: 'Soul Tithe' }, effect: 'soul_tithe', timing: 'opponent_summon',
    element: 'fire', number: 5, cost: 2,
    text: { ar: 'عند استدعاء الخصم: 3 ضرر لحياته مباشرة.', en: 'When the opponent summons: 3 damage directly to their life.' },
  },
  // --- بداية دور الخصم ---
  {
    id: 'trap_plague', name: { ar: 'طاعون', en: 'Plague' }, effect: 'plague', timing: 'opponent_turn_start',
    element: 'dark', number: 0, cost: 2,
    text: { ar: 'في بداية دور الخصم: 2 ضرر لكل وحوشه.', en: "At the start of the opponent's turn: 2 damage to every monster they control." },
  },
  {
    id: 'trap_time_theft', name: { ar: 'سرقة وقت', en: 'Time Theft' }, effect: 'time_theft', timing: 'opponent_turn_start',
    element: 'psychic', number: 3, cost: 1,
    text: { ar: 'في بداية دور الخصم: يتخلّص من كارت وتسحب أنت واحداً.', en: "At the start of the opponent's turn: they discard 1 card and you draw 1." },
  },
  {
    id: 'trap_hex', name: { ar: 'سِحر أسود', en: 'Hex' }, effect: 'hex', timing: 'opponent_turn_start',
    element: 'dark', number: 2, cost: 2,
    text: { ar: 'في بداية دور الخصم: 4 ضرر لحياته مباشرة.', en: "At the start of the opponent's turn: 4 damage directly to their life." },
  },
  {
    id: 'trap_drought', name: { ar: 'جفاف', en: 'Drought' }, effect: 'drought', timing: 'opponent_turn_start',
    element: 'fire', number: 7, cost: 1,
    text: { ar: 'في بداية دور الخصم: يفقد 3 طاقة.', en: "At the start of the opponent's turn: they lose 3 energy." },
  },
  {
    id: 'trap_bramble', name: { ar: 'عوسج', en: 'Bramble' }, effect: 'bramble', timing: 'opponent_turn_start',
    element: 'grass', number: 9, cost: 2,
    text: { ar: 'في بداية دور الخصم: 5 ضرر لأقوى وحوشه.', en: "At the start of the opponent's turn: 5 damage to their strongest monster." },
  },
  {
    id: 'trap_regrowth', name: { ar: 'نمو', en: 'Regrowth' }, effect: 'regrowth', timing: 'opponent_turn_start',
    element: 'grass', number: 3, cost: 1,
    text: { ar: 'في بداية دور الخصم: استعد 5 حياة واسحب كارتاً.', en: "At the start of the opponent's turn: restore 5 life and draw a card." },
  },
  {
    id: 'trap_fortify', name: { ar: 'تحصين', en: 'Fortify' }, effect: 'fortify', timing: 'opponent_turn_start',
    element: 'water', number: 6, cost: 2,
    text: { ar: 'في بداية دور الخصم: كل وحوشك تستعيد كامل حياتها.', en: "At the start of the opponent's turn: all your monsters heal to full." },
  },
];

const SPELLS: {
  id: string;
  name: Localized;
  effect: SpellEffect;
  element: PlayableElement;
  number: number;
  cost: number;
  text: Localized;
  needsTarget?: CardDef['needsTarget'];
}[] = [
  { id: 'spell_heal', name: { ar: 'شفاء', en: 'Heal' }, effect: 'heal', element: 'water', number: 1, cost: 2, text: { ar: 'استعد 6 نقاط حياة.', en: 'Restore 6 life.' } },
  { id: 'spell_boost', name: { ar: 'تعزيز', en: 'Empower' }, effect: 'boost', element: 'fire', number: 3, cost: 2, text: { ar: 'أعطِ أحد وحوشك +3 هجوم بشكل دائم.', en: 'Give one of your monsters +3 attack permanently.' }, needsTarget: 'own_monster' },
  { id: 'spell_storm', name: { ar: 'عاصفة', en: 'Storm' }, effect: 'storm', element: 'electric', number: 4, cost: 4, text: { ar: '3 ضرر لكل وحوش الخصم.', en: "3 damage to all the opponent's monsters." } },
  { id: 'spell_surge', name: { ar: 'اندفاع طاقة', en: 'Energy Surge' }, effect: 'surge', element: 'electric', number: 2, cost: 0, text: { ar: 'اكسب 3 طاقة فوراً.', en: 'Gain 3 energy immediately.' } },
  { id: 'spell_search', name: { ar: 'بحث', en: 'Search' }, effect: 'search', element: 'psychic', number: 5, cost: 2, text: { ar: 'اكشف أعلى 5 كروت وخُذ واحداً.', en: 'Reveal the top 5 cards and take one.' } },
  { id: 'spell_swap', name: { ar: 'تبديل', en: 'Bounce' }, effect: 'swap', element: 'psychic', number: 6, cost: 2, text: { ar: 'أعِد وحشاً للخصم إلى يده.', en: "Return one of the opponent's monsters to their hand." }, needsTarget: 'enemy_monster' },
  { id: 'spell_amplify', name: { ar: 'تضخيم', en: 'Amplify' }, effect: 'amplify', element: 'dark', number: 7, cost: 3, text: { ar: 'الهجوم المشترك القادم هذا الدور يُضاعف.', en: 'Your next combo attack this turn is doubled.' } },
  { id: 'spell_revive', name: { ar: 'إحياء', en: 'Revive' }, effect: 'revive', element: 'grass', number: 8, cost: 3, text: { ar: 'استدعِ وحشاً من المهملات مجاناً.', en: 'Summon a monster from the discard pile for free.' }, needsTarget: 'discard_monster' },
  { id: 'spell_purge', name: { ar: 'تطهير', en: 'Purge' }, effect: 'purge', element: 'grass', number: 9, cost: 2, text: { ar: 'دمّر أحد فخاخ الخصم المجهّزة.', en: "Destroy one of the opponent's set traps." }, needsTarget: 'enemy_trap' },

  // ===== الموجة الثانية: 18 تصميماً =====
  { id: 'spell_strike', name: { ar: 'ضربة', en: 'Strike' }, effect: 'strike', element: 'fire', number: 4, cost: 2, text: { ar: '4 ضرر لوحش خصم تختاره.', en: '4 damage to an enemy monster of your choice.' }, needsTarget: 'enemy_monster' },
  { id: 'spell_bolt', name: { ar: 'صاعقة', en: 'Bolt' }, effect: 'bolt', element: 'electric', number: 6, cost: 2, text: { ar: '3 ضرر مباشر لحياة الخصم.', en: "3 damage directly to the opponent's life." } },
  { id: 'spell_drain_life', name: { ar: 'نزف', en: 'Life Drain' }, effect: 'drain_life', element: 'dark', number: 3, cost: 3, text: { ar: '3 ضرر لحياة الخصم، واستعد 3 حياة.', en: "3 damage to the opponent's life, and restore 3 of yours." } },
  { id: 'spell_shield_wall', name: { ar: 'سور', en: 'Shield Wall' }, effect: 'shield_wall', element: 'water', number: 5, cost: 3, text: { ar: 'كل وحوشك تكسب +3 حياة.', en: 'All your monsters gain +3 health.' } },
  { id: 'spell_rally', name: { ar: 'حشد', en: 'Rally' }, effect: 'rally', element: 'fire', number: 7, cost: 3, text: { ar: 'كل وحوشك تكسب +1 هجوم.', en: 'All your monsters gain +1 attack.' } },
  { id: 'spell_recall', name: { ar: 'استرجاع', en: 'Recall' }, effect: 'recall', element: 'psychic', number: 8, cost: 1, text: { ar: 'أعِد وحشاً من المهملات إلى يدك.', en: 'Return a monster from the discard pile to your hand.' }, needsTarget: 'discard_monster' },
  { id: 'spell_foresight', name: { ar: 'بصيرة', en: 'Foresight' }, effect: 'foresight', element: 'psychic', number: 2, cost: 2, text: { ar: 'اسحب كرتين.', en: 'Draw 2 cards.' } },
  { id: 'spell_mana_well', name: { ar: 'نبع', en: 'Mana Well' }, effect: 'mana_well', element: 'electric', number: 0, cost: 1, text: { ar: 'اكسب 2 طاقة الآن و2 في بداية دورك القادم.', en: 'Gain 2 energy now and 2 at the start of your next turn.' } },
  { id: 'spell_cleanse', name: { ar: 'تطهير ذاتي', en: 'Cleanse' }, effect: 'cleanse', element: 'water', number: 9, cost: 1, text: { ar: 'أزل التعطيل عنك واسحب كارتاً.', en: 'Clear any lock on you and draw a card.' } },
  { id: 'spell_overload', name: { ar: 'إفراط', en: 'Overload' }, effect: 'overload', element: 'fire', number: 1, cost: 2, text: { ar: 'وحش تختاره: +5 هجوم و-2 حياة.', en: 'A monster of your choice: +5 attack and -2 health.' }, needsTarget: 'own_monster' },
  { id: 'spell_mirror_image', name: { ar: 'صورة', en: 'Mirror Image' }, effect: 'mirror_image', element: 'psychic', number: 4, cost: 3, text: { ar: 'استدعِ نسخة أخرى من أضعف وحوشك.', en: 'Summon another copy of your weakest monster.' } },
  { id: 'spell_banish', name: { ar: 'نفي', en: 'Banish' }, effect: 'banish', element: 'dark', number: 5, cost: 4, text: { ar: 'دمّر وحش خصم تختاره.', en: 'Destroy an enemy monster of your choice.' }, needsTarget: 'enemy_monster' },
  { id: 'spell_chain_lightning', name: { ar: 'سلسلة برق', en: 'Chain Lightning' }, effect: 'chain_lightning', element: 'electric', number: 8, cost: 3, text: { ar: '2 ضرر لكل وحوش الخصوم و1 لحياة كلٍّ منهم.', en: "2 damage to every opponent's monsters and 1 to each of their life." } },
  { id: 'spell_titan_call', name: { ar: 'نداء الوحش', en: 'Titan Call' }, effect: 'titan_call', element: 'psychic', number: 0, cost: 3, text: { ar: 'ابحث في السطح عن قطعة وحش أعظم وخذها.', en: 'Search the deck for a Titan fragment and take it.' } },
  { id: 'spell_graft', name: { ar: 'تطعيم', en: 'Graft' }, effect: 'graft', element: 'grass', number: 7, cost: 2, text: { ar: 'وحش تختاره يستعيد كامل حياته ويكسب +1 هجوم.', en: 'A monster of your choice heals to full and gains +1 attack.' }, needsTarget: 'own_monster' },
  { id: 'spell_barricade', name: { ar: 'متراس', en: 'Barricade' }, effect: 'barricade', element: 'water', number: 3, cost: 2, text: { ar: 'تكسب حاجزاً يلغي الهجوم القادم عليك.', en: 'Gain a barrier that negates the next attack on you.' } },
  { id: 'spell_reflect', name: { ar: 'عاكس', en: 'Reflect' }, effect: 'reflect', element: 'psychic', number: 6, cost: 2, text: { ar: 'تكسب مرآة ترتدّ بنصف ضرر الهجوم القادم.', en: 'Gain a mirror that reflects half the damage of the next attack.' } },
  { id: 'spell_second_wind', name: { ar: 'نفس ثانٍ', en: 'Second Wind' }, effect: 'second_wind', element: 'fire', number: 9, cost: 3, text: { ar: 'كل وحوشك تفقد الإنهاك فتستطيع الهجوم مجدداً.', en: 'All your monsters lose exhaustion and can attack again.' } },
];

const ACTION_NAMES: Record<string, Localized> = {
  skip: { ar: 'تخطي الدور', en: 'Skip Turn' },
  draw2: { ar: 'اسحب كرتين', en: 'Draw Two' },
  reverse: { ar: 'انعكاس', en: 'Reverse' },
  wild: { ar: 'تغيير العنصر', en: 'Wild' },
  wild4: { ar: 'وحش بري — اسحب 4', en: 'Wild Draw Four' },
};

const ACTION_TEXTS: Record<string, Localized> = {
  skip: { ar: 'يفقد الخصم دوره القادم.', en: 'The opponent loses their next turn.' },
  draw2: {
    ar: 'يسحب الخصم كرتين ويفقد دوره — إلا إذا كدّس كارت سحب مثله.',
    en: 'The opponent draws 2 and loses their turn — unless they stack another draw card.',
  },
  reverse: {
    ar: 'في مواجهة 1 ضد 1: يفقد الخصم دوره وتسحب أنت كارتاً.',
    en: 'In a 1v1 duel: the opponent loses their turn and you draw a card.',
  },
  wild: { ar: 'اختر العنصر الفعّال الجديد.', en: 'Choose the new active element.' },
  wild4: {
    ar: 'اختر العنصر، ويسحب الخصم 4 كروت ويفقد دوره.',
    en: 'Choose the element; the opponent draws 4 and loses their turn.',
  },
};

const FRAGMENTS: { id: string; name: Localized; fragment: string; element: PlayableElement; number: number }[] = [
  { id: 'frag_heart', name: { ar: 'قلب الوحش', en: 'Titan Heart' }, fragment: 'heart', element: 'fire', number: 0 },
  { id: 'frag_fang', name: { ar: 'ناب الوحش', en: 'Titan Fang' }, fragment: 'fang', element: 'dark', number: 0 },
  { id: 'frag_shield', name: { ar: 'درع الوحش', en: 'Titan Shield' }, fragment: 'shield', element: 'water', number: 0 },
  { id: 'frag_crown', name: { ar: 'تاج الوحش', en: 'Titan Crown' }, fragment: 'crown', element: 'psychic', number: 0 },
];

export const TITAN = {
  name: { ar: 'الوحش الأعظم — أومِگا', en: 'The Great Titan — Omega' } as Localized,
  cost: 6,
  fragmentsNeeded: 4,
  text: {
    ar: 'اجمع القطع الأربع ثم استدعِه لتحسم المباراة فوراً.',
    en: 'Collect all four fragments, then summon it to win the match instantly.',
  } as Localized,
};

export const FRAGMENT_NAME: Record<string, Localized> = {
  heart: { ar: 'قلب', en: 'Heart' },
  fang: { ar: 'ناب', en: 'Fang' },
  shield: { ar: 'درع', en: 'Shield' },
  crown: { ar: 'تاج', en: 'Crown' },
};

const FRAGMENT_CARD_TEXT: Localized = {
  ar: 'قطعة من الوحش الأعظم. تُوضع في الخزانة دون شرط مطابقة.',
  en: 'A Titan fragment. Placed in your reliquary with no matching requirement.',
};

function buildCatalog(): CardDef[] {
  const out: CardDef[] = [];

  // ---- الوحوش: 6 عناصر × 5 فصائل × مرحلتين × نسختين = 120 ----
  for (const el of ELEMENTS) {
    for (const row of SPECIES[el]) {
      out.push({
        id: `mon_${el}_${row.species}_1`,
        kind: 'monster',
        name: row.base,
        element: el,
        number: row.n1,
        cost: monsterCost(row.a1, row.h1, row.ab1),
        atk: row.a1,
        hp: row.h1,
        ability: row.ab1,
        stage: 1,
        species: row.species,
        text: monsterText(1, row.ab1),
        copies: 2,
      });
      out.push({
        id: `mon_${el}_${row.species}_2`,
        kind: 'monster',
        name: row.evo,
        element: el,
        number: row.n2,
        cost: monsterCost(row.a2, row.h2, row.ab2),
        atk: row.a2,
        hp: row.h2,
        ability: row.ab2,
        stage: 2,
        species: row.species,
        text: monsterText(2, row.ab2),
        copies: 2,
      });
    }
  }

  // ---- كروت الحركة: 36 ----
  for (const el of ELEMENTS) {
    out.push({
      id: `act_skip_${el}`, kind: 'action', action: 'skip', name: ACTION_NAMES.skip,
      element: el, number: 10, cost: 1, text: ACTION_TEXTS.skip, copies: 2,
    });
    out.push({
      id: `act_draw2_${el}`, kind: 'action', action: 'draw2', name: ACTION_NAMES.draw2,
      element: el, number: 11, cost: 1, text: ACTION_TEXTS.draw2, copies: 2,
    });
  }
  for (const el of ['fire', 'water'] as PlayableElement[]) {
    out.push({
      id: `act_reverse_${el}`, kind: 'action', action: 'reverse', name: ACTION_NAMES.reverse,
      element: el, number: 12, cost: 1, text: ACTION_TEXTS.reverse, copies: 2,
    });
  }
  out.push({
    id: 'act_wild', kind: 'action', action: 'wild', name: ACTION_NAMES.wild,
    element: 'wild', number: null, cost: 1, text: ACTION_TEXTS.wild, copies: 4,
  });
  out.push({
    id: 'act_wild4', kind: 'action', action: 'wild4', name: ACTION_NAMES.wild4,
    element: 'wild', number: null, cost: 2, text: ACTION_TEXTS.wild4, copies: 4,
  });

  // ---- الفخاخ: 54 (27 تصميماً × نسختين) ----
  for (const t of TRAPS) {
    out.push({
      id: t.id, kind: 'trap', name: t.name, element: t.element, number: t.number,
      cost: t.cost, trap: t.effect, timing: t.timing, text: t.text, copies: 2,
    });
  }

  // ---- السحر: 54 (27 تصميماً × نسختين) ----
  for (const s of SPELLS) {
    out.push({
      id: s.id, kind: 'spell', name: s.name, element: s.element, number: s.number,
      cost: s.cost, spell: s.effect, needsTarget: s.needsTarget, text: s.text, copies: 2,
    });
  }

  // ---- قطع الوحش الأعظم: 8 ----
  for (const f of FRAGMENTS) {
    out.push({
      id: f.id, kind: 'fragment', name: f.name, element: f.element, number: f.number,
      cost: 2, fragment: f.fragment, text: FRAGMENT_CARD_TEXT, copies: 2,
    });
  }

  return out;
}

export const CATALOG: CardDef[] = buildCatalog();

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c])
);

/**
 * كارت وهمي يحلّ محلّ ما لا يحقّ للاعب رؤيته (يد الخصم، السطح، الفخاخ المقلوبة).
 * ليس ضمن الكتالوج فلا يؤثّر على عدد الـ200، لكنه معرّف حتى لا تفشل `def()`.
 */
export const HIDDEN_CARD_ID = 'hidden_card';

CARD_BY_ID[HIDDEN_CARD_ID] = {
  id: HIDDEN_CARD_ID,
  kind: 'action',
  name: { ar: 'كارت مخفي', en: 'Hidden card' },
  element: 'wild',
  number: null,
  cost: 0,
  text: { ar: 'كارت لا تراه.', en: 'A card you cannot see.' },
  copies: 0,
};

export function def(id: string): CardDef {
  const d = CARD_BY_ID[id];
  if (!d) throw new Error(`كارت غير معروف: ${id}`);
  return d;
}

export const TOTAL_CARDS = CATALOG.reduce((n, c) => n + c.copies, 0);

export const CATALOG_BREAKDOWN = {
  monster: CATALOG.filter((c) => c.kind === 'monster').reduce((n, c) => n + c.copies, 0),
  action: CATALOG.filter((c) => c.kind === 'action').reduce((n, c) => n + c.copies, 0),
  trap: CATALOG.filter((c) => c.kind === 'trap').reduce((n, c) => n + c.copies, 0),
  spell: CATALOG.filter((c) => c.kind === 'spell').reduce((n, c) => n + c.copies, 0),
  fragment: CATALOG.filter((c) => c.kind === 'fragment').reduce((n, c) => n + c.copies, 0),
};
