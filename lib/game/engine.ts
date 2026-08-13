import { def, ELEMENTS, ELEMENT_NAME, TITAN } from './cards';
import { CATALOG } from './cards';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from './difficulty';
import { curveShuffle, makeSeed, randomInt, shuffle } from './rng';
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
   * حسم تكلفة الوحوش في منحنى السطح. الوحوش جوهر اللعب (60% من السطح) لكن
   * أرخصها بتكلفة 2، بينما هناك 42 بطاقة حركة/فخ بتكلفة 0–1. بلا هذا الحسم
   * يغوص كل وحش تحت تلك الرخيصة فتمتلئ اليد الافتتاحية بالأفخاخ والحركات.
   * الحسم يجعل وحشاً بتكلفة 2 ينافس بطاقة بتكلفة 1 فتتداخل الوحوش مع الرخيص.
   * 1.0 يوازن بين «وحوش كثيرة» و«ورق تكفيه الطاقة مبكّراً». مضبوطة بـcheck:curve.
   */
  MONSTER_CURVE_BONUS: 1.0,
  /** أقل عدد وحوش مضمون في اليد الافتتاحية — شبكة أمان لليد التعيسة */
  OPENING_MONSTER_FLOOR: 2,
  MAX_FIELD: 4,
  MAX_TRAPS: 3,
  FATIGUE_DAMAGE: 2,
  COMBO_BONUS_PER_EXTRA: 2,
};

// ===================== أدوات مساعدة =====================

let uidCounter = 0;
function makeUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function log(
  s: GameState,
  kind: LogEntry['kind'],
  side: 0 | 1 | null,
  key: string,
  params?: LogParams
) {
  s.log.push({ turn: s.turn, side, kind, key, params });
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

export function opponentOf(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
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

function buildDeck(): CardInstance[] {
  const cards: CardInstance[] = [];
  for (const d of CATALOG) {
    for (let i = 0; i < d.copies; i++) {
      cards.push({ uid: makeUid('c'), defId: d.id });
    }
  }
  return cards;
}

/**
 * شبكة أمان لليد الافتتاحية: تضمن حداً أدنى من الوحوش. المنحنى يحسّن المتوسط
 * لكن يبقى ذيلٌ تعيس (يدٌ بلا وحش) نادر لكنه محبِط. هنا نبدّل أرخص وحش في
 * السطح بأول بطاقة غير وحش في اليد، فلا يتغيّر مجموع الـ200 ولا تتكرّر بطاقة،
 * والوحش المسحوب هو الأرخص (السطح مرتّب بالمنحنى) فيبقى ميسور اللعب مبكّراً.
 */
function ensureOpeningMonsters(s: GameState, side: 0 | 1, floor: number): void {
  const hand = s.players[side].hand;
  const isMonster = (c: CardInstance) => def(c.defId).kind === 'monster';
  let have = hand.filter(isMonster).length;
  while (have < floor) {
    const deckMonsterIdx = s.deck.findIndex(isMonster);
    const handSwapIdx = hand.findIndex((c) => !isMonster(c));
    // لا وحوش متبقّية في السطح أو اليد كلها وحوش أصلاً — لا شيء نبدّله
    if (deckMonsterIdx < 0 || handSwapIdx < 0) break;
    const monster = s.deck.splice(deckMonsterIdx, 1)[0];
    // البطاقة المُخرَجة تأخذ مكان الوحش فيبقى السطح على ترتيب المنحنى
    s.deck.splice(deckMonsterIdx, 0, hand[handSwapIdx]);
    hand[handSwapIdx] = monster;
    have++;
  }
}

function newPlayer(id: string, name: string, isAI: boolean): PlayerState {
  return {
    id,
    name,
    isAI,
    hp: RULES.START_HP,
    maxHp: RULES.START_HP,
    energy: 0,
    energyCap: RULES.START_ENERGY_CAP - 1,
    maxEnergyCap: RULES.MAX_ENERGY_CAP,
    bonusEnergy: 0,
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
  script?: GameScript;
  difficulty?: Difficulty;
  /** من يبدأ: 0 أو 1، أو قرعة عشوائية (الوضع الافتراضي) */
  firstPlayer?: 0 | 1 | 'random';
  /** لضبط منحنى السطح في أدوات القياس فقط */
  curveSpread?: number;
  /** لتجربة دوال وزن مختلفة في أدوات القياس فقط */
  curveWeight?: (c: CardInstance) => number;
}): GameState {
  const seed = opts?.seed ?? makeSeed();
  // السطح مرتَّب بمنحنى تكلفة لا خلطاً أعمى، فتوافق الكروتُ الطاقةَ المتصاعدة
  const [deck, rngAfterShuffle] = curveShuffle(
    buildDeck(),
    opts?.curveWeight ?? curveWeightOf,
    opts?.curveSpread ?? RULES.DECK_CURVE_SPREAD,
    seed
  );
  const difficulty = opts?.difficulty ?? DEFAULT_DIFFICULTY;
  const level = DIFFICULTIES[difficulty];

  const s: GameState = {
    seed,
    rng: rngAfterShuffle,
    difficulty,
    turn: 0,
    current: 0,
    phase: 'main',
    winner: null,
    winReason: null,
    deck,
    discard: [],
    flow: { element: 'fire', number: null, defId: null },
    pendingDraw: 0,
    players: [
      newPlayer('p0', opts?.playerName ?? '@you', false),
      newPlayer('p1', opts?.opponentName ?? '@opponent', opts?.opponentIsAI ?? true),
    ],
    log: [],
    reveal: null,
  };

  // مستوى الصعوبة يضبط الخصم وحده — اللاعب لا يُمَسّ
  s.players[1].hp = level.aiHp;
  s.players[1].maxHp = level.aiHp;
  s.players[1].maxEnergyCap = level.aiMaxEnergyCap;

  // قرعة البداية — الافتراضي عشوائي حتى لا يبدأ اللاعب نفسه كل مرة
  if (opts?.firstPlayer === 0 || opts?.firstPlayer === 1) {
    s.current = opts.firstPlayer;
  } else if (opts?.script) {
    // توزيع مُعدّ مسبقاً يعني درساً ثابتاً، فلا قرعة فيه
    s.current = 0;
  } else {
    const [coin, rng] = randomInt(s.rng, 2);
    s.rng = rng;
    s.current = coin === 0 ? 0 : 1;
  }
  const first = s.current;
  const second = opponentOf(first);

  if (opts?.script) {
    applyScript(s, opts.script);
  } else {
    // توزيع البداية: 5 كروت لكل لاعب، بدءاً بالبادئ
    for (let i = 0; i < RULES.START_HAND; i++) {
      for (const p of [first, second]) {
        drawCards(s, p, 1, true);
      }
    }
    // تعويض من يلعب ثانياً: كارت إضافي، ومن يبدأ لا يسحب في دوره الأول
    drawCards(s, second, RULES.SECOND_PLAYER_BONUS_CARDS, true);
    // طاقة إضافية لمرة واحدة (بداية دوره الأول) — bonusEnergy يُستهلك ثم يُصفَّر
    s.players[second].bonusEnergy += RULES.SECOND_PLAYER_BONUS_ENERGY;

    // ضمان حدٍّ أدنى من الوحوش لكلا اللاعبين — عدل ومتّسق
    for (const p of [first, second]) {
      ensureOpeningMonsters(s, p, RULES.OPENING_MONSTER_FLOOR);
    }

    // كارت البداية على طابور التدفق: أول كارت غير بري وغير قطعة
    let starter: CardInstance | undefined;
    const skipped: CardInstance[] = [];
    while (s.deck.length) {
      const c = s.deck.shift()!;
      const d = def(c.defId);
      if (d.element !== 'wild' && d.kind !== 'fragment' && d.number !== null && d.number < 10) {
        starter = c;
        break;
      }
      skipped.push(c);
    }
    s.deck.push(...skipped);
    if (starter) {
      const d = def(starter.defId);
      s.flow = { element: d.element as PlayableElement, number: d.number, defId: d.id };
      s.discard.push(starter);
    }
  }

  log(s, 'system', null, 'match_start', { deck: s.deck.length });
  log(s, 'system', null, 'coin_toss', {
    first: s.players[first].name,
    second: s.players[second].name,
  });
  beginTurn(s);
  return s;
}

/** يوزّع الكروت المطلوبة بسحبها من السطح نفسه، فلا يتغيّر مجموع الـ200 */
function applyScript(s: GameState, script: GameScript) {
  // خطأ في المعرّف أو طلب نسخ أكثر من الموجود في السطح خطأ برمجي، لا حالة تُتجاهل
  const take = (defId: string): CardInstance => {
    const i = s.deck.findIndex((c) => c.defId === defId);
    if (i < 0) throw new Error(`توزيع غير صالح: لا توجد نسخة متاحة من «${defId}»`);
    return s.deck.splice(i, 1)[0];
  };

  for (const side of [0, 1] as const) {
    for (const id of script.hands?.[side] ?? []) {
      s.players[side].hand.push(take(id));
    }
    for (const id of script.fields?.[side] ?? []) {
      const inst = take(id);
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
    const inst = take(script.flow);
    const d = def(inst.defId);
    s.flow = { element: d.element as PlayableElement, number: d.number, defId: d.id };
    s.discard.push(inst);
  }
}

// ===================== السحب =====================

function refillDeck(s: GameState): boolean {
  if (s.deck.length > 0) return true;
  // أعِد خلط المهملات ما عدا الكارت العلوي في طابور التدفق
  const top = s.discard.length ? s.discard[s.discard.length - 1] : null;
  const pool = top ? s.discard.slice(0, -1) : s.discard.slice();
  if (pool.length === 0) return false;
  const [shuffled, rng] = shuffle(pool, s.rng);
  s.rng = rng;
  s.deck = shuffled;
  s.discard = top ? [top] : [];
  log(s, 'system', null, 'deck_reshuffled');
  return true;
}

function drawCards(s: GameState, side: 0 | 1, n: number, silent = false): number {
  const p = s.players[side];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!refillDeck(s)) {
      // إنهاك: لا كروت متبقية إطلاقاً
      p.hp -= RULES.FATIGUE_DAMAGE;
      log(s, 'system', side, 'fatigue', { player: p.name, damage: RULES.FATIGUE_DAMAGE });
      checkDeath(s);
      continue;
    }
    p.hand.push(s.deck.shift()!);
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
  side: 0 | 1,
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
  if (d.needsTarget === 'enemy_monster' && s.players[opponentOf(side)].field.length === 0)
    return { ok: false, reason: 'no_enemy_monster' };
  if (d.needsTarget === 'enemy_trap' && s.players[opponentOf(side)].traps.length === 0)
    return { ok: false, reason: 'no_enemy_traps' };
  if (d.needsTarget === 'discard_monster' && !s.discard.some((c) => def(c.defId).kind === 'monster'))
    return { ok: false, reason: 'no_discard_monster' };

  return { ok: true };
}

export function hasAnyPlayable(s: GameState, side: 0 | 1): boolean {
  return s.players[side].hand.some((c) => canPlayCard(s, side, c.uid).ok);
}

// ===================== الفخاخ =====================

function triggerTraps(
  s: GameState,
  ownerIdx: 0 | 1,
  timing: 'opponent_turn_start' | 'opponent_attack' | 'opponent_summon',
  ctx: { summonedUid?: string; attackerUid?: string } = {}
) {
  const owner = s.players[ownerIdx];
  const foeIdx = opponentOf(ownerIdx);
  const foe = s.players[foeIdx];

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
          s.discard.push(foe.hand.splice(idx, 1)[0]);
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
        // تعود القطعة إلى دورة السطح ليتمكّن أي لاعب من إيجادها مجدداً
        s.discard.push({ uid: makeUid('c'), defId: `frag_${lost}` });
        log(s, 'trap', ownerIdx, 'trap_relic_break', { fragment: lost });
        break;
      }
      default:
        fired = false;
    }

    if (fired) {
      owner.traps.splice(i, 1);
      s.discard.push(t);
      // فخ واحد فقط لكل حدث
      return;
    }
  }
}

// ===================== الضرر والموت =====================

function damageMonster(
  s: GameState,
  ownerIdx: 0 | 1,
  m: FieldMonster,
  amount: number
): number {
  const d = def(m.defId);
  const reduced = d.ability === 'guard' ? Math.max(0, amount - 1) : amount;
  // الخصائص الصامتة تبدو معطّلة للاعب، فتُعلن عن نفسها في السجل
  if (d.ability === 'guard' && amount > 0) {
    log(s, 'attack', ownerIdx, 'ability_guard', { card: d.id, amount: amount - reduced });
  }
  const dealt = Math.min(reduced, m.hp);
  m.hp -= reduced;
  if (m.hp <= 0) {
    const p = s.players[ownerIdx];
    p.field = p.field.filter((x) => x.uid !== m.uid);
    s.discard.push({ uid: m.uid, defId: m.defId });
    log(s, 'attack', ownerIdx, 'monster_fell', { card: d.id });
  }
  return dealt;
}

function damagePlayer(s: GameState, side: 0 | 1, amount: number) {
  const p = s.players[side];
  p.hp = Math.max(0, p.hp - amount);
  checkDeath(s);
}

function checkDeath(s: GameState) {
  if (s.phase === 'ended') return;
  for (const i of [0, 1] as const) {
    if (s.players[i].hp <= 0) {
      endGame(s, opponentOf(i), { key: 'reason_hp', params: { loser: s.players[i].name } });
      return;
    }
  }
}

function endGame(s: GameState, winner: 0 | 1, outcome: GameOutcome) {
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

function beginTurn(s: GameState) {
  if (s.phase === 'ended') return;
  const idx = s.current;
  const p = s.players[idx];
  s.turn += 1;

  p.energyCap = Math.min(p.maxEnergyCap, p.energyCap + 1);
  const chargeBonus = p.field.filter((m) => def(m.defId).ability === 'charge').length;
  p.energy = p.energyCap + chargeBonus + p.bonusEnergy;
  p.bonusEnergy = 0;
  if (chargeBonus > 0) {
    log(s, 'system', idx, 'ability_charge', { amount: chargeBonus, n: chargeBonus });
  }
  p.attackLocked = false;
  p.comboUsed = false;
  p.amplified = false;
  p.extraDrawUsed = false;
  for (const m of p.field) {
    m.exhausted = false;
    m.sick = false;
  }

  log(s, 'system', idx, 'turn_start', { player: p.name, energy: p.energy, cap: p.energyCap });

  // فخاخ الخصم التي تنطلق مع بداية دورك
  triggerTraps(s, opponentOf(idx), 'opponent_turn_start');
  if (isEnded(s)) return;

  if (p.skipNext) {
    p.skipNext = false;
    log(s, 'system', idx, 'turn_lost', { player: p.name });
    endTurn(s);
    return;
  }

  if (s.pendingDraw > 0) {
    s.phase = 'respond';
    log(s, 'system', idx, 'pending_draw', { n: s.pendingDraw });
    return;
  }

  s.phase = 'main';
  // البادئ لا يسحب في دوره الأول — تعويض إضافي للاعب الثاني
  if (s.turn > 1) drawCards(s, idx, 1);
}

function endTurn(s: GameState) {
  if (s.phase === 'ended') return;
  s.reveal = null;
  s.current = opponentOf(s.current);
  beginTurn(s);
}

// ===================== لعب الكروت =====================

function playMonster(s: GameState, side: 0 | 1, d: CardDef, inst: CardInstance) {
  const p = s.players[side];
  const m: FieldMonster = {
    uid: inst.uid,
    defId: d.id,
    atk: d.atk!,
    hp: d.hp!,
    maxHp: d.hp!,
    exhausted: false,
    sick: d.ability !== 'rush',
  };
  p.field.push(m);
  log(s, 'play', side, 'summoned', { player: p.name, card: d.id, atk: d.atk!, hp: d.hp! });
  if (d.ability === 'rush') {
    log(s, 'play', side, 'ability_rush', { card: d.id });
  }
  if (d.ability === 'scout') {
    log(s, 'play', side, 'ability_scout', { card: d.id });
    drawCards(s, side, 1, true);
  }
  triggerTraps(s, opponentOf(side), 'opponent_summon', { summonedUid: m.uid });
}

function applySpell(
  s: GameState,
  side: 0 | 1,
  d: CardDef,
  targetUid?: string
) {
  const p = s.players[side];
  const foeIdx = opponentOf(side);
  const foe = s.players[foeIdx];

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
      const targets = foe.field.slice();
      for (const m of targets) damageMonster(s, foeIdx, m, 3);
      log(s, 'play', side, 'storm', { player: foe.name, amount: 3 });
      break;
    }
    case 'surge':
      p.energy += 3;
      log(s, 'play', side, 'gained_energy', { player: p.name, amount: 3, energy: p.energy });
      break;
    case 'search': {
      refillDeck(s);
      const cards = s.deck.slice(0, 5);
      if (cards.length) {
        s.reveal = { side, cards };
        log(s, 'play', side, 'search_revealed', { n: cards.length });
      }
      break;
    }
    case 'swap': {
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
        ? s.discard.findIndex((c) => c.uid === targetUid)
        : s.discard.findIndex((c) => def(c.defId).kind === 'monster');
      if (idx >= 0) {
        const inst = s.discard.splice(idx, 1)[0];
        const md = def(inst.defId);
        p.field.push({
          uid: inst.uid,
          defId: md.id,
          atk: md.atk!,
          hp: md.hp!,
          maxHp: md.hp!,
          exhausted: false,
          sick: md.ability !== 'rush',
        });
        log(s, 'play', side, 'revived', { card: md.id });
      }
      break;
    }
    case 'purge': {
      const i = targetUid ? foe.traps.findIndex((t) => t.uid === targetUid) : 0;
      if (i >= 0 && foe.traps.length) {
        const t = foe.traps.splice(i, 1)[0];
        s.discard.push(t);
        log(s, 'play', side, 'purged', { player: foe.name });
      }
      break;
    }
  }
}

function applyAction(s: GameState, side: 0 | 1, d: CardDef) {
  const foeIdx = opponentOf(side);
  const foe = s.players[foeIdx];
  const p = s.players[side];

  switch (d.action) {
    case 'skip':
      foe.skipNext = true;
      log(s, 'play', side, 'skip_next', { player: foe.name });
      break;
    case 'reverse':
      foe.skipNext = true;
      drawCards(s, side, 1);
      log(s, 'play', side, 'reverse', { foe: foe.name, player: p.name });
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
      s.discard.push(inst);
      break;
    case 'spell':
      log(s, 'play', side, 'played', { player: p.name, card: d.id });
      applySpell(s, side, d, action.targetUid);
      s.discard.push(inst);
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
  if (p.hand.length === 0 && s.deck.length === 0 && s.discard.length <= 1) {
    endGame(s, side, { key: 'reason_empty_hand' });
  }
}

// ===================== القتال =====================

export interface ComboCheck {
  ok: boolean;
  reason?: string;
  damage: number;
}

export function evaluateAttack(
  s: GameState,
  side: 0 | 1,
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

  let damage = monsters.reduce((n, m) => n + m.atk, 0);

  if (monsters.length > 1) {
    if (p.comboUsed) return { ok: false, reason: 'combo_used', damage: 0 };
    const defs = monsters.map((m) => def(m.defId));
    const hasLink = defs.some((d) => d.ability === 'link');
    const sameElement = defs.every((d) => d.element === defs[0].element);
    const sameNumber = defs.every((d) => d.number !== null && d.number === defs[0].number);
    if (!hasLink && !sameElement && !sameNumber)
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

function doAttack(s: GameState, action: Extract<GameAction, { type: 'ATTACK' }>) {
  const side = s.current;
  const check = evaluateAttack(s, side, action.attackers);
  if (!check.ok) return;

  const p = s.players[side];
  const foeIdx = opponentOf(side);
  const foe = s.players[foeIdx];

  if (action.target === 'face' && foe.field.length > 0) return;
  const targetMonster =
    action.target === 'face' ? null : foe.field.find((m) => m.uid === action.target);
  if (action.target !== 'face' && !targetMonster) return;

  const monsters = action.attackers.map((u) => p.field.find((m) => m.uid === u)!);
  const isCombo = monsters.length > 1;
  const names = monsters.map((m) => m.defId).join('|');

  for (const m of monsters) m.exhausted = true;
  if (isCombo) {
    p.comboUsed = true;
    p.amplified = false;
  }

  // فخاخ دفاعية للخصم
  triggerTraps(s, foeIdx, 'opponent_attack', { attackerUid: monsters[0].uid });
  if (s.phase === 'ended') return;

  if (foe.barrier) {
    foe.barrier = false;
    log(s, 'attack', side, 'attack_blocked', { names });
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
    log(s, 'attack', side, 'attack_failed');
    return;
  }
  if (alive.length !== monsters.length) {
    damage = alive.reduce((n, m) => n + m.atk, 0) + (alive.length > 1 ? RULES.COMBO_BONUS_PER_EXTRA * (alive.length - 1) : 0);
  }

  const attackerDefs = alive.map((m) => def(m.defId));

  if (!targetMonster) {
    damagePlayer(s, foeIdx, damage);
    log(s, 'attack', side, isCombo ? 'combo_face' : 'attack_face', {
      names,
      player: foe.name,
      damage,
    });
  } else {
    const before = targetMonster.hp;
    const dealt = damageMonster(s, foeIdx, targetMonster, damage);
    const tDef = def(targetMonster.defId);
    log(s, 'attack', side, isCombo ? 'combo_monster' : 'attack_monster', {
      names,
      card: tDef.id,
      damage,
    });
    // اختراق
    const overflow = damage - (tDef.ability === 'guard' ? before + 1 : before);
    if (attackerDefs.some((d) => d.ability === 'pierce') && overflow > 0) {
      damagePlayer(s, foeIdx, overflow);
      log(s, 'attack', side, 'pierce_extra', { amount: overflow, player: foe.name });
    }
    // سُم المدافع
    if (tDef.ability === 'venom') {
      for (const m of alive) {
        if (p.field.some((x) => x.uid === m.uid)) damageMonster(s, side, m, 1);
      }
      log(s, 'attack', foeIdx, 'venom_bite', { card: tDef.id, amount: 1 });
    }
    void dealt;
  }

  // امتصاص
  if (attackerDefs.some((d) => d.ability === 'drain')) {
    const healed = Math.ceil(damage / 2);
    p.hp = Math.min(p.maxHp, p.hp + healed);
    log(s, 'attack', side, 'drain_heal', { player: p.name, amount: healed });
  }

  checkDeath(s);
}

// ===================== الوحش الأعظم =====================

export function canSummonTitan(s: GameState, side: 0 | 1): Playability {
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

    case 'DRAW': {
      // سحب إنقاذ: مرة واحدة في الدور وفقط عند تعذّر لعب أي كارت
      if (s.phase !== 'main') break;
      if (p.extraDrawUsed || hasAnyPlayable(s, side)) break;
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
      const idx = s.deck.findIndex((c) => c.uid === action.uid);
      if (idx >= 0 && s.reveal.cards.some((c) => c.uid === action.uid)) {
        p.hand.push(s.deck.splice(idx, 1)[0]);
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

  return s;
}

export { ELEMENTS, ELEMENT_NAME, TITAN };
