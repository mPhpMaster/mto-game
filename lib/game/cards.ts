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

const SPECIES: Record<PlayableElement, SpeciesRow[]> = {
  fire: [
    { species: 'lahibo', base: { ar: 'لهيبو', en: 'Blazlet' }, evo: { ar: 'لهيبيون', en: 'Blazlion' }, n1: 2, a1: 3, h1: 5, ab1: 'none', n2: 7, a2: 6, h2: 9, ab2: 'rush' },
    { species: 'jamra', base: { ar: 'جمرة', en: 'Emberin' }, evo: { ar: 'جمرالنار', en: 'Emberfang' }, n1: 1, a1: 2, h1: 4, ab1: 'venom', n2: 6, a2: 5, h2: 8, ab2: 'pierce' },
    { species: 'nariks', base: { ar: 'ناريكس', en: 'Narix' }, evo: { ar: 'ناريكس الأعظم', en: 'Narix Prime' }, n1: 5, a1: 4, h1: 4, ab1: 'rush', n2: 9, a2: 7, h2: 8, ab2: 'pierce' },
    { species: 'smoki', base: { ar: 'سموكي', en: 'Smokel' }, evo: { ar: 'سموكاتور', en: 'Smokator' }, n1: 3, a1: 3, h1: 3, ab1: 'scout', n2: 8, a2: 5, h2: 7, ab2: 'drain' },
    { species: 'volkani', base: { ar: 'فولكاني', en: 'Volcani' }, evo: { ar: 'فولكانوس', en: 'Volcanos' }, n1: 4, a1: 5, h1: 6, ab1: 'none', n2: 0, a2: 8, h2: 10, ab2: 'guard' },
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
    { species: 'thandiro', base: { ar: 'ثانديرو', en: 'Thandiro' }, evo: { ar: 'ثانديروس', en: 'Thandiros' }, n1: 4, a1: 3, h1: 6, ab1: 'venom', n2: 9, a2: 6, h2: 10, ab2: 'rush' },
  ],
  psychic: [
    { species: 'holmi', base: { ar: 'حلمي', en: 'Dreamlet' }, evo: { ar: 'حلماتور', en: 'Dreamator' }, n1: 1, a1: 2, h1: 5, ab1: 'scout', n2: 6, a2: 5, h2: 9, ab2: 'scout' },
    { species: 'thehno', base: { ar: 'ذهنو', en: 'Mindo' }, evo: { ar: 'ذهنوس', en: 'Mindos' }, n1: 2, a1: 3, h1: 4, ab1: 'link', n2: 7, a2: 6, h2: 7, ab2: 'link' },
    { species: 'taifa', base: { ar: 'طيفا', en: 'Spectra' }, evo: { ar: 'طيفانا', en: 'Spectrana' }, n1: 3, a1: 4, h1: 3, ab1: 'pierce', n2: 8, a2: 7, h2: 6, ab2: 'pierce' },
    { species: 'orakl', base: { ar: 'أوراكل', en: 'Oracle' }, evo: { ar: 'أوراكلوس', en: 'Oraclos' }, n1: 0, a1: 2, h1: 6, ab1: 'charge', n2: 5, a2: 4, h2: 11, ab2: 'charge' },
    { species: 'nirfa', base: { ar: 'نيرفا', en: 'Nerva' }, evo: { ar: 'نيرفانا', en: 'Nervana' }, n1: 4, a1: 5, h1: 5, ab1: 'none', n2: 9, a2: 8, h2: 9, ab2: 'drain' },
  ],
  dark: [
    { species: 'thilli', base: { ar: 'ظلّي', en: 'Shadel' }, evo: { ar: 'ظلاتور', en: 'Shadator' }, n1: 1, a1: 3, h1: 4, ab1: 'venom', n2: 6, a2: 6, h2: 8, ab2: 'venom' },
    { species: 'shadow', base: { ar: 'شادو', en: 'Shadow' }, evo: { ar: 'شادوس', en: 'Shadowos' }, n1: 2, a1: 4, h1: 3, ab1: 'rush', n2: 7, a2: 7, h2: 6, ab2: 'rush' },
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

  // ---- الفخاخ: 18 ----
  for (const t of TRAPS) {
    out.push({
      id: t.id, kind: 'trap', name: t.name, element: t.element, number: t.number,
      cost: t.cost, trap: t.effect, timing: t.timing, text: t.text, copies: 2,
    });
  }

  // ---- السحر: 18 ----
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
