import { def, ELEMENTS, ELEMENT_NAME, TITAN } from './cards';
import {
  GEAR,
  GEAR_BY_ID,
  WEATHER,
  WEATHER_BY_ID,
  WEATHER_DISPEL_COST,
  type GearId,
  type WeatherId,
} from './loadout';
import {
  ACID_RAIN_TICK,
  AIR_DODGE_CHANCE,
  DODGE_CHANCE,
  FOG_MISS_CHANCE,
  hasGear,
  passiveOf,
  piercesOf,
  poisonTick,
  reductionOf,
  strikeOf,
  surgeCut,
} from './loadoutEffects';
import { CATALOG, DECK_RECIPE } from './cards';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from './difficulty';
import { curveShuffle, makeSeed, nextRandom, randomInt, shuffle } from './rng';
import type {
  CardDef,
  CardInstance,
  FieldMonster,
  GameAction,
  GameOutcome,
  GameState,
  LogEntry,
  LogParams,
  PlayableElement,
  PlayerState,
  Seat,
} from './types';

export const RULES = {
  START_HP: 30,
  START_HAND: 5,
  START_ENERGY_CAP: 2,
  /** تعويض اللاعب الثاني عن ميزة البدء: كارت إضافي، وطاقة إضافية في دوره الأول فقط */
  SECOND_PLAYER_BONUS_CARDS: 1,
  SECOND_PLAYER_BONUS_ENERGY: 1,
  MAX_ENERGY_CAP: 10,
  /**
   * تشتّت منحنى السطح: الرخيص أعلى والغالي أسفل.
   * صفر = ترتيب صارم بالتكلفة (متوقّع ومملّ)، وكبير = عشوائي بالكامل
   * (فتبدأ المباراة بكروت لا تكفيها طاقتك). القيمة مضبوطة بـcheck:curve.
   */
  DECK_CURVE_SPREAD: 18,
  /**
   * حسم تكلفة الوحوش في منحنى السطح. الوحوش جوهر اللعب (44% من السطح) لكن
   * أرخصها بتكلفة 2، بينما هناك 66 بطاقة حركة/فخ/سحر بتكلفة 0–1. بلا هذا الحسم
   * يغوص كل وحش تحت تلك الرخيصة فتمتلئ اليد الافتتاحية بالأفخاخ والحركات.
   * الحسم يجعل وحشاً بتكلفة 2 ينافس بطاقة بتكلفة 1 فتتداخل الوحوش مع الرخيص.
   * رُفع من 1.0 إلى 2.0 مع توسعة السطح إلى 272: عدد البطاقات الرخيصة غير
   * الوحشية ارتفع من 42 إلى 66، فازداد الضغط الذي وُجد هذا الحسم لمقاومته.
   * مضبوطة بـcheck:opening وcheck:curve.
   */
  MONSTER_CURVE_BONUS: 2.0,
  /** أقل عدد وحوش مضمون في اليد الافتتاحية — شبكة أمان لليد التعيسة */
  OPENING_MONSTER_FLOOR: 2,
  /** سقف وحوش الساحة — يكفي لدمج أكبر دون ازدحام اللوحة */
  MAX_FIELD: 6,
  /**
   * رُفع من 3 إلى 4 مع تضاعف عدد الفخاخ في السطح: بسقف 3 تتحوّل الفخاخ
   * الزائدة في اليد إلى ورق ميت لا يُلعب.
   */
  MAX_TRAPS: 4,
  /** فارق الوحوش الذي تبدأ عنده حماية الاستدعاء، والذي تبدأ عنده النجدة */
  PROTECT_DEFICIT: 2,
  REINFORCE_DEFICIT: 4,
  /** أقصى عدد لاعبين في مباراة واحدة (1 ضد 1 ضد 1) */
  MAX_PLAYERS: 3,
  FATIGUE_DAMAGE: 2,
  COMBO_BONUS_PER_EXTRA: 2,
};

// ===================== أدوات مساعدة =====================

/**
 * عدّاد لنسخ الكروت التي تُصنَع **أثناء اللعب** لا عند التوزيع.
 *
 * لا يصلح لبناء السطح: العدّاد يعيش في الوحدة، فيتراكم في الخادم عبر
 * الطلبات ويبدأ من الصفر في المتصفّح — فيرسم الخادم `data-uid="c590"`
 * ويرسم العميل `data-uid="c46"` للكارت نفسه، وينهار الترطيب. البادئة هنا
 * تختلف عن بادئة السطح فلا تتصادم المجموعتان.
 */
let uidCounter = 0;
function makeUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

/**
 * يرمي الكارت في مهملات **صاحبه** لا مهملات من أسقطه — فوحشٌ قتلتَه يعود
 * إلى ديك خصمك لا إلى ديكك. والاحتياط لكارتٍ بلا صاحب: الوحوش على الساحة
 * تُنسب لصاحب الساحة، وهي الحالة الوحيدة التي يغيب فيها الصاحب.
 */
function toDiscard(s: GameState, card: CardInstance, fallback: Seat): void {
  const owner = card.owner ?? fallback;
  s.players[owner].discard.push({ ...card, owner });
}

function log(
  s: GameState,
  kind: LogEntry['kind'],
  side: Seat | null,
  key: string,
  params?: LogParams
) {
  s.log.push({ turn: s.turn, side, kind, key, params });
  s.logSeq += 1;
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

export function livingSeats(s: GameState): Seat[] {
  return s.players.map((_, i) => i).filter((i) => !s.players[i].eliminated && s.players[i].hp > 0);
}

export function opponentsOf(s: GameState, seat: Seat): Seat[] {
  return livingSeats(s).filter((i) => i !== seat);
}

/** الخانة التالية في اتجاه الدور، بما فيها المُقصَون — للاجتياز فقط */
function nextSeatIndex(s: GameState, from: Seat, dir: 1 | -1 = s.turnDir): Seat {
  const n = s.players.length;
  return (from + dir + n) % n;
}

/** أقرب لاعب حيّ بعد `from` في اتجاه الدور (أو المعطى) */
export function nextLiving(s: GameState, from: Seat, dir: 1 | -1 = s.turnDir): Seat {
  const n = s.players.length;
  let i = from;
  for (let step = 0; step < n; step++) {
    i = nextSeatIndex(s, i, dir);
    if (!s.players[i].eliminated && s.players[i].hp > 0) return i;
  }
  return from;
}

/**
 * الخصم «الافتراضي»: في 1 ضد 1 هو الآخر، وفي الثلاثي اللاعب التالي في الدور.
 * يُستخدم لكروت التخطي/السحب التي تصيب «التالي» على طريقة الأونو.
 */
export function opponentOf(s: GameState, i: Seat): Seat {
  return nextLiving(s, i);
}

export function findMonsterOwner(s: GameState, uid: string, among?: Seat[]): Seat | null {
  const seats = among ?? s.players.map((_, i) => i);
  for (const i of seats) {
    if (s.players[i].field.some((m) => m.uid === uid)) return i;
  }
  return null;
}

export function findTrapOwner(s: GameState, uid: string, among?: Seat[]): Seat | null {
  const seats = among ?? s.players.map((_, i) => i);
  for (const i of seats) {
    if (s.players[i].traps.some((t) => t.uid === uid)) return i;
  }
  return null;
}

/** الخصوم الأحياء بترتيب الدور بدءاً من التالي بعد `from` */
function opponentsInTurnOrder(s: GameState, from: Seat): Seat[] {
  const ordered: Seat[] = [];
  let i = from;
  for (let step = 0; step < s.players.length - 1; step++) {
    i = nextSeatIndex(s, i);
    if (!s.players[i].eliminated && s.players[i].hp > 0 && i !== from) ordered.push(i);
  }
  return ordered;
}

/**
 * فحص انتهاء المباراة عبر دالة، لأن الدوال المساعدة قد تُنهي المباراة
 * أثناء تنفيذها فلا يصحّ الاعتماد على تضييق نوع `phase` في مكان النداء.
 */
function isEnded(st: GameState): boolean {
  return st.phase === 'ended';
}

// ===================== إنشاء المباراة =====================

/**
 * وزن الكارت في منحنى السطح: تكلفته، مع حسم للوحوش حتى لا تغوص تحت كل
 * بطاقة رخيصة فتخلو منها اليد الافتتاحية (انظر MONSTER_CURVE_BONUS).
 */
function curveWeightOf(c: CardInstance): number {
  const d = def(c.defId);
  return d.cost - (d.kind === 'monster' ? RULES.MONSTER_CURVE_BONUS : 0);
}

/**
 * وصفة المباراة: أي التصاميم تدخل ديك الخمسين. تُختار بالبذرة فتختلف من
 * مباراة إلى أخرى — ولولا ذلك لصارت كل مباراة بالخمسين نفسها بعد أن كان
 * الجرد 272 — وهي **واحدة للاعبَين** فلا يملك أحدهما كروتاً يحرمها الآخر.
 */
function sampleDeck(seed: number): [defIds: string[], nextState: number] {
  let rng = seed;
  const picked: string[] = [];
  for (const kind of ['monster', 'spell', 'trap', 'action'] as const) {
    const [designs, ns] = shuffle(
      CATALOG.filter((d) => d.kind === kind),
      rng
    );
    rng = ns;
    for (const d of designs.slice(0, DECK_RECIPE[kind])) picked.push(d.id, d.id);
  }
  /*
    قطعةٌ من كل نوع لا بالنسبة: الوحش الكبير يحتاج أربع قطع مختلفة، وفي
    الكتالوج ثماني قطع من 272 — أي أقلّ من نصف قطعة في ديكٍ من خمسين لو
    أُخذت بالنسبة، فيصير شرط الفوز مستحيلاً بالبناء لا بالمهارة.
  */
  for (const d of CATALOG.filter((c) => c.kind === 'fragment')) picked.push(d.id);
  return [picked, rng];
}

/**
 * نسخة اللاعب من الوصفة. المعرّف يحمل الخانة (`p0c17`) فلا يتصادم مع نسخة
 * خصمه من التصميم نفسه، ويُشتقّ من الترتيب فتتطابق مباراتان ببذرة واحدة —
 * وهذا شرطُ أن يرسم الخادم والمتصفّح الشجرة نفسها.
 */
function buildDeckFor(side: Seat, defIds: string[]): CardInstance[] {
  return defIds.map((defId, i) => ({ uid: `p${side}c${i}`, defId, owner: side }));
}

/**
 * شبكة أمان لليد الافتتاحية: تضمن حداً أدنى من الوحوش. المنحنى يحسّن المتوسط
 * لكن يبقى ذيلٌ تعيس (يدٌ بلا وحش) نادر لكنه محبِط. هنا نبدّل أرخص وحش في
 * السطح بأول بطاقة غير وحش في اليد، فلا يتغيّر مجموع الـ200 ولا تتكرّر بطاقة،
 * والوحش المسحوب هو الأرخص (السطح مرتّب بالمنحنى) فيبقى ميسور اللعب مبكّراً.
 */
function ensureOpeningMonsters(s: GameState, side: Seat, floor: number): void {
  const deck = s.players[side].deck;
  const hand = s.players[side].hand;
  const isMonster = (c: CardInstance) => def(c.defId).kind === 'monster';
  let have = hand.filter(isMonster).length;
  while (have < floor) {
    const deckMonsterIdx = deck.findIndex(isMonster);
    const handSwapIdx = hand.findIndex((c) => !isMonster(c));
    // لا وحوش متبقّية في الديك أو اليد كلها وحوش أصلاً — لا شيء نبدّله
    if (deckMonsterIdx < 0 || handSwapIdx < 0) break;
    const monster = deck.splice(deckMonsterIdx, 1)[0];
    // البطاقة المُخرَجة تأخذ مكان الوحش فيبقى الديك على ترتيب المنحنى
    deck.splice(deckMonsterIdx, 0, hand[handSwapIdx]);
    hand[handSwapIdx] = monster;
    have++;
  }
}

function newPlayer(id: string, name: string, isAI: boolean): PlayerState {
  return {
    id,
    name,
    isAI,
    eliminated: false,
    hp: RULES.START_HP,
    maxHp: RULES.START_HP,
    energy: 0,
    energyCap: RULES.START_ENERGY_CAP - 1,
    maxEnergyCap: RULES.MAX_ENERGY_CAP,
    bonusEnergy: 0,
    deck: [],
    discard: [],
    hand: [],
    field: [],
    traps: [],
    fragments: [],
    skipNext: false,
    attackLocked: false,
    comboUsed: false,
    amplified: false,
    barrier: false,
    mirror: false,
    extraDrawUsed: false,
    gearStock: Object.fromEntries(GEAR.map((g) => [g.id, g.stock])) as Record<GearId, number>,
    weatherStock: Object.fromEntries(WEATHER.map((w) => [w.id, w.stock])) as Record<
      WeatherId,
      number
    >,
  };
}

/**
 * توزيع مُعدّ مسبقاً — يُستخدم في وضع التعليم ليكون الدرس ثابتاً في كل مرة.
 * كل القيم معرّفات كروت من الكتالوج، وتُسحب من السطح نفسه فيبقى المجموع 200.
 */
export interface GameScript {
  hands?: [string[], string[]];
  fields?: [string[], string[]];
  /** الكارت الذي يبدأ فوق طابور التدفق */
  flow?: string;
  /** سقف الطاقة في الدور الأول لكل لاعب */
  energyCap?: [number, number];
}

export function createGame(opts?: {
  seed?: number;
  playerName?: string;
  opponentName?: string;
  opponentIsAI?: boolean;
  /** 2 = 1 ضد 1 (الافتراضي)، 3 = 1 ضد 1 ضد 1 */
  playerCount?: number;
  /** أسماء ومَن الآلي — إن وُجدت تتجاوز playerName/opponentName */
  roster?: { name: string; isAI: boolean }[];
  script?: GameScript;
  difficulty?: Difficulty;
  /** من يبدأ: خانة، أو قرعة عشوائية (الوضع الافتراضي) */
  firstPlayer?: Seat | 'random';
  /** لضبط منحنى السطح في أدوات القياس فقط */
  curveSpread?: number;
  /** لتجربة دوال وزن مختلفة في أدوات القياس فقط */
  curveWeight?: (c: CardInstance) => number;
}): GameState {
  const seed = opts?.seed ?? makeSeed();
  const [recipe, rngAfterSample] = sampleDeck(seed);
  let rngCursor = rngAfterSample;
  const difficulty = opts?.difficulty ?? DEFAULT_DIFFICULTY;
  const level = DIFFICULTIES[difficulty];

  const roster =
    opts?.roster && opts.roster.length >= 2
      ? opts.roster.slice(0, RULES.MAX_PLAYERS)
      : [
          { name: opts?.playerName ?? '@you', isAI: false },
          { name: opts?.opponentName ?? '@opponent', isAI: opts?.opponentIsAI ?? true },
          ...(Math.min(Math.max(opts?.playerCount ?? 2, 2), RULES.MAX_PLAYERS) >= 3
            ? [{ name: '@ai2', isAI: true }]
            : []),
        ];

  /*
    ديكان متطابقان في المحتوى مختلفان في الترتيب: لو خُلط الاثنان من حالة
    الأرقام نفسها لسحب اللاعبان الكارت نفسه في الدور نفسه، فصارت كل مباراة
    مرآةً. ولهذا تُمرَّر حالة المولّد من خلطةٍ إلى التي تليها.
    والديك مرتَّب بمنحنى تكلفة لا خلطاً أعمى، فتوافق الكروتُ الطاقةَ المتصاعدة.
  */
  const decks = roster.map((_, i) => {
    const [d, ns] = curveShuffle(
      buildDeckFor(i as Seat, recipe),
      opts?.curveWeight ?? curveWeightOf,
      opts?.curveSpread ?? RULES.DECK_CURVE_SPREAD,
      rngCursor
    );
    rngCursor = ns;
    return d;
  });

  const s: GameState = {
    seed,
    rng: rngCursor,
    difficulty,
    turn: 0,
    current: 0,
    turnDir: 1,
    clockSeat: null,
    clockEpoch: 0,
    phase: 'main',
    winner: null,
    winReason: null,
    flowPile: [],
    flow: { element: 'fire', number: null, defId: null },
    pendingDraw: 0,
    players: roster.map((p, i) => {
      const ps = newPlayer(`p${i}`, p.name, p.isAI);
      ps.deck = decks[i];
      return ps;
    }),
    log: [],
    logSeq: 0,
    reveal: null,
    weather: null,
  };

  // مستوى الصعوبة يضبط الخصوم الآليين وحدهم — اللاعب البشري لا يُمَسّ
  for (const p of s.players) {
    if (!p.isAI) continue;
    p.hp = level.aiHp;
    p.maxHp = level.aiHp;
    p.maxEnergyCap = level.aiMaxEnergyCap;
  }

  const n = s.players.length;

  // قرعة البداية — الافتراضي عشوائي حتى لا يبدأ اللاعب نفسه كل مرة
  if (
    typeof opts?.firstPlayer === 'number' &&
    opts.firstPlayer >= 0 &&
    opts.firstPlayer < n
  ) {
    s.current = opts.firstPlayer;
  } else if (opts?.script) {
    // توزيع مُعدّ مسبقاً يعني درساً ثابتاً، فلا قرعة فيه
    s.current = 0;
  } else {
    const [coin, rng] = randomInt(s.rng, n);
    s.rng = rng;
    s.current = coin;
  }
  const first = s.current;
  const dealOrder: Seat[] = [];
  for (let k = 0; k < n; k++) dealOrder.push((first + k) % n);
  const later = dealOrder.slice(1);

  if (opts?.script) {
    applyScript(s, opts.script);
  } else {
    // توزيع البداية: 5 كروت لكل لاعب، بدءاً بالبادئ
    for (let i = 0; i < RULES.START_HAND; i++) {
      for (const p of dealOrder) {
        drawCards(s, p, 1, true);
      }
    }
    // تعويض من لا يبدأ: كارت إضافي وطاقة لمرة واحدة في دوره الأول
    for (const p of later) {
      drawCards(s, p, RULES.SECOND_PLAYER_BONUS_CARDS, true);
      s.players[p].bonusEnergy += RULES.SECOND_PLAYER_BONUS_ENERGY;
    }

    // ضمان حدٍّ أدنى من الوحوش لكل لاعب — عدل ومتّسق
    for (const p of dealOrder) {
      ensureOpeningMonsters(s, p, RULES.OPENING_MONSTER_FLOOR);
    }

    /*
      كارت البداية على طابور التدفق: أول كارت غير بري وغير قطعة. يُؤخذ من
      ديك الموزّع لا من العدم، ويحمل اسمه فيعود إليه عند إعادة الخلط —
      فلا يُخلق كارت ولا يُفقد، ويبقى جرد كلٍّ منهما خمسين.
    */
    const dealerDeck = s.players[dealOrder[0]].deck;
    let starter: CardInstance | undefined;
    const skipped: CardInstance[] = [];
    while (dealerDeck.length) {
      const c = dealerDeck.shift()!;
      const d = def(c.defId);
      if (d.element !== 'wild' && d.kind !== 'fragment' && d.number !== null && d.number < 10) {
        starter = c;
        break;
      }
      skipped.push(c);
    }
    dealerDeck.push(...skipped);
    if (starter) {
      const d = def(starter.defId);
      s.flow = { element: d.element as PlayableElement, number: d.number, defId: d.id };
      s.flowPile.push(starter);
    }
  }

  log(s, 'system', null, 'match_start', { deck: s.players[0].deck.length });
  if (n > 2) {
    log(s, 'system', null, 'coin_toss_ffa', {
      first: s.players[dealOrder[0]].name,
      second: s.players[dealOrder[1]].name,
      third: s.players[dealOrder[2]].name,
    });
  } else {
    log(s, 'system', null, 'coin_toss', {
      first: s.players[first].name,
      second: s.players[later[0]].name,
    });
  }
  beginTurn(s);
  return s;
}

/** يوزّع الكروت المطلوبة على أصحابها، فلا يخرج كارتٌ من جرد صاحبه */
function applyScript(s: GameState, script: GameScript) {
  let minted = 0;
  /*
    يُؤخذ الكارت من ديك صاحبه إن كان فيه. وديك الخمسين عيّنةٌ من الكتالوج،
    فقد يطلب درسٌ كارتاً لم تختره الوصفة — وحينها يُسكّ بمعرّف مشتقّ من
    ترتيب السَّكّ لا من عدّاد عالميّ، فيبقى الترطيب حتمياً. ومعرّفٌ مجهول
    يبقى خطأً برمجياً يرميه `def`.
  */
  const take = (side: Seat, defId: string): CardInstance => {
    const deck = s.players[side].deck;
    const i = deck.findIndex((c) => c.defId === defId);
    if (i >= 0) return deck.splice(i, 1)[0];
    def(defId);
    return { uid: `p${side}s${minted++}`, defId, owner: side };
  };

  for (const side of [0, 1] as const) {
    for (const id of script.hands?.[side] ?? []) {
      s.players[side].hand.push(take(side, id));
    }
    for (const id of script.fields?.[side] ?? []) {
      const inst = take(side, id);
      const d = def(inst.defId);
      s.players[side].field.push({
        uid: inst.uid,
        defId: d.id,
        atk: d.atk!,
        hp: d.hp!,
        maxHp: d.hp!,
        exhausted: false,
        sick: false,
      });
    }
    if (script.energyCap) {
      // beginTurn سيضيف +1، لذا نخزّن القيمة ناقص واحد
      s.players[side].energyCap = Math.max(0, script.energyCap[side] - 1);
    }
  }

  if (script.flow) {
    // كارت التدفق من ديك اللاعب الأول: يعود إليه كما يعود كارت البداية
    const inst = take(0, script.flow);
    const d = def(inst.defId);
    s.flow = { element: d.element as PlayableElement, number: d.number, defId: d.id };
    s.flowPile.push(inst);
  }
}

// ===================== السحب =====================

/** كروت اللاعب القابلة للعودة إلى ديكه — مهملاته وما لعبه في الطابور */
function recyclable(s: GameState, side: Seat): CardInstance[] {
  // الكارت المكشوف في أعلى الطابور يبقى: عليه تقع المطابقة الآن
  const top = s.flowPile.length ? s.flowPile[s.flowPile.length - 1] : null;
  const mine = s.flowPile.filter((c) => c.owner === side && c !== top);
  return [...s.players[side].discard, ...mine];
}

function refillDeck(s: GameState, side: Seat): boolean {
  const p = s.players[side];
  if (p.deck.length > 0) return true;
  const pool = recyclable(s, side);
  if (pool.length === 0) return false;
  const mine = new Set(pool);
  s.flowPile = s.flowPile.filter((c) => !mine.has(c));
  const [shuffled, rng] = shuffle(pool, s.rng);
  s.rng = rng;
  p.deck = shuffled;
  p.discard = [];
  log(s, 'system', side, 'deck_reshuffled', { player: p.name });
  return true;
}

function drawCards(s: GameState, side: Seat, n: number, silent = false): number {
  const p = s.players[side];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!refillDeck(s, side)) {
      // إنهاك: لا كروت متبقية إطلاقاً. خمسون كارتاً تنفد، و272 لم تكن تنفد
      p.hp -= RULES.FATIGUE_DAMAGE;
      log(s, 'system', side, 'fatigue', { player: p.name, damage: RULES.FATIGUE_DAMAGE });
      checkDeath(s);
      continue;
    }
    p.hand.push(p.deck.shift()!);
    drawn++;
  }
  if (!silent && drawn > 0) log(s, 'system', side, 'drew', { player: p.name, n: drawn });
  return drawn;
}

// ===================== قواعد المطابقة =====================

/** هل يتجاوز نوع الكارت شرط المطابقة؟ (الفخاخ والقطع تُوضع دون مطابقة) */
export function bypassesFlow(d: CardDef): boolean {
  return d.kind === 'trap' || d.kind === 'fragment';
}

/** مطابقة على طريقة الأونو: نفس العنصر أو نفس الرقم أو كارت بري */
export function matchesFlow(d: CardDef, flow: GameState['flow']): boolean {
  if (bypassesFlow(d)) return true;
  if (d.element === 'wild') return true;
  if (d.element === flow.element) return true;
  if (d.number !== null && flow.number !== null && d.number === flow.number) return true;
  return false;
}

/**
 * «مطابقة تامّة»: نفس العنصر **ونفس الرقم** معاً. وسمٌ للعرض فقط — لا مكافأة
 * عليها في هذه النسخة عمداً، حتى يُختبر التوازن قبل أن تُعطى أثراً.
 * البري والفخاخ والقطع لا تُعدّ: هي تتخطّى المطابقة لا تحقّقها.
 */
export function isPerfectMatch(d: CardDef, flow: GameState['flow']): boolean {
  if (bypassesFlow(d) || d.element === 'wild') return false;
  return (
    d.element === flow.element && d.number !== null && flow.number !== null && d.number === flow.number
  );
}

export interface Playability {
  ok: boolean;
  reason?: string;
}

/**
 * `ignoreTurn` يجيب سؤال «هل كنتُ ألعبه لو كان دوري؟» — تستعمله الواجهة
 * لترتيب اليد ترتيباً ثابتاً لا يتبدّل كلّما انتقل الدور.
 */
export function canPlayCard(
  s: GameState,
  side: Seat,
  uid: string,
  ignoreTurn = false
): Playability {
  if (s.phase === 'ended') return { ok: false, reason: 'ended' };
  if (!ignoreTurn && s.current !== side) return { ok: false, reason: 'not_your_turn' };
  const p = s.players[side];
  const inst = p.hand.find((c) => c.uid === uid);
  if (!inst) return { ok: false, reason: 'not_in_hand' };
  const d = def(inst.defId);

  if (s.phase === 'respond') {
    // أثناء الرد على عقوبة السحب لا يجوز إلا تكديس كارت سحب مطابق
    const isDraw = d.kind === 'action' && (d.action === 'draw2' || d.action === 'wild4');
    if (!isDraw) return { ok: false, reason: 'must_respond_draw' };
    if (!matchesFlow(d, s.flow)) return { ok: false, reason: 'no_match_flow' };
    if (p.energy < d.cost) return { ok: false, reason: 'not_enough_energy' };
    return { ok: true };
  }

  if (p.energy < d.cost) return { ok: false, reason: 'not_enough_energy' };
  if (d.kind === 'monster' && p.field.length >= RULES.MAX_FIELD)
    return { ok: false, reason: 'field_full' };
  if (d.kind === 'trap' && p.traps.length >= RULES.MAX_TRAPS)
    return { ok: false, reason: 'traps_full' };
  if (d.kind === 'fragment' && p.fragments.includes(d.fragment!))
    return { ok: false, reason: 'already_own_fragment' };
  if (!matchesFlow(d, s.flow)) return { ok: false, reason: 'no_match' };

  if (d.needsTarget === 'own_monster' && p.field.length === 0)
    return { ok: false, reason: 'no_own_monster' };
  if (d.needsTarget === 'enemy_monster' && opponentsOf(s, side).every((i) => s.players[i].field.length === 0))
    return { ok: false, reason: 'no_enemy_monster' };
  if (d.needsTarget === 'enemy_trap' && opponentsOf(s, side).every((i) => s.players[i].traps.length === 0))
    return { ok: false, reason: 'no_enemy_traps' };
  if (d.needsTarget === 'discard_monster' && !p.discard.some((c) => def(c.defId).kind === 'monster'))
    return { ok: false, reason: 'no_discard_monster' };

  return { ok: true };
}

/**
 * أرقام الكلمات المفتاحية. مجموعةٌ واحدة يقرأها المحرّك وتصفها نصوص
 * البطاقات في `ABILITY_TEXT` — فلو تغيّر رقمٌ هنا وجب أن يتغيّر النصّ هناك.
 * كلّها محدودة بسقف: الوثيقة تمنع وحشاً يكبر بلا نهاية.
 */
export const KEYWORD_VALUES = {
  /*
    سقفٌ لا يلامسه اللعب — وقد خُفِّض مرّةً إلى 2 ثم أُعيد، لأن القياس كذّب
    السبب. أُعيدت 120 مباراةً بالبذور نفسها تحت السقفين فلم تختلف نتيجةُ
    مباراةٍ واحدة: في «نار ضد عشب» لم يبلغ الحرق ثلاث طبقاتٍ ولا مرّة (1175
    مرّةً طبقة، و129 طبقتين)، وفي «نار ضد ظلام» بلغها تسعاً من نحو 1600.
    فالحرق عملياً ضررٌ واحد في الدور لا ثلاثة — ومن بنى عليه تفسيراً
    (كرفع «التجدّد» ليسبق حرقاً ظُنّ أنه 3) فقد بنى على حدٍّ نظريٍّ لا يقع.
  */
  burnStackMax: 3,
  burnTick: 1,
  rageAtk: 2,
  overheatDamage: 3,
  overheatSelf: 2,
  growthPerTurn: 2,
  growthMax: 6,
  regenHeal: 3,
  swarmAtk: 2,
  sacrificeAtk: 3,
  sacrificeHp: 3,
  graveyardPer: 3,
  graveyardMax: 3,
  curseDamage: 2,
  curseMax: 3,
  overchargePer: 5,
  overchargeMax: 2,
  rechargeEnergy: 1,
  /** سقف ما تمنحه «الإمداد» مجتمعةً في الدور — فلا تتراكم إمدادات الساحة */
  rechargeMax: 1,
  /** كسرُ الضرر الذي تنقله «سلسلة» إلى وحشٍ ثانٍ */
  chainDivisor: 3,
} as const;

export function hasAnyPlayable(s: GameState, side: Seat): boolean {
  return s.players[side].hand.some((c) => canPlayCard(s, side, c.uid).ok);
}

// ===================== الفخاخ =====================

function triggerTraps(
  s: GameState,
  ownerIdx: Seat,
  foeIdx: Seat,
  timing: 'opponent_turn_start' | 'opponent_attack' | 'opponent_summon',
  ctx: { summonedUid?: string; attackerUid?: string } = {}
): boolean {
  const owner = s.players[ownerIdx];
  const foe = s.players[foeIdx];
  if (owner.eliminated || owner.hp <= 0) return false;

  for (let i = owner.traps.length - 1; i >= 0; i--) {
    const t = owner.traps[i];
    const d = def(t.defId);
    if (d.timing !== timing) continue;

    let fired = true;
    switch (d.trap) {
      case 'ambush': {
        const m = foe.field.find((x) => x.uid === ctx.attackerUid);
        if (!m) { fired = false; break; }
        damageMonster(s, foeIdx, m, 3);
        log(s, 'trap', ownerIdx, 'trap_ambush', { amount: 3 });
        break;
      }
      case 'barrier': {
        owner.barrier = true;
        log(s, 'trap', ownerIdx, 'trap_barrier');
        break;
      }
      case 'mirror': {
        owner.mirror = true;
        log(s, 'trap', ownerIdx, 'trap_mirror');
        break;
      }
      case 'blast': {
        const m = foe.field.find((x) => x.uid === ctx.summonedUid);
        if (!m) { fired = false; break; }
        damageMonster(s, foeIdx, m, 4);
        log(s, 'trap', ownerIdx, 'trap_blast', { amount: 4 });
        break;
      }
      case 'net': {
        foe.attackLocked = true;
        log(s, 'trap', ownerIdx, 'trap_net', { player: foe.name });
        break;
      }
      case 'energy_steal': {
        foe.energy = Math.max(0, foe.energy - 1);
        owner.bonusEnergy += 2;
        log(s, 'trap', ownerIdx, 'trap_energy_steal');
        break;
      }
      case 'counter_surge': {
        owner.bonusEnergy += 3;
        log(s, 'trap', ownerIdx, 'trap_counter_surge');
        break;
      }
      case 'curse': {
        let discarded = 0;
        for (let k = 0; k < 2 && foe.hand.length; k++) {
          const [idx, rng] = randomInt(s.rng, foe.hand.length);
          s.rng = rng;
          toDiscard(s, foe.hand.splice(idx, 1)[0], foeIdx);
          discarded++;
        }
        if (!discarded) { fired = false; break; }
        log(s, 'trap', ownerIdx, 'trap_curse', { player: foe.name, n: discarded });
        break;
      }
      case 'relic_break': {
        if (foe.fragments.length === 0) { fired = false; break; }
        const [idx, rng] = randomInt(s.rng, foe.fragments.length);
        s.rng = rng;
        const lost = foe.fragments.splice(idx, 1)[0];
        // تعود القطعة إلى دورة صاحبها فيستطيع إيجادها مجدداً — ولا تُهدى لكاسرها
        toDiscard(s, { uid: makeUid('r'), defId: `frag_${lost}`, owner: foeIdx }, foeIdx);
        log(s, 'trap', ownerIdx, 'trap_relic_break', { fragment: lost });
        break;
      }

      // ===== الموجة الثانية: ردّ على الهجوم =====
      case 'thorns': {
        const m = foe.field.find((x) => x.uid === ctx.attackerUid);
        if (!m) { fired = false; break; }
        const amount = Math.max(1, Math.floor(m.atk / 2));
        damageMonster(s, foeIdx, m, amount);
        log(s, 'trap', ownerIdx, 'trap_thorns', { amount });
        break;
      }
      case 'chain': {
        const m = foe.field.find((x) => x.uid === ctx.attackerUid);
        if (!m) { fired = false; break; }
        // «حاجز» هو آلية إلغاء الهجوم القائمة، فنعيد استخدامها بدل مسار ثانٍ
        owner.barrier = true;
        m.exhausted = true;
        log(s, 'trap', ownerIdx, 'trap_chain', { card: m.defId });
        break;
      }
      case 'spike_wall': {
        const targets = foe.field.slice();
        if (!targets.length) { fired = false; break; }
        for (const m of targets) damageMonster(s, foeIdx, m, 2);
        log(s, 'trap', ownerIdx, 'trap_spike_wall', { player: foe.name, amount: 2 });
        break;
      }
      case 'siphon_strike': {
        if (owner.hp >= owner.maxHp) { fired = false; break; }
        const before = owner.hp;
        owner.hp = Math.min(owner.maxHp, owner.hp + 4);
        log(s, 'trap', ownerIdx, 'trap_siphon_strike', { amount: owner.hp - before, hp: owner.hp });
        break;
      }
      case 'disarm': {
        const m = foe.field.find((x) => x.uid === ctx.attackerUid);
        if (!m || m.atk <= 0) { fired = false; break; }
        m.atk = Math.max(0, m.atk - 2);
        log(s, 'trap', ownerIdx, 'trap_disarm', { card: m.defId, atk: m.atk });
        break;
      }
      case 'frost': {
        if (foe.energy <= 0) { fired = false; break; }
        const drained = foe.energy;
        foe.energy = 0;
        log(s, 'trap', ownerIdx, 'trap_frost', { player: foe.name, amount: drained });
        break;
      }

      // ===== الموجة الثانية: ردّ على الاستدعاء =====
      case 'sinkhole': {
        const m = foe.field.find((x) => x.uid === ctx.summonedUid);
        if (!m) { fired = false; break; }
        foe.field = foe.field.filter((x) => x.uid !== m.uid);
        foe.hand.push({ uid: m.uid, defId: m.defId });
        log(s, 'trap', ownerIdx, 'trap_sinkhole', { card: m.defId, player: foe.name });
        break;
      }
      case 'tax': {
        if (foe.energy <= 0) { fired = false; break; }
        const taken = Math.min(2, foe.energy);
        foe.energy -= taken;
        owner.bonusEnergy += 1;
        log(s, 'trap', ownerIdx, 'trap_tax', { player: foe.name, amount: taken });
        break;
      }
      case 'mimic': {
        const drawn = drawCards(s, ownerIdx, 2, true);
        if (!drawn) { fired = false; break; }
        log(s, 'trap', ownerIdx, 'trap_mimic', { n: drawn });
        break;
      }
      case 'weaken': {
        const m = foe.field.find((x) => x.uid === ctx.summonedUid);
        if (!m || m.atk <= 0) { fired = false; break; }
        m.atk = Math.max(0, m.atk - 2);
        log(s, 'trap', ownerIdx, 'trap_weaken', { card: m.defId, atk: m.atk });
        break;
      }
      case 'soul_tithe': {
        damagePlayer(s, foeIdx, 3);
        log(s, 'trap', ownerIdx, 'trap_soul_tithe', { player: foe.name, amount: 3 });
        break;
      }

      // ===== الموجة الثانية: بداية دور الخصم =====
      case 'plague': {
        const targets = foe.field.slice();
        if (!targets.length) { fired = false; break; }
        for (const m of targets) damageMonster(s, foeIdx, m, 2);
        log(s, 'trap', ownerIdx, 'trap_plague', { player: foe.name, amount: 2 });
        break;
      }
      case 'time_theft': {
        if (!foe.hand.length) { fired = false; break; }
        const [idx, rng] = randomInt(s.rng, foe.hand.length);
        s.rng = rng;
        toDiscard(s, foe.hand.splice(idx, 1)[0], foeIdx);
        drawCards(s, ownerIdx, 1, true);
        log(s, 'trap', ownerIdx, 'trap_time_theft', { player: foe.name });
        break;
      }
      case 'hex': {
        damagePlayer(s, foeIdx, 4);
        log(s, 'trap', ownerIdx, 'trap_hex', { player: foe.name, amount: 4 });
        break;
      }
      case 'drought': {
        if (foe.energy <= 0) { fired = false; break; }
        const lost = Math.min(3, foe.energy);
        foe.energy -= lost;
        log(s, 'trap', ownerIdx, 'trap_drought', { player: foe.name, amount: lost });
        break;
      }
      case 'bramble': {
        // أقوى وحش: الأعلى هجوماً، وعند التساوي الأعلى حياة
        const m = foe.field
          .slice()
          .sort((a, b) => b.atk - a.atk || b.hp - a.hp)[0];
        if (!m) { fired = false; break; }
        damageMonster(s, foeIdx, m, 5);
        log(s, 'trap', ownerIdx, 'trap_bramble', { card: m.defId, amount: 5 });
        break;
      }
      case 'regrowth': {
        const healed = Math.min(5, owner.maxHp - owner.hp);
        const drawn = drawCards(s, ownerIdx, 1, true);
        if (healed <= 0 && !drawn) { fired = false; break; }
        owner.hp += healed;
        log(s, 'trap', ownerIdx, 'trap_regrowth', { amount: healed, hp: owner.hp });
        break;
      }
      case 'fortify': {
        const hurt = owner.field.filter((m) => m.hp < m.maxHp);
        if (!hurt.length) { fired = false; break; }
        for (const m of hurt) m.hp = m.maxHp;
        log(s, 'trap', ownerIdx, 'trap_fortify', { n: hurt.length });
        break;
      }

      default:
        fired = false;
    }

    if (fired) {
      owner.traps.splice(i, 1);
      toDiscard(s, t, ownerIdx);
      // فخ واحد فقط لكل حدث
      return true;
    }
  }
  return false;
}

/** يجرّب فخاخ الخصوم بالترتيب حتى ينطلق واحد — نفس قاعدة «فخ لكل حدث» */
function triggerOpponentTraps(
  s: GameState,
  actingSeat: Seat,
  timing: 'opponent_turn_start' | 'opponent_attack' | 'opponent_summon',
  ctx: { summonedUid?: string; attackerUid?: string; targetSeat?: Seat } = {}
): void {
  const owners =
    timing === 'opponent_attack' && ctx.targetSeat !== undefined
      ? [ctx.targetSeat]
      : opponentsInTurnOrder(s, actingSeat);
  for (const ownerIdx of owners) {
    if (triggerTraps(s, ownerIdx, actingSeat, timing, ctx)) return;
    if (isEnded(s)) return;
  }
}

// ===================== الضرر والموت =====================

/**
 * مصدر الضرر يحكم أيّ دفاعٍ ينطبق:
 *
 *   attack  — الدرع يخفّض، والحلقة لا تمتصّ
 *   spell   — الدرع يخفّض (كما كان قبل هذه الطبقة)، والحلقة تمتصّ
 *   weather — الدرع **لا** يخفّض، والحلقة تمتصّ
 *   poison  — لا درع ولا امتصاص
 *
 * الدرع يصدّ الضربة والسحر لا الحمضَ والسُم؛ ولولا هذا التمييز لأبطل
 * «درع الصخر» المطرَ الحمضي والسُمَّ إبطالاً تامّاً — كلاهما نقطة واحدة
 * والدرع ينقص اثنتين — فتصير التجهيزةُ الواحدة مناعةً من ثلاثة تأثيرات.
 */
interface HitOpts {
  source?: 'attack' | 'spell' | 'weather' | 'poison';
  /** ما يتجاهله المهاجم من تخفيض المدافع («صاعقة خارقة» تتجاهل نصفه) */
  ignoreReduction?: number;
}

function damageMonster(
  s: GameState,
  ownerIdx: Seat,
  m: FieldMonster,
  amount: number,
  opts: HitOpts = {}
): number {
  const d = def(m.defId);

  // حلقة امتصاص (هالو): أوّل ضرر سحري أو بيئي يمرّ دون أثر، مرّةً واحدة
  if (
    amount > 0 &&
    (opts.source === 'spell' || opts.source === 'weather') &&
    passiveOf(m) === 'absorb_ring' &&
    !m.absorbed
  ) {
    m.absorbed = true;
    log(s, 'attack', ownerIdx, 'passive_absorb', { card: d.id });
    return 0;
  }

  const armored = opts.source !== 'weather' && opts.source !== 'poison';
  const reduction = armored ? Math.max(0, reductionOf(m) - (opts.ignoreReduction ?? 0)) : 0;
  let reduced = Math.max(0, amount - reduction);
  // الخصائص الصامتة تبدو معطّلة للاعب، فتُعلن عن نفسها في السجل
  if (amount > 0 && reduction > 0) {
    const key = hasGear(m, 'rock_shield') ? 'gear_shield' : 'ability_guard';
    log(s, 'attack', ownerIdx, key, { card: d.id, amount: amount - reduced });
  }
  /*
    الحماية تمنع **القتل** لا الضرر، وضربةَ الوحش وحدها: السحر والقدرات
    والبيئة تقتل كما كانت، فيبقى للمتفوّق طريقٌ لإزالته إن دفع ثمنه.
  */
  if (m.protectedNew && opts.source === 'attack' && reduced >= m.hp) {
    const spared = reduced;
    reduced = Math.max(0, m.hp - 1);
    log(s, 'attack', ownerIdx, 'summon_shield', { card: d.id, amount: spared - reduced });
  }
  const dealt = Math.min(reduced, m.hp);
  m.hp -= reduced;
  if (m.hp <= 0) {
    // عودة الطيف (خَيال): أوّل سقوط لا يُخرجه من الساحة، والسُم يزول معه
    if (passiveOf(m) === 'spectral_return' && !m.revived) {
      m.revived = true;
      m.hp = 1;
      m.poison = 0;
      log(s, 'attack', ownerIdx, 'passive_return', { card: d.id });
      return dealt;
    }
    const p = s.players[ownerIdx];
    p.field = p.field.filter((x) => x.uid !== m.uid);
    toDiscard(s, { uid: m.uid, defId: m.defId }, ownerIdx);
    log(s, 'attack', ownerIdx, 'monster_fell', { card: d.id });
  }
  return dealt;
}

function damagePlayer(s: GameState, side: Seat, amount: number) {
  const p = s.players[side];
  p.hp = Math.max(0, p.hp - amount);
  checkDeath(s);
}

function checkDeath(s: GameState) {
  if (s.phase === 'ended') return;
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    if (p.hp > 0 || p.eliminated) continue;
    p.eliminated = true;
    p.hp = 0;
    log(s, 'system', i, 'eliminated', { player: p.name });
  }
  const living = livingSeats(s);
  if (living.length === 1) {
    const winner = living[0];
    const lastLoser = s.players.find((p) => p.eliminated);
    endGame(s, winner, {
      key: 'reason_hp',
      params: { loser: lastLoser?.name ?? s.players.find((_, i) => i !== winner)?.name ?? '' },
    });
    return;
  }
  if (living.length === 0) {
    endGame(s, s.current, { key: 'reason_hp', params: { loser: s.players[s.current].name } });
  }
}

function endGame(s: GameState, winner: Seat, outcome: GameOutcome) {
  s.phase = 'ended';
  s.winner = winner;
  s.winReason = outcome;
  log(s, 'win', winner, 'win', {
    ...outcome.params,
    winner: s.players[winner].name,
    reason: outcome.key,
  });
}

// ===================== الدور =====================

/**
 * عدّاد الجولة ملك اللاعب لا ملك رقم الدور. لا يبدأ عدّاد جديد إلا حين ينتقل
 * الدور إلى لاعب آخر يتصرّف فعلاً — فكارت «تخطي» الذي يعيد الدور إلى صاحبه
 * بعد دورين محتسَبين لا يمنحه مهلة كاملة جديدة، والدور المُتخطَّى لا يبتلع حقبة.
 */
function armClock(s: GameState) {
  if (s.clockSeat === s.current) return;
  s.clockSeat = s.current;
  s.clockEpoch += 1;
}

function beginTurn(s: GameState) {
  if (s.phase === 'ended') return;
  const idx = s.current;
  const p = s.players[idx];
  if (!p || p.eliminated || p.hp <= 0) {
    s.current = nextLiving(s, idx);
    if (s.current === idx) return;
    beginTurn(s);
    return;
  }
  s.turn += 1;

  p.energyCap = Math.min(p.maxEnergyCap, p.energyCap + 1);
  /*
    السقف يمنع تراكم الإمداد: الكهرباء تفتح بوحشَي إمداد فكانت تكسب +2 طاقة
    كل دور على سقفٍ يبدأ عند 1 أو 2 — أي مضاعفةُ اقتصادها في الأدوار الأولى،
    وهي الأدوار التي تقيسها الأداة.
  */
  const chargeBonus = Math.min(
    KEYWORD_VALUES.rechargeMax,
    p.field.filter((m) => def(m.defId).ability === 'recharge').length * KEYWORD_VALUES.rechargeEnergy
  );
  p.energy = p.energyCap + chargeBonus + p.bonusEnergy;
  p.bonusEnergy = 0;
  if (chargeBonus > 0) {
    log(s, 'system', idx, 'ability_recharge', { amount: chargeBonus, n: chargeBonus });
  }
  p.attackLocked = false;
  p.comboUsed = false;
  // الإفلات والحماية يدومان دوراً واحداً: يزولان حين يعود الدور إلى صاحبهما
  for (const m of p.field) {
    m.evasive = false;
    m.protectedNew = false;
  }
  p.reinforcedThisTurn = false;
  p.amplified = false;
  p.extraDrawUsed = false;
  for (const m of p.field) {
    m.exhausted = false;
    m.sick = false;
  }

  log(s, 'system', idx, 'turn_start', { player: p.name, energy: p.energy, cap: p.energyCap });

  // --- كلمات بداية الدور: نموّ ثم تجدّد ثم حرق، ثم لعنة الخصم ---
  for (const m of p.field.slice()) {
    const d = def(m.defId);
    if (d.ability === 'growth') {
      const ceiling = (d.atk ?? m.atk) + KEYWORD_VALUES.growthMax;
      if (m.atk < ceiling) {
        m.atk += KEYWORD_VALUES.growthPerTurn;
        log(s, 'system', idx, 'ability_growth', { card: d.id, atk: m.atk });
      }
    }
    if (d.ability === 'regen' && m.hp < m.maxHp) {
      m.hp = Math.min(m.maxHp, m.hp + KEYWORD_VALUES.regenHeal);
      log(s, 'system', idx, 'ability_regen', { card: d.id, amount: KEYWORD_VALUES.regenHeal });
    }
  }
  for (const m of p.field.slice()) {
    const stacks = m.burn ?? 0;
    if (stacks <= 0) continue;
    const amount = stacks * KEYWORD_VALUES.burnTick;
    if (damageMonster(s, idx, m, amount, { source: 'poison' }) > 0) {
      log(s, 'system', idx, 'ability_burn_tick', { card: def(m.defId).id, amount });
    }
  }
  // اللعنة تعمل في دور صاحب الخصم لا في دور حاملها
  {
    const cursed = s.players.reduce(
      (n, other, i) =>
        i === idx ? n : n + other.field.filter((m) => def(m.defId).ability === 'curse').length,
      0
    );
    if (cursed > 0) {
      const amount = Math.min(KEYWORD_VALUES.curseMax, cursed * KEYWORD_VALUES.curseDamage);
      damagePlayer(s, idx, amount);
      log(s, 'system', idx, 'ability_curse', { player: p.name, amount });
    }
  }

  // --- طبقة التحضير: تميمة الشفاء، ثم البيئة، ثم السُم المتراكم ---
  for (const m of p.field.slice()) {
    if (hasGear(m, 'healing_amulet') && m.hp < m.maxHp) {
      m.hp = Math.min(m.maxHp, m.hp + 1);
      log(s, 'system', idx, 'gear_regen', { card: def(m.defId).id, amount: 1 });
    }
  }

  // المطر الحمضي يمسّ الساحة كلّها لا ساحةَ صاحب الدور وحده — ولذلك يعيش
  // الطقس في حالة المباراة لا في حالة اللاعب.
  if (s.weather === 'acid_rain') {
    let bitten = 0;
    for (let i = 0; i < s.players.length; i++) {
      for (const m of s.players[i].field.slice()) {
        if (damageMonster(s, i, m, ACID_RAIN_TICK, { source: 'weather' }) > 0) bitten++;
      }
    }
    if (bitten > 0) {
      log(s, 'system', idx, 'weather_tick', { weather: 'acid_rain', amount: ACID_RAIN_TICK });
    }
  }

  for (const m of p.field.slice()) {
    const tick = poisonTick(m.poison ?? 0, s.weather ?? null);
    if (tick > 0) {
      log(s, 'attack', idx, 'poison_tick', { card: def(m.defId).id, amount: tick });
      damageMonster(s, idx, m, tick, { source: 'poison' });
    }
  }

  // فخاخ الخصوم التي تنطلق مع بداية دورك (فخ واحد لكل حدث)
  triggerOpponentTraps(s, idx, 'opponent_turn_start');
  if (isEnded(s)) return;

  if (p.eliminated || p.hp <= 0) {
    endTurn(s);
    return;
  }

  if (p.skipNext) {
    p.skipNext = false;
    log(s, 'system', idx, 'turn_lost', { player: p.name });
    endTurn(s);
    return;
  }

  if (s.pendingDraw > 0) {
    armClock(s);
    s.phase = 'respond';
    log(s, 'system', idx, 'pending_draw', { n: s.pendingDraw });
    return;
  }

  armClock(s);
  s.phase = 'main';
  // البادئ لا يسحب في دوره الأول — تعويض إضافي للاعب الثاني
  if (s.turn > 1) drawCards(s, idx, 1);
}

function endTurn(s: GameState) {
  if (s.phase === 'ended') return;
  s.reveal = null;
  s.current = nextLiving(s, s.current);
  beginTurn(s);
}

// ===================== لعب الكروت =====================

function playMonster(s: GameState, side: Seat, d: CardDef, inst: CardInstance) {
  const p = s.players[side];
  const m: FieldMonster = {
    uid: inst.uid,
    defId: d.id,
    atk: d.atk!,
    hp: d.hp!,
    maxHp: d.hp!,
    exhausted: false,
    sick: d.ability !== 'speed',
  };
  /*
    الفارق يُقاس **قبل** أن ينزل هذا الوحش: السؤال «هل صاحبه متأخّر؟» لا
    «هل تأخّر بعد نزوله؟». ويُقاس على أكثر الخصوم وحوشاً، فاللعب الثلاثي
    لا يُبطل الحماية لأن أحد الخصمين خالي الساحة.
  */
  const foeMost = Math.max(0, ...opponentsOf(s, side).map((i) => s.players[i].field.length));
  const deficit = foeMost - p.field.length;

  p.field.push(m);
  log(s, 'play', side, 'summoned', { player: p.name, card: d.id, atk: d.atk!, hp: d.hp! });

  if (deficit >= RULES.PROTECT_DEFICIT) {
    m.protectedNew = true;
    log(s, 'play', side, 'summon_protected', { card: d.id, n: deficit });
  }
  // النجدة لوحشٍ واحد في الدور: أفضليةُ الساحة تبقى أفضلية، لكنها لا تُقفل المباراة
  if (deficit >= RULES.REINFORCE_DEFICIT && !p.reinforcedThisTurn && m.sick) {
    m.sick = false;
    p.reinforcedThisTurn = true;
    log(s, 'play', side, 'emergency_ready', { card: d.id, n: deficit });
  }
  if (d.ability === 'speed') {
    log(s, 'play', side, 'ability_speed', { card: d.id });
  }
  onSummonKeyword(s, side, d, m);
  triggerOpponentTraps(s, side, 'opponent_summon', { summonedUid: m.uid });
}

/**
 * كلمات تعمل لحظة الاستدعاء. كلّها حتميّة بلا اختيارٍ من اللاعب: الاختيار
 * يحتاج نافذةً وردّاً، والوحش يُستدعى أيضاً بيد الخصم الآلي وفي إعادة عرض
 * المباراة — فما لا يُحسم من الحالة وحدها يجعل اللوحتين تفترقان.
 */
function onSummonKeyword(s: GameState, side: Seat, d: CardDef, m: FieldMonster) {
  const p = s.players[side];
  switch (d.ability) {
    case 'swarm': {
      const others = p.field.filter((x) => x.uid !== m.uid);
      for (const o of others) o.atk += KEYWORD_VALUES.swarmAtk;
      if (others.length) {
        log(s, 'play', side, 'ability_swarm', { amount: KEYWORD_VALUES.swarmAtk, n: others.length });
      }
      break;
    }
    case 'flow_control':
      if (d.element !== 'wild') {
        s.flow = { defId: d.id, element: d.element, number: d.number };
        log(s, 'play', side, 'ability_flow_control', { card: d.id });
      }
      break;
    case 'bounce': {
      for (const foeIdx of opponentsOf(s, side)) {
        const foe = s.players[foeIdx];
        if (!foe.field.length) continue;
        // الأضعف: الأقلّ حياةً ثم الأقلّ هجوماً — نفس ترتيب «صورة المرآة»
        const weakest = foe.field.slice().sort((a, b) => a.hp - b.hp || a.atk - b.atk)[0];
        foe.field = foe.field.filter((x) => x.uid !== weakest.uid);
        foe.hand.push({ uid: weakest.uid, defId: weakest.defId });
        log(s, 'play', side, 'ability_bounce', { card: weakest.defId, player: foe.name });
        break;
      }
      break;
    }
    case 'purify': {
      for (const o of p.field) {
        o.poison = 0;
        o.burn = 0;
      }
      p.skipNext = false;
      p.attackLocked = false;
      log(s, 'play', side, 'ability_purify', { player: p.name });
      break;
    }
    case 'sacrifice': {
      // يلتهم جريحاً من وحوشك: الأضعف حياةً بين المجروحين، فلا يأكل سليماً
      const wounded = p.field
        .filter((x) => x.uid !== m.uid && x.hp < x.maxHp)
        .sort((a, b) => a.hp - b.hp || a.atk - b.atk)[0];
      if (wounded) {
        p.field = p.field.filter((x) => x.uid !== wounded.uid);
        toDiscard(s, { uid: wounded.uid, defId: wounded.defId }, side);
        m.atk += KEYWORD_VALUES.sacrificeAtk;
        m.maxHp += KEYWORD_VALUES.sacrificeHp;
        m.hp += KEYWORD_VALUES.sacrificeHp;
        log(s, 'play', side, 'ability_sacrifice', { card: wounded.defId, atk: m.atk, hp: m.hp });
      }
      break;
    }
    case 'graveyard': {
      /*
        المقابر كلّها لا مقبرتك وحدك. الكلمة تقرأ موتى الساحة، وقصرُها على
        موتاك حين انقسمت المهملات أضعفها وأنزل الظلام إلى القاع — وخالف
        نصّ البطاقة نفسه، فهو يقول «في المهملات» بلا تخصيص.
      */
      const buried = s.players.reduce(
        (n, pl) => n + pl.discard.filter((c) => def(c.defId).kind === 'monster').length,
        0
      );
      const bonus = Math.min(
        KEYWORD_VALUES.graveyardMax,
        Math.floor(buried / KEYWORD_VALUES.graveyardPer)
      );
      if (bonus > 0) {
        m.atk += bonus;
        log(s, 'play', side, 'ability_graveyard', { amount: bonus });
      }
      break;
    }
    default:
      break;
  }
}

function applySpell(
  s: GameState,
  side: Seat,
  d: CardDef,
  targetUid?: string
) {
  const p = s.players[side];
  const foes = opponentsOf(s, side);
  const defaultFoe = foes[0] ?? opponentOf(s, side);

  switch (d.spell) {
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + 6);
      log(s, 'play', side, 'healed', { player: p.name, amount: 6, hp: p.hp });
      break;
    case 'boost': {
      const m = p.field.find((x) => x.uid === targetUid) ?? p.field[0];
      if (m) {
        m.atk += 3;
        log(s, 'play', side, 'boosted', { card: m.defId, amount: 3, atk: m.atk });
      }
      break;
    }
    case 'storm': {
      for (const foeIdx of foes) {
        const foe = s.players[foeIdx];
        const targets = foe.field.slice();
        for (const m of targets) damageMonster(s, foeIdx, m, 3);
        if (targets.length) log(s, 'play', side, 'storm', { player: foe.name, amount: 3 });
      }
      break;
    }
    case 'surge':
      p.energy += 3;
      log(s, 'play', side, 'gained_energy', { player: p.name, amount: 3, energy: p.energy });
      break;
    case 'search': {
      refillDeck(s, side);
      const cards = p.deck.slice(0, 5);
      if (cards.length) {
        s.reveal = { side, cards };
        log(s, 'play', side, 'search_revealed', { n: cards.length });
      }
      break;
    }
    case 'swap': {
      const foeIdx = (targetUid ? findMonsterOwner(s, targetUid, foes) : null) ?? defaultFoe;
      const foe = s.players[foeIdx];
      const m = foe.field.find((x) => x.uid === targetUid) ?? foe.field[0];
      if (m) {
        foe.field = foe.field.filter((x) => x.uid !== m.uid);
        foe.hand.push({ uid: m.uid, defId: m.defId });
        log(s, 'play', side, 'bounced', { card: m.defId, player: foe.name });
      }
      break;
    }
    case 'amplify':
      p.amplified = true;
      log(s, 'play', side, 'amplify');
      break;
    case 'revive': {
      if (p.field.length >= RULES.MAX_FIELD) break;
      const idx = targetUid
        ? p.discard.findIndex((c) => c.uid === targetUid)
        : p.discard.findIndex((c) => def(c.defId).kind === 'monster');
      if (idx >= 0) {
        const inst = p.discard.splice(idx, 1)[0];
        const md = def(inst.defId);
        p.field.push({
          uid: inst.uid,
          defId: md.id,
          atk: md.atk!,
          hp: md.hp!,
          maxHp: md.hp!,
          exhausted: false,
          sick: md.ability !== 'speed',
        });
        log(s, 'play', side, 'revived', { card: md.id });
      }
      break;
    }
    case 'purge': {
      const foeIdx = (targetUid ? findTrapOwner(s, targetUid, foes) : null) ?? defaultFoe;
      const foe = s.players[foeIdx];
      const i = targetUid ? foe.traps.findIndex((t) => t.uid === targetUid) : 0;
      if (i >= 0 && foe.traps.length) {
        const t = foe.traps.splice(i, 1)[0];
        toDiscard(s, t, foeIdx);
        log(s, 'play', side, 'purged', { player: foe.name });
      }
      break;
    }

    // ===== الموجة الثانية =====
    case 'strike': {
      const foeIdx = (targetUid ? findMonsterOwner(s, targetUid, foes) : null) ?? defaultFoe;
      const foe = s.players[foeIdx];
      const m = foe.field.find((x) => x.uid === targetUid) ?? foe.field[0];
      if (m) {
        const dealt = damageMonster(s, foeIdx, m, 4);
        log(s, 'play', side, 'strike', { card: m.defId, amount: dealt });
      }
      break;
    }
    case 'bolt': {
      damagePlayer(s, defaultFoe, 3);
      log(s, 'play', side, 'bolt', { player: s.players[defaultFoe].name, amount: 3 });
      break;
    }
    case 'drain_life': {
      damagePlayer(s, defaultFoe, 3);
      if (isEnded(s)) break;
      p.hp = Math.min(p.maxHp, p.hp + 3);
      log(s, 'play', side, 'drain_life', {
        player: s.players[defaultFoe].name,
        amount: 3,
        hp: p.hp,
      });
      break;
    }
    case 'shield_wall': {
      // الحياة القصوى ترتفع معها وإلا ضاعت الزيادة عند أول شفاء
      for (const m of p.field) {
        m.maxHp += 3;
        m.hp += 3;
      }
      if (p.field.length) log(s, 'play', side, 'shield_wall', { n: p.field.length, amount: 3 });
      break;
    }
    case 'rally': {
      for (const m of p.field) m.atk += 1;
      if (p.field.length) log(s, 'play', side, 'rally', { n: p.field.length, amount: 1 });
      break;
    }
    case 'recall': {
      const idx = targetUid
        ? p.discard.findIndex((c) => c.uid === targetUid)
        : p.discard.findIndex((c) => def(c.defId).kind === 'monster');
      if (idx >= 0) {
        const inst = p.discard.splice(idx, 1)[0];
        p.hand.push(inst);
        log(s, 'play', side, 'recalled', { card: inst.defId });
      }
      break;
    }
    case 'foresight': {
      const n = drawCards(s, side, 2, true);
      log(s, 'play', side, 'foresight', { n });
      break;
    }
    case 'mana_well': {
      p.energy += 2;
      p.bonusEnergy += 2;
      log(s, 'play', side, 'mana_well', { amount: 2, energy: p.energy });
      break;
    }
    case 'cleanse': {
      p.skipNext = false;
      p.attackLocked = false;
      const n = drawCards(s, side, 1, true);
      log(s, 'play', side, 'cleanse', { player: p.name, n });
      break;
    }
    case 'overload': {
      const m = p.field.find((x) => x.uid === targetUid) ?? p.field[0];
      if (m) {
        m.atk += 5;
        // القوّة تُشترى بالحياة، فقد يسقط الوحش بها
        const dealt = damageMonster(s, side, m, 2);
        log(s, 'play', side, 'overload', { card: m.defId, atk: m.atk, amount: dealt });
      }
      break;
    }
    case 'mirror_image': {
      if (p.field.length === 0 || p.field.length >= RULES.MAX_FIELD) break;
      // أضعف وحش: الأقلّ حياةً، وعند التساوي الأقلّ هجوماً
      const weakest = p.field.slice().sort((a, b) => a.hp - b.hp || a.atk - b.atk)[0];
      // النسخة تُسحب من السطح أو المهملات لا تُختلق، وإلا اختلّ جرد الكروت.
      // فإن نفدت النسخ الأخرى من هذا التصميم لم يجد السحر ما ينسخه.
      let idx = p.deck.findIndex((c) => c.defId === weakest.defId);
      const inst =
        idx >= 0
          ? p.deck.splice(idx, 1)[0]
          : (idx = p.discard.findIndex((c) => c.defId === weakest.defId)) >= 0
            ? p.discard.splice(idx, 1)[0]
            : null;
      if (!inst) break;
      const md = def(inst.defId);
      p.field.push({
        uid: inst.uid,
        defId: md.id,
        atk: md.atk!,
        hp: md.hp!,
        maxHp: md.hp!,
        exhausted: false,
        sick: md.ability !== 'speed',
      });
      log(s, 'play', side, 'mirror_image', { card: md.id });
      break;
    }
    case 'banish': {
      const foeIdx = (targetUid ? findMonsterOwner(s, targetUid, foes) : null) ?? defaultFoe;
      const foe = s.players[foeIdx];
      const m = foe.field.find((x) => x.uid === targetUid) ?? foe.field[0];
      if (m) {
        // إزالة مباشرة لا ضرر: «حراسة» لا تحمي منها
        foe.field = foe.field.filter((x) => x.uid !== m.uid);
        toDiscard(s, { uid: m.uid, defId: m.defId }, foeIdx);
        log(s, 'play', side, 'banished', { card: m.defId, player: foe.name });
      }
      break;
    }
    case 'chain_lightning': {
      for (const foeIdx of foes) {
        const foe = s.players[foeIdx];
        for (const m of foe.field.slice()) damageMonster(s, foeIdx, m, 2);
        damagePlayer(s, foeIdx, 1);
        log(s, 'play', side, 'chain_lightning', { player: foe.name, amount: 2 });
        if (isEnded(s)) break;
      }
      break;
    }
    case 'titan_call': {
      refillDeck(s, side);
      const idx = p.deck.findIndex((c) => def(c.defId).kind === 'fragment');
      if (idx >= 0) {
        const inst = p.deck.splice(idx, 1)[0];
        p.hand.push(inst);
        log(s, 'play', side, 'titan_call', { card: inst.defId });
      }
      break;
    }
    case 'graft': {
      const m = p.field.find((x) => x.uid === targetUid) ?? p.field[0];
      if (m) {
        m.hp = m.maxHp;
        m.atk += 1;
        log(s, 'play', side, 'graft', { card: m.defId, hp: m.hp, atk: m.atk });
      }
      break;
    }
    case 'barricade':
      p.barrier = true;
      log(s, 'play', side, 'barricade', { player: p.name });
      break;
    case 'reflect':
      p.mirror = true;
      log(s, 'play', side, 'reflect', { player: p.name });
      break;
    case 'second_wind': {
      const woken = p.field.filter((m) => m.exhausted || m.sick);
      for (const m of woken) {
        m.exhausted = false;
        m.sick = false;
      }
      if (woken.length) log(s, 'play', side, 'second_wind', { n: woken.length });
      break;
    }
  }
}

function applyAction(s: GameState, side: Seat, d: CardDef) {
  const foeIdx = opponentOf(s, side);
  const foe = s.players[foeIdx];
  const p = s.players[side];

  switch (d.action) {
    case 'skip':
      foe.skipNext = true;
      log(s, 'play', side, 'skip_next', { player: foe.name });
      break;
    case 'reverse':
      if (s.players.length > 2) {
        s.turnDir = s.turnDir === 1 ? -1 : 1;
        drawCards(s, side, 1);
        log(s, 'play', side, 'reverse_dir', { player: p.name });
      } else {
        foe.skipNext = true;
        drawCards(s, side, 1);
        log(s, 'play', side, 'reverse', { foe: foe.name, player: p.name });
      }
      break;
    case 'draw2':
      s.pendingDraw += 2;
      log(s, 'play', side, 'draw_penalty', { n: s.pendingDraw });
      break;
    case 'wild4':
      s.pendingDraw += 4;
      log(s, 'play', side, 'draw_penalty', { n: s.pendingDraw });
      break;
    case 'wild':
      break;
  }
}

function doPlay(s: GameState, action: Extract<GameAction, { type: 'PLAY' }>) {
  const side = s.current;
  const check = canPlayCard(s, side, action.uid);
  if (!check.ok) return;

  const p = s.players[side];
  const i = p.hand.findIndex((c) => c.uid === action.uid);
  const inst = p.hand[i];
  const d = def(inst.defId);

  p.hand.splice(i, 1);
  p.energy -= d.cost;

  const respondPhase = s.phase === 'respond';

  // تحديث طابور التدفق
  if (!bypassesFlow(d)) {
    if (d.element === 'wild') {
      const chosen = action.chosenElement ?? 'fire';
      s.flow = { element: chosen, number: null, defId: d.id };
      log(s, 'play', side, 'played_wild', { player: p.name, card: d.id, element: chosen });
    } else {
      s.flow = { element: d.element as PlayableElement, number: d.number, defId: d.id };
    }
  }

  switch (d.kind) {
    case 'monster':
      // النسخة تنتقل إلى الساحة، ولا تذهب للمهملات إلا عند سقوطها
      playMonster(s, side, d, inst);
      break;
    case 'action':
      applyAction(s, side, d);
      // إلى الطابور المشترك لا إلى مهملاته: عليه تقع المطابقة حتى يُغطّى
      s.flowPile.push(inst);
      break;
    case 'spell':
      log(s, 'play', side, 'played', { player: p.name, card: d.id });
      applySpell(s, side, d, action.targetUid);
      s.flowPile.push(inst);
      break;
    case 'trap':
      p.traps.push({ uid: inst.uid, defId: d.id });
      log(s, 'play', side, 'trap_set', { player: p.name });
      break;
    case 'fragment':
      // القطعة تنتقل إلى خزانة اللاعب وتخرج من دورة السطح حتى تُحطَّم
      p.fragments.push(d.fragment!);
      log(s, 'play', side, 'fragment_gained', {
        player: p.name,
        card: d.id,
        have: p.fragments.length,
        need: TITAN.fragmentsNeeded,
      });
      break;
  }

  if (s.phase === 'ended') return;

  // في مرحلة الرد: تكديس كارت السحب يمرّر العقوبة للخصم وينهي الدور فوراً
  if (respondPhase) {
    s.phase = 'main';
    endTurn(s);
    return;
  }

  // لعب كارت سحب ينهي دورك ويمرّر العقوبة
  if (d.kind === 'action' && (d.action === 'draw2' || d.action === 'wild4')) {
    endTurn(s);
    return;
  }
  if (d.kind === 'action' && (d.action === 'skip' || d.action === 'reverse')) {
    endTurn(s);
    return;
  }

  // نفاد اليد
  // لا يدَ ولا ديك ولا ما يُستعاد — الخسارة على جرد صاحبها لا على جردٍ مشترك
  if (p.hand.length === 0 && p.deck.length === 0 && recyclable(s, side).length === 0) {
    endGame(s, side, { key: 'reason_empty_hand' });
  }
}

// ===================== القتال =====================

export interface ComboCheck {
  ok: boolean;
  reason?: string;
  damage: number;
}

/**
 * زياداتٌ تعتمد على حالة صاحبها لا على الوحش وحده، فلا تصلح في
 * `strikeOf` الخالصة: «هياج» بحياة صاحبه، و«شحنة زائدة» بطاقته.
 * تُحسب هنا مرّةً واحدة ليتطابق ما تعرضه المعاينة مع ما يقع فعلاً.
 */
export function attackBonus(s: GameState, side: Seat, monsters: FieldMonster[]): number {
  const p = s.players[side];
  let bonus = 0;
  const lowLife = p.hp * 2 <= p.maxHp;
  for (const m of monsters) {
    const ab = def(m.defId).ability;
    if (ab === 'rage' && lowLife) bonus += KEYWORD_VALUES.rageAtk;
    if (ab === 'overheat') bonus += KEYWORD_VALUES.overheatDamage;
  }
  if (monsters.some((m) => def(m.defId).ability === 'overcharge')) {
    bonus += Math.min(
      KEYWORD_VALUES.overchargeMax,
      Math.floor(p.energy / KEYWORD_VALUES.overchargePer)
    );
  }
  return bonus;
}

export function evaluateAttack(
  s: GameState,
  side: Seat,
  attackerUids: string[]
): ComboCheck {
  const p = s.players[side];
  if (s.current !== side || s.phase !== 'main')
    return { ok: false, reason: 'not_your_turn', damage: 0 };
  if (p.attackLocked) return { ok: false, reason: 'netted', damage: 0 };
  if (attackerUids.length === 0) return { ok: false, reason: 'pick_attacker', damage: 0 };

  const monsters = attackerUids
    .map((u) => p.field.find((m) => m.uid === u))
    .filter((m): m is FieldMonster => !!m);
  if (monsters.length !== attackerUids.length)
    return { ok: false, reason: 'invalid_attacker', damage: 0 };
  for (const m of monsters) {
    if (m.sick) return { ok: false, reason: 'monster_sick', damage: 0 };
    if (m.exhausted) return { ok: false, reason: 'monster_exhausted', damage: 0 };
  }

  let damage =
    monsters.reduce((n, m) => n + strikeOf(m, s.weather ?? null), 0) +
    attackBonus(s, side, monsters);

  if (monsters.length > 1) {
    if (p.comboUsed) return { ok: false, reason: 'combo_used', damage: 0 };
    const defs = monsters.map((m) => def(m.defId));
    // زال «رابط» مع الخصائص القديمة: الدمج الآن عنصرٌ مشترك أو رقمٌ مشترك
    const sameElement = defs.every((d) => d.element === defs[0].element);
    const sameNumber = defs.every((d) => d.number !== null && d.number === defs[0].number);
    if (!sameElement && !sameNumber)
      return {
        ok: false,
        reason: 'combo_requires',
        damage: 0,
      };
    damage += RULES.COMBO_BONUS_PER_EXTRA * (monsters.length - 1);
    if (p.amplified) damage *= 2;
  }

  return { ok: true, damage };
}

function resolveAttackFoe(
  s: GameState,
  side: Seat,
  action: Extract<GameAction, { type: 'ATTACK' }>
): { foeIdx: Seat; targetMonster: FieldMonster | null } | null {
  const foes = opponentsOf(s, side);
  if (action.target === 'face') {
    const foeIdx =
      action.targetSeat !== undefined && foes.includes(action.targetSeat)
        ? action.targetSeat
        : foes.length === 1
          ? foes[0]
          : null;
    if (foeIdx === null) return null;
    if (s.players[foeIdx].field.length > 0) return null;
    return { foeIdx, targetMonster: null };
  }
  const foeIdx = findMonsterOwner(s, action.target, foes);
  if (foeIdx === null) return null;
  const targetMonster = s.players[foeIdx].field.find((m) => m.uid === action.target) ?? null;
  if (!targetMonster) return null;
  // المنسحب أفلت: لا يُهاجَم حتى يعود الدور إلى صاحبه
  if (targetMonster.evasive) return null;
  return { foeIdx, targetMonster };
}

function doAttack(s: GameState, action: Extract<GameAction, { type: 'ATTACK' }>) {
  const side = s.current;
  const check = evaluateAttack(s, side, action.attackers);
  if (!check.ok) return;

  const p = s.players[side];
  const resolved = resolveAttackFoe(s, side, action);
  if (!resolved) return;
  const { foeIdx, targetMonster } = resolved;
  const foe = s.players[foeIdx];

  const monsters = action.attackers.map((u) => p.field.find((m) => m.uid === u)!);
  const isCombo = monsters.length > 1;
  const names = monsters.map((m) => m.defId).join('|');

  for (const m of monsters) m.exhausted = true;
  if (isCombo) {
    p.comboUsed = true;
    p.amplified = false;
  }

  // فخاخ دفاعية لصاحب الهدف فقط
  triggerOpponentTraps(s, side, 'opponent_attack', {
    attackerUid: monsters[0].uid,
    targetSeat: foeIdx,
  });
  if (s.phase === 'ended') return;

  if (foe.barrier) {
    foe.barrier = false;
    log(s, 'attack', side, 'attack_blocked', {
      names,
      strikers: monsters.map((m) => m.uid).join(','),
      target: targetMonster?.uid ?? 'face',
      targetSeat: foeIdx,
    });
    return;
  }

  let damage = check.damage;
  if (foe.mirror) {
    foe.mirror = false;
    const reflected = Math.floor(damage / 2);
    damagePlayer(s, side, reflected);
    log(s, 'trap', foeIdx, 'mirror_reflect', { amount: reflected, player: p.name });
    if (isEnded(s)) return;
  }

  // بعض المهاجمين قد يكونون سقطوا بفخ الكمين
  const alive = monsters.filter((m) => p.field.some((x) => x.uid === m.uid));
  if (alive.length === 0) {
    log(s, 'attack', side, 'attack_failed', {
      strikers: monsters.map((m) => m.uid).join(','),
      target: targetMonster?.uid ?? 'face',
      targetSeat: foeIdx,
    });
    return;
  }
  if (alive.length !== monsters.length) {
    damage =
      alive.reduce((n, m) => n + strikeOf(m, s.weather ?? null), 0) +
      attackBonus(s, side, alive) +
      (alive.length > 1 ? RULES.COMBO_BONUS_PER_EXTRA * (alive.length - 1) : 0);
  }


  /*
   * رميتا «الضباب الكثيف» و«التفادي الهوائي» تُحسمان من بذرة الحالة لا من
   * `Math.random`. المحرّك مُخفِّض خالص تُعاد به المباراة من بذرتها، ويشغّله
   * كلا الطرفين في اللعب الشبكي — فعشوائيةٌ خارج البذرة تجعل اللوحتين
   * تفترقان عند أوّل هجوم.
   */
  if (s.weather === 'heavy_fog') {
    const [roll, rng] = nextRandom(s.rng);
    s.rng = rng;
    if (roll < FOG_MISS_CHANCE) {
      log(s, 'attack', side, 'weather_miss', { names, weather: 'heavy_fog' });
      return;
    }
  }

  if (targetMonster && def(targetMonster.defId).ability === 'dodge') {
    const [roll, rng] = nextRandom(s.rng);
    s.rng = rng;
    if (roll < DODGE_CHANCE) {
      log(s, 'attack', foeIdx, 'ability_dodge', { card: def(targetMonster.defId).id });
      return;
    }
  }

  if (targetMonster && passiveOf(targetMonster) === 'air_dodge') {
    const [roll, rng] = nextRandom(s.rng);
    s.rng = rng;
    if (roll < AIR_DODGE_CHANCE) {
      log(s, 'attack', foeIdx, 'passive_dodge', { card: def(targetMonster.defId).id });
      return;
    }
  }

  if (!targetMonster) {
    damagePlayer(s, foeIdx, damage);
    log(s, 'attack', side, isCombo ? 'combo_face' : 'attack_face', {
      names,
      player: foe.name,
      damage,
      strikers: alive.map((m) => m.uid).join(','),
      target: 'face',
      targetSeat: foeIdx,
    });
  } else {
    const before = targetMonster.hp;
    const tDef = def(targetMonster.defId);
    const reduction = reductionOf(targetMonster);
    // صاعقة خارقة (فليكس): يتجاهل نصف ما يخفّضه المدافع
    const ignore = alive.some((m) => passiveOf(m) === 'surge_strike') ? surgeCut(reduction) : 0;
    const dealt = damageMonster(s, foeIdx, targetMonster, damage, {
      source: 'attack',
      ignoreReduction: ignore,
    });
    log(s, 'attack', side, isCombo ? 'combo_monster' : 'attack_monster', {
      names,
      card: tDef.id,
      damage,
      strikers: alive.map((m) => m.uid).join(','),
      target: targetMonster.uid,
      targetSeat: foeIdx,
    });
    // اختراق — التخفيض صار مجموع «حراسة» و«درع الصخر» ناقصَ ما تجاهلته
    // الصاعقة، فحسابُه بـ«+1 إن كان حارساً» لم يعد صحيحاً.
    const overflow = damage - (before + Math.max(0, reduction - ignore));
    if (alive.some(piercesOf) && overflow > 0) {
      damagePlayer(s, foeIdx, overflow);
      log(s, 'attack', side, 'pierce_extra', { amount: overflow, player: foe.name });
    }
    // حرق: يترك أثره في الهدف الصامد
    if (
      alive.some((m) => def(m.defId).ability === 'burn') &&
      foe.field.some((x) => x.uid === targetMonster.uid)
    ) {
      targetMonster.burn = Math.min(KEYWORD_VALUES.burnStackMax, (targetMonster.burn ?? 0) + 1);
      log(s, 'attack', side, 'ability_burn', { card: tDef.id });
    }

    // سلسلة: ثلث الضرر إلى وحشٍ آخر للخصم
    if (alive.some((m) => def(m.defId).ability === 'chain')) {
      const other = foe.field.find((x) => x.uid !== targetMonster.uid);
      if (other) {
        const splash = Math.floor(damage / KEYWORD_VALUES.chainDivisor);
        if (splash > 0) {
          damageMonster(s, foeIdx, other, splash, { source: 'attack' });
          log(s, 'attack', side, 'ability_chain', { card: def(other.defId).id, amount: splash });
        }
      }
    }

    // درع حراري (كوبو): يردّ نقطةً إلى كل مهاجم ما دام صامداً
    if (passiveOf(targetMonster) === 'thermal_shield' && foe.field.some((x) => x.uid === targetMonster.uid)) {
      for (const m of alive) {
        if (p.field.some((x) => x.uid === m.uid)) damageMonster(s, side, m, 1, { source: 'attack' });
      }
      log(s, 'attack', foeIdx, 'passive_thermal', { card: tDef.id, amount: 1 });
    }

    // أثر سام (زحّاف): يسمّم من صمد أمامه لا من سقط
    if (
      alive.some((m) => passiveOf(m) === 'venom_trail') &&
      foe.field.some((x) => x.uid === targetMonster.uid)
    ) {
      targetMonster.poison = (targetMonster.poison ?? 0) + 1;
      log(s, 'attack', side, 'passive_venom_trail', { card: tDef.id });
    }
    void dealt;
  }

  // انصهار: القوّة تُدفع من صحّته هو
  for (const m of alive) {
    if (def(m.defId).ability !== 'overheat') continue;
    if (!p.field.some((x) => x.uid === m.uid)) continue;
    damageMonster(s, side, m, KEYWORD_VALUES.overheatSelf, { source: 'poison' });
    log(s, 'attack', side, 'ability_overheat', {
      card: def(m.defId).id,
      amount: KEYWORD_VALUES.overheatDamage,
    });
  }

  /*
    انسحاب: يهاجم ثم يفلت من الردّ — لا يُستهدَف حتى يبدأ دورك.
    كان يعود إلى اليد، فكان يفكّك ساحة صاحبه بنفسه: قياسُ العناصر أعطى
    الريح 29.8% وخسارةً أمام الخمسة كلّها، ونصفُ وحوشها يحمل هذه الكلمة.
  */
  for (const m of alive) {
    if (def(m.defId).ability !== 'mobility') continue;
    if (!p.field.some((x) => x.uid === m.uid)) continue;
    m.evasive = true;
    log(s, 'attack', side, 'ability_mobility', { card: def(m.defId).id });
  }

  checkDeath(s);
}

// ===================== الوحش الأعظم =====================

export function canSummonTitan(s: GameState, side: Seat): Playability {
  if (s.phase !== 'main' || s.current !== side) return { ok: false, reason: 'not_your_turn' };
  const p = s.players[side];
  if (p.fragments.length < TITAN.fragmentsNeeded)
    return {
      ok: false,
      reason: 'need_fragments',
    };
  if (p.energy < TITAN.cost) return { ok: false, reason: 'need_energy' };
  return { ok: true };
}

// ===================== التجهيز والطقس =====================

/**
 * التجهيز والطقس يُنفقان من **مخزون ثابت** لا من السطح، ولذلك لا يمرّان
 * بـ`canPlayCard`: لا يد ولا مطابقة تدفّق ولا خانة ساحة — تكلفةُ طاقةٍ
 * ومخزونٌ وهدفٌ صالح فقط.
 */
export function canEquip(
  s: GameState,
  side: Seat,
  gear: GearId,
  targetUid: string
): Playability {
  if (s.phase !== 'main' || s.current !== side) return { ok: false, reason: 'not_your_turn' };
  const p = s.players[side];
  const g = GEAR_BY_ID[gear];
  if (!g) return { ok: false, reason: 'unknown_gear' };
  if ((p.gearStock?.[gear] ?? 0) <= 0) return { ok: false, reason: 'out_of_stock' };
  const m = p.field.find((x) => x.uid === targetUid);
  if (!m) return { ok: false, reason: 'no_own_monster' };
  if (g.onlyElement && def(m.defId).element !== g.onlyElement)
    return { ok: false, reason: 'gear_wrong_element' };
  if (hasGear(m, gear)) return { ok: false, reason: 'gear_duplicate' };
  // الطاقة آخر ما يُفحص: نقصُها حالٌ يزول بعد دور، أمّا العنصر الخطأ
  // والتكرار فمانعان دائمان — وإظهار المانع الزائل يخفي الباقي.
  if (p.energy < g.cost) return { ok: false, reason: 'not_enough_energy' };
  return { ok: true };
}

/** `weather: null` تعني الانقشاع — إزاحة الطقس القائم بثمن ثابت */
export function canActivateWeather(
  s: GameState,
  side: Seat,
  weather: WeatherId | null
): Playability {
  if (s.phase !== 'main' || s.current !== side) return { ok: false, reason: 'not_your_turn' };
  const p = s.players[side];
  if (weather === null) {
    if (!s.weather) return { ok: false, reason: 'no_weather' };
    if (p.energy < WEATHER_DISPEL_COST) return { ok: false, reason: 'not_enough_energy' };
    return { ok: true };
  }
  const w = WEATHER_BY_ID[weather];
  if (!w) return { ok: false, reason: 'unknown_weather' };
  if (s.weather === weather) return { ok: false, reason: 'weather_already' };
  if ((p.weatherStock?.[weather] ?? 0) <= 0) return { ok: false, reason: 'out_of_stock' };
  if (p.energy < w.cost) return { ok: false, reason: 'not_enough_energy' };
  return { ok: true };
}

function doEquip(s: GameState, side: Seat, gear: GearId, targetUid: string) {
  if (!canEquip(s, side, gear, targetUid).ok) return;
  const p = s.players[side];
  const g = GEAR_BY_ID[gear];
  const m = p.field.find((x) => x.uid === targetUid)!;
  p.energy -= g.cost;
  p.gearStock[gear] -= 1;
  m.gear = [...(m.gear ?? []), gear];
  // «جوهرة السرعة» تعني أن يتصرّف الآن، فترفع عنه حداثة الاستدعاء فوراً
  if (gear === 'speed_jewel' && m.sick) {
    m.sick = false;
    log(s, 'play', side, 'gear_haste', { card: def(m.defId).id });
  }
  log(s, 'play', side, 'gear_equipped', { player: p.name, gear, card: def(m.defId).id });
}

function doWeather(s: GameState, side: Seat, weather: WeatherId | null) {
  if (!canActivateWeather(s, side, weather).ok) return;
  const p = s.players[side];
  if (weather === null) {
    const gone = s.weather!;
    p.energy -= WEATHER_DISPEL_COST;
    s.weather = null;
    log(s, 'system', side, 'weather_dispelled', { player: p.name, weather: gone });
    return;
  }
  const w = WEATHER_BY_ID[weather];
  p.energy -= w.cost;
  p.weatherStock[weather] -= 1;
  const previous = s.weather;
  s.weather = weather;
  // واحدٌ فقط يعمل: الجديد يزيح القديم، وذلك يُعلَن كي لا يبدو أنه ضاع سُدى
  if (previous && previous !== weather) {
    log(s, 'system', side, 'weather_replaced', { weather: previous });
  }
  log(s, 'system', side, 'weather_set', { player: p.name, weather });
}

// ===================== نقطة الدخول =====================

export function applyGameAction(state: GameState, action: GameAction): GameState {
  const s = clone(state);
  if (s.phase === 'ended') return s;
  const side = s.current;
  const p = s.players[side];

  switch (action.type) {
    case 'PLAY':
      doPlay(s, action);
      break;

    case 'EQUIP':
      doEquip(s, side, action.gear, action.targetUid);
      break;

    case 'WEATHER':
      doWeather(s, side, action.weather);
      break;

    case 'DRAW': {
      /*
        سحبٌ إضافي مرة واحدة في كل دور — **حتى لو كان في اليد ما يُلعب**.
        كان مشروطاً بتعذّر اللعب، فصار زرّاً لا يُرى إلا في الأدوار الميتة،
        ويُعاقَب اللاعب الذي يملك خياراً واحداً ضعيفاً بحرمانه من البحث عن
        أفضل منه. السحب لا يُنهي الدور.
      */
      if (s.phase !== 'main') break;
      if (p.extraDrawUsed) break;
      p.extraDrawUsed = true;
      drawCards(s, side, 1);
      break;
    }

    case 'ACCEPT_DRAW': {
      if (s.phase !== 'respond') break;
      const n = s.pendingDraw;
      s.pendingDraw = 0;
      s.phase = 'main';
      drawCards(s, side, n);
      log(s, 'system', side, 'accept_draw', { player: p.name, n });
      if (!isEnded(s)) endTurn(s);
      break;
    }

    case 'ATTACK':
      doAttack(s, action);
      break;

    case 'SUMMON_TITAN': {
      const chk = canSummonTitan(s, side);
      if (!chk.ok) break;
      p.energy -= TITAN.cost;
      log(s, 'play', side, 'titan_summon', { player: p.name, titan: 'titan' });
      endGame(s, side, { key: 'reason_titan', params: { titan: 'titan' } });
      break;
    }

    case 'PICK_REVEAL': {
      if (!s.reveal || s.reveal.side !== side) break;
      const idx = p.deck.findIndex((c) => c.uid === action.uid);
      if (idx >= 0 && s.reveal.cards.some((c) => c.uid === action.uid)) {
        p.hand.push(p.deck.splice(idx, 1)[0]);
        log(s, 'play', side, 'pick_reveal', { player: p.name });
      }
      s.reveal = null;
      break;
    }

    case 'END_TURN': {
      if (s.phase !== 'main') break;
      endTurn(s);
      break;
    }
  }

  if (!isEnded(s) && s.players[s.current]?.hp <= 0) {
    endTurn(s);
  }

  return s;
}

export { ELEMENTS, ELEMENT_NAME, TITAN };
