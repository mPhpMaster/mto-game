// ===== أنواع اللعبة الأساسية =====

import type { Localized } from '@/lib/i18n/locale';

export type Element =
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'psychic'
  | 'dark'
  | 'wild';

export type PlayableElement = Exclude<Element, 'wild'>;

export type CardKind = 'monster' | 'action' | 'trap' | 'spell' | 'fragment';

export type ActionKind = 'skip' | 'draw2' | 'reverse' | 'wild' | 'wild4';

export type Ability =
  | 'none'
  | 'rush'
  | 'charge'
  | 'guard'
  | 'pierce'
  | 'drain'
  | 'link'
  | 'scout'
  | 'venom';

export type TrapEffect =
  | 'ambush'
  | 'energy_steal'
  | 'barrier'
  | 'blast'
  | 'net'
  | 'curse'
  | 'relic_break'
  | 'counter_surge'
  | 'mirror';

export type SpellEffect =
  | 'heal'
  | 'boost'
  | 'storm'
  | 'surge'
  | 'search'
  | 'swap'
  | 'amplify'
  | 'revive'
  | 'purge';

export type TrapTiming = 'opponent_turn_start' | 'opponent_attack' | 'opponent_summon';

/** تعريف الكارت في الكتالوج (نموذج ثابت لا يتغير أثناء اللعب) */
export interface CardDef {
  id: string;
  kind: CardKind;
  name: Localized;
  element: Element;
  /** رقم المطابقة على طريقة الأونو، و null للكروت البرية */
  number: number | null;
  cost: number;
  text: Localized;
  copies: number;
  /** وحوش */
  atk?: number;
  hp?: number;
  ability?: Ability;
  stage?: 1 | 2;
  species?: string;
  /** كروت الحركة */
  action?: ActionKind;
  /** الفخاخ */
  trap?: TrapEffect;
  timing?: TrapTiming;
  /** السحر */
  spell?: SpellEffect;
  /** يحتاج هدفاً عند اللعب */
  needsTarget?: 'own_monster' | 'enemy_monster' | 'discard_monster' | 'enemy_trap';
  /** قطع الوحش الكبير */
  fragment?: string;
}

/** نسخة فعلية من كارت داخل مباراة */
export interface CardInstance {
  uid: string;
  defId: string;
}

/** وحش على الساحة */
export interface FieldMonster {
  uid: string;
  defId: string;
  atk: number;
  hp: number;
  maxHp: number;
  /** مُنهك: هاجم بالفعل هذا الدور */
  exhausted: boolean;
  /** حديث الاستدعاء: لا يهاجم إلا إذا كان لديه «اندفاع» */
  sick: boolean;
}

/** فخ مُجهّز على الساحة */
export interface SetTrap {
  uid: string;
  defId: string;
}

/** خانة اللاعب في المباراة — 0 و 1 في 1 ضد 1، و2 تُضاف في 1 ضد 1 ضد 1 */
export type Seat = number;

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  /** أُقصي (حياته وصلت صفراً) — يبقى على اللوحة لكن لا يلعب */
  eliminated: boolean;
  hp: number;
  /** سقف الشفاء — يساوي حياة البداية، وتقلّ للخصم في المستويات السهلة */
  maxHp: number;
  energy: number;
  energyCap: number;
  /** أقصى سقف طاقة يبلغه هذا اللاعب — يقلّ للخصم في المستويات السهلة */
  maxEnergyCap: number;
  /** طاقة إضافية تُضاف في بداية الدور القادم (من الفخاخ) */
  bonusEnergy: number;
  hand: CardInstance[];
  field: FieldMonster[];
  traps: SetTrap[];
  /** قطع الوحش الكبير المجمّعة */
  fragments: string[];
  skipNext: boolean;
  /** مقيّد بالشبكة: لا يستطيع الهجوم هذا الدور */
  attackLocked: boolean;
  /** استُخدم الهجوم المشترك هذا الدور */
  comboUsed: boolean;
  /** الهجوم المشترك القادم مضاعف (من كارت التضخيم) */
  amplified: boolean;
  /** حاجز نشط يلغي الهجوم القادم */
  barrier: boolean;
  /** مرآة نشطة ترتد نصف ضرر الهجوم القادم */
  mirror: boolean;
  /** استُخدم سحب الإنقاذ هذا الدور (عند عدم وجود كارت قابل للعب) */
  extraDrawUsed: boolean;
}

export interface FlowTop {
  element: PlayableElement;
  number: number | null;
  defId: string | null;
}

/** قيم تُحقن في نصّ الرسالة؛ الأسماء المعروفة (card/element/fragment/reason) تُترجَم أيضاً */
export type LogParams = Record<string, string | number>;

/**
 * الرسالة تُخزَّن كمفتاح ومعاملات لا كنصّ جاهز، فتُترجَم وقت العرض
 * وتتبع لغة اللاعب حتى لو غيّرها في منتصف المباراة.
 */
export interface LogEntry {
  turn: number;
  side: Seat | null;
  kind: 'play' | 'attack' | 'trap' | 'system' | 'win';
  key: string;
  params?: LogParams;
}

export interface GameOutcome {
  key: string;
  params?: LogParams;
}

export type Phase = 'main' | 'respond' | 'ended';

export interface GameState {
  seed: number;
  rng: number;
  difficulty: import('./difficulty').Difficulty;
  turn: number;
  current: Seat;
  /** اتجاه الدور: 1 مع عقارب الخانات، -1 عكسها (من كارت الانعكاس في ثلاثي) */
  turnDir: 1 | -1;
  phase: Phase;
  winner: Seat | null;
  winReason: GameOutcome | null;
  deck: CardInstance[];
  discard: CardInstance[];
  flow: FlowTop;
  /** عقوبة السحب المتراكمة (draw2 / wild4) */
  pendingDraw: number;
  players: PlayerState[];
  log: LogEntry[];
  /** كروت مكشوفة مؤقتاً للاعب (كارت البحث) */
  reveal: { side: Seat; cards: CardInstance[] } | null;
}

export type GameAction =
  | { type: 'PLAY'; uid: string; chosenElement?: PlayableElement; targetUid?: string }
  | { type: 'DRAW' }
  | { type: 'ACCEPT_DRAW' }
  | {
      type: 'ATTACK';
      attackers: string[];
      target: string | 'face';
      /** لازم للهجوم المباشر حين يوجد أكثر من خصم */
      targetSeat?: Seat;
    }
  | { type: 'SUMMON_TITAN' }
  | { type: 'PICK_REVEAL'; uid: string }
  | { type: 'END_TURN' };
