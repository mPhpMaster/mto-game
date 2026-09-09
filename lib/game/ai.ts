import { def } from './cards';
import { DIFFICULTIES } from './difficulty';
import {
  applyGameAction,
  canActivateWeather,
  canEquip,
  canPlayCard,
  canSummonTitan,
  evaluateAttack,
  hasAnyPlayable,
  opponentsOf,
  RULES,
} from './engine';
import {
  GEAR,
  WEATHER,
  WEATHER_DISPEL_COST,
  type GearDef,
  type WeatherDef,
} from './loadout';
import { nextRandom } from './rng';
import type { CardDef, FieldMonster, GameAction, GameState, PlayableElement, Seat } from './types';

const level = (s: GameState) => DIFFICULTIES[s.difficulty];

/**
 * عشوائية مشتقّة من الحالة دون تعديلها — تبقى `aiChooseAction` دالة خالصة،
 * وتتغيّر القيمة مع كل تغيّر في الحالة فلا تعلق على نفس القرار.
 */
function aiRandom(s: GameState, salt: number): number {
  const p = s.players[s.current];
  const mix =
    (s.rng ^
      (s.turn * 2654435761) ^
      (salt * 40503) ^
      (p.hand.length * 97) ^
      (p.energy * 1031) ^
      (p.field.length * 131)) |
    0;
  return nextRandom(mix)[0];
}

/** يختار الأفضل عادةً، وأحياناً حركة أضعف بحسب مستوى الصعوبة */
function pickMaybeMistake<T>(s: GameState, sorted: T[], salt: number): T {
  const chance = level(s).mistakeChance;
  if (sorted.length < 2 || chance <= 0) return sorted[0];
  if (aiRandom(s, salt) >= chance) return sorted[0];
  const idx = 1 + Math.floor(aiRandom(s, salt + 977) * (sorted.length - 1));
  return sorted[Math.min(idx, sorted.length - 1)];
}

/** العنصر الأكثر تكراراً في يد اللاعب — يُستخدم لاختيار عنصر الكارت البري */
function bestElement(s: GameState, side: Seat): PlayableElement {
  const counts: Record<string, number> = {};
  for (const c of s.players[side].hand) {
    const d = def(c.defId);
    if (d.element !== 'wild') counts[d.element] = (counts[d.element] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as PlayableElement) ?? 'fire';
}

function isTurnEnding(d: CardDef): boolean {
  return (
    d.kind === 'action' &&
    (d.action === 'skip' || d.action === 'reverse' || d.action === 'draw2' || d.action === 'wild4')
  );
}

function scoreCard(s: GameState, side: Seat, d: CardDef): number {
  const me = s.players[side];
  const foes = opponentsOf(s, side).map((i) => s.players[i]);
  const foeField = foes.reduce((n, f) => n + f.field.length, 0);
  const foeTraps = foes.reduce((n, f) => n + f.traps.length, 0);

  const cfg = level(s);

  switch (d.kind) {
    case 'fragment':
      return 1000 * cfg.fragmentWeight;
    case 'monster': {
      let v = 60 + d.atk! * 3 + d.hp! * 2 - d.cost * 3;
      if (d.ability === 'rush') v += 12;
      if (d.ability === 'charge') v += 8;
      if (me.field.length === 0) v += 25; // نحتاج مدافعاً
      return v;
    }
    case 'trap':
      return me.traps.length < 2 ? 55 : 20;
    case 'spell':
      switch (d.spell) {
        case 'heal':
          return me.hp <= 16 ? 210 : 15;
        case 'storm':
          return foeField >= 2 ? 190 : foeField === 1 ? 70 : 5;
        case 'surge':
          return 95;
        case 'boost':
          return me.field.length ? 80 : 0;
        case 'swap':
          return foeField ? 85 : 0;
        case 'revive':
          return 105;
        case 'purge':
          return foeTraps ? 90 : 0;
        case 'amplify':
          return me.field.filter((m) => !m.sick && !m.exhausted).length >= 2 ? 100 : 10;
        case 'search':
          return 60;

        // --- الموجة الثانية ---
        // الإزالة الموجَّهة تُقيَّم بوجود هدف، وإلا فهي بطاقة ميتة
        case 'banish':
          return foeField ? 200 : 0;
        case 'strike':
          return foeField ? 150 : 0;
        case 'chain_lightning':
          return foeField >= 2 ? 185 : foeField === 1 ? 75 : 20;
        // الضرر المباشر يقفز حين يُنهي المباراة
        case 'bolt':
          return foes.some((f) => f.hp <= 3) ? 400 : 70;
        case 'drain_life':
          return foes.some((f) => f.hp <= 3) ? 400 : me.hp <= 16 ? 150 : 85;
        case 'second_wind':
          return me.field.filter((m) => m.exhausted || m.sick).length >= 2 ? 140 : 15;
        case 'rally':
          return me.field.length >= 2 ? 110 : me.field.length ? 40 : 0;
        case 'shield_wall':
          return me.field.length >= 2 ? 90 : me.field.length ? 35 : 0;
        case 'overload':
          return me.field.length ? 95 : 0;
        case 'graft':
          return me.field.some((m) => m.hp < m.maxHp) ? 100 : me.field.length ? 25 : 0;
        case 'mirror_image':
          return me.field.length && me.field.length < RULES.MAX_FIELD ? 90 : 0;
        // القطع طريق فوز كامل، فوزنها يتبع سعي المستوى إليها
        case 'titan_call':
          return 300 * cfg.fragmentWeight;
        case 'mana_well':
          return 85;
        case 'foresight':
          return me.hand.length <= 3 ? 120 : 65;
        case 'recall':
          return 70;
        // الدفاع يستحقّ حين يوجد ما يُهاجَم به
        case 'barricade':
          return foeField ? 80 : 10;
        case 'reflect':
          return foeField ? 75 : 10;
        case 'cleanse':
          return me.skipNext || me.attackLocked ? 130 : 20;

        default:
          return 30;
      }
    case 'action':
      // كروت التعطيل أكثر ما يُحبط اللاعب، فيُخفَّض وزنها في المستويات السهلة
      switch (d.action) {
        case 'wild4':
          return 150 * cfg.denialWeight;
        case 'draw2':
          return 140 * cfg.denialWeight;
        case 'skip':
          return 130 * cfg.denialWeight;
        case 'reverse':
          return 120 * cfg.denialWeight;
        case 'wild':
          return hasAnyPlayable(s, side) ? 10 : 40;
        default:
          return 30;
      }
  }
  return 0;
}

// ===================== التجهيزات والطقس =====================

/**
 * الطاقة التي يجب ألا يمسّها التحضير: ثمن أرخص وحشٍ في اليد.
 *
 * بدونها ينفق الخصم طاقته على درعٍ ثم لا يجد ما يستدعي به، فيقف بساحةٍ
 * خالية وهو «متقن» — وهذا أسوأ من ألّا يستعمل الطبقة أصلاً.
 */
function reservedEnergy(s: GameState, side: Seat): number {
  const me = s.players[side];
  if (me.field.length >= RULES.MAX_FIELD) return 0;
  let cheapest = Infinity;
  for (const c of me.hand) {
    const d = def(c.defId);
    if (d.kind === 'monster' && canPlayCard(s, side, c.uid).ok) cheapest = Math.min(cheapest, d.cost);
  }
  return Number.isFinite(cheapest) ? cheapest : 0;
}

function scoreGear(s: GameState, side: Seat, g: GearDef, m: FieldMonster): number {
  const foes = opponentsOf(s, side).map((i) => s.players[i]);
  const foeMonsters = foes.flatMap((f) => f.field);
  const foeTopAtk = foeMonsters.reduce((n, x) => Math.max(n, x.atk), 0);

  switch (g.id) {
    case 'lightning_blade':
      // +3 واختراق: أثقل تجهيزة، وتزداد قيمةً في وحشٍ يستطيع الضرب الآن
      return 70 + m.atk * 4 + (m.sick || m.exhausted ? 0 : 25);
    case 'rock_shield':
      // الدرع يساوي ما يمنعه: بلا مهاجمٍ قادر لا يمنع شيئاً
      return foeTopAtk === 0 ? 0 : 35 + Math.min(foeTopAtk, 6) * 4 + m.atk * 3;
    case 'healing_amulet':
      return m.hp < m.maxHp ? 25 + (m.maxHp - m.hp) * 7 : 0;
    case 'speed_jewel':
      // قيمتها كلّها في وحشٍ لا يستطيع الهجوم بعد؛ وإلا فهي طاقة مهدورة
      return m.sick ? 40 + m.atk * 6 : 0;
  }
}

function scoreWeather(s: GameState, side: Seat, w: WeatherDef): number {
  const me = s.players[side];
  const foes = opponentsOf(s, side).map((i) => s.players[i]);
  const foeMonsters = foes.flatMap((f) => f.field);
  const isElectric = (m: FieldMonster) => def(m.defId).element === 'electric';

  switch (w.id) {
    case 'thunderstorm': {
      // الطقس يعمّ الساحة، فيفيد الخصم بقدر ما عنده من كهرباء أيضاً
      const mine = me.field.filter(isElectric).length;
      const theirs = foeMonsters.filter(isElectric).length;
      return mine === 0 ? 0 : 40 * mine - 35 * theirs;
    }
    case 'acid_rain':
      // ينهش الساحتين معاً، فلا ينفع إلا من كانت ساحته أخفّ
      return foeMonsters.length === 0 ? 0 : 22 * (foeMonsters.length - me.field.length);
    case 'heavy_fog': {
      // دفاعيّ: يُشترى حين يفوق هجومُ الخصم هجومي
      const theirs = foeMonsters.reduce((n, m) => n + m.atk, 0);
      const mine = me.field.reduce((n, m) => n + m.atk, 0);
      return theirs <= mine ? 0 : 18 + (theirs - mine) * 4;
    }
  }
}

/**
 * قيمة إزاحة الطقس القائم — مرآةُ `scoreWeather`.
 *
 * لا تكفي إشارة `scoreWeather` السالبة هنا: هي تعيد صفراً لطقسٍ «لا ينفعني»
 * سواءٌ كان محايداً أو ضارّاً بي. والفرق جوهري — «عاصفة رعدية» وخصمي وحده
 * يملك الكهرباء تساوي صفراً في تلك الدالّة وهي كارثة في الواقع.
 */
function scoreDispel(s: GameState, side: Seat): number {
  const w = s.weather;
  if (!w) return 0;
  const me = s.players[side];
  const foeMonsters = opponentsOf(s, side).flatMap((i) => s.players[i].field);
  const isElectric = (m: FieldMonster) => def(m.defId).element === 'electric';

  switch (w) {
    case 'thunderstorm':
      return 38 * (foeMonsters.filter(isElectric).length - me.field.filter(isElectric).length);
    case 'acid_rain':
      return 22 * (me.field.length - foeMonsters.length);
    case 'heavy_fog': {
      // الضباب يعمي الجميع، فيضرّ صاحبَ الهجوم الأقوى
      const mine = me.field.reduce((n, m) => n + m.atk, 0);
      const theirs = foeMonsters.reduce((n, m) => n + m.atk, 0);
      return mine > theirs ? 18 + (mine - theirs) * 4 : 0;
    }
  }
}

/**
 * أفضل تجهيزٍ أو طقسٍ يستحقّ الطاقة الآن، أو `null`.
 *
 * يُسأل المحرّك عن الجواز (`canEquip`/`canActivateWeather`) ولا يُعاد حسابه
 * هنا: لو رجّح الذكاءُ حركةً يرفضها المحرّك لعادت الحالة كما هي بلا سطر
 * سجلّ، فيظنّ اللعبُ التلقائي أن الدور جمد ويُنهيه.
 */
function chooseLoadout(s: GameState, side: Seat): GameAction | null {
  const cfg = level(s);
  if (cfg.loadoutWeight <= 0) return null;

  const me = s.players[side];
  const spare = me.energy - reservedEnergy(s, side);

  type Option = { action: GameAction; value: number };
  const options: Option[] = [];

  for (const g of GEAR) {
    if (g.cost > spare) continue;
    for (const m of me.field) {
      if (!canEquip(s, side, g.id, m.uid).ok) continue;
      const value = scoreGear(s, side, g, m) - g.cost * 8;
      if (value > 0) options.push({ action: { type: 'EQUIP', gear: g.id, targetUid: m.uid }, value });
    }
  }

  for (const w of WEATHER) {
    if (w.cost > spare) continue;
    if (!canActivateWeather(s, side, w.id).ok) continue;
    const value = scoreWeather(s, side, w) - w.cost * 8;
    if (value > 0) options.push({ action: { type: 'WEATHER', weather: w.id }, value });
  }

  if (WEATHER_DISPEL_COST <= spare && canActivateWeather(s, side, null).ok) {
    const value = scoreDispel(s, side) - WEATHER_DISPEL_COST * 8;
    if (value > 0) options.push({ action: { type: 'WEATHER', weather: null }, value });
  }

  if (options.length === 0) return null;
  options.sort((a, b) => b.value - a.value);
  // العتبة تمنع إنفاق الطاقة على حسنةٍ صغيرة؛ ووزن المستوى يرفعها في السهل
  if (options[0].value * cfg.loadoutWeight < 45) return null;
  return pickMaybeMistake(s, options, 83).action;
}

/** أفضل مجموعة مهاجمين: يفضّل قتل وحش خصم، ثم الضرب المباشر، ثم الدمج */
function chooseAttack(s: GameState, side: Seat): GameAction | null {
  const me = s.players[side];
  const foeSeats = opponentsOf(s, side);
  const ready = me.field.filter((m) => !m.sick && !m.exhausted);
  if (ready.length === 0 || me.attackLocked) return null;

  type Option = { action: GameAction; value: number };
  const options: Option[] = [];

  // مجموعات مرشحة: كل وحش منفرداً + مجموعات الدمج
  const groups: string[][] = ready.map((m) => [m.uid]);
  if (level(s).combo && !me.comboUsed && ready.length >= 2) {
    // كل الجاهزين معاً
    groups.push(ready.map((m) => m.uid));
    // أزواج
    for (let i = 0; i < ready.length; i++) {
      for (let j = i + 1; j < ready.length; j++) {
        groups.push([ready[i].uid, ready[j].uid]);
      }
    }
  }

  for (const g of groups) {
    const evalRes = evaluateAttack(s, side, g);
    if (!evalRes.ok) continue;
    const dmg = evalRes.damage;

    for (const foeIdx of foeSeats) {
      const foe = s.players[foeIdx];
      if (foe.field.length === 0) {
        const lethal = dmg >= foe.hp;
        options.push({
          action: { type: 'ATTACK', attackers: g, target: 'face', targetSeat: foeIdx },
          value: dmg * 2 + (lethal ? 10000 : 0) - g.length + (foe.hp <= 10 ? 15 : 0),
        });
      } else {
        for (const t of foe.field) {
          const td = def(t.defId);
          const effective = td.ability === 'guard' ? dmg - 1 : dmg;
          const kills = effective >= t.hp;
          const overkill = Math.max(0, effective - t.hp);
          let value = kills ? 120 + td.atk! * 4 - overkill * 2 : effective * 2;
          value -= g.length * 3; // لا تُهدر الوحوش دون داعٍ
          options.push({ action: { type: 'ATTACK', attackers: g, target: t.uid, targetSeat: foeIdx }, value });
        }
      }
    }
  }

  if (options.length === 0) return null;
  options.sort((a, b) => b.value - a.value);
  // الضربة القاضية لا تُفوَّت مهما كان المستوى، وما عداها قد يُخطئ فيه
  if (options[0].value >= 10000) return options[0].action;
  return pickMaybeMistake(s, options, 31).action;
}

/** يعيد الحركة التالية للذكاء الاصطناعي، أو null إذا لم يبقَ شيء (ينهي الدور) */
export function aiChooseAction(s: GameState): GameAction {
  const side = s.current;
  const me = s.players[side];
  const foes = opponentsOf(s, side).map((i) => s.players[i]);

  // الرد على عقوبة السحب
  if (s.phase === 'respond') {
    const stackable = me.hand
      .filter((c) => canPlayCard(s, side, c.uid).ok)
      .sort((a, b) => def(b.defId).cost - def(a.defId).cost)[0];
    // في السهل يقبل الخصم العقوبة غالباً بدل ردّها مضاعفة إليك
    if (stackable && aiRandom(s, 11) < level(s).denialWeight) {
      const d = def(stackable.defId);
      return {
        type: 'PLAY',
        uid: stackable.uid,
        chosenElement: d.element === 'wild' ? bestElement(s, side) : undefined,
      };
    }
    return { type: 'ACCEPT_DRAW' };
  }

  if (s.reveal && s.reveal.side === side) {
    const best = s.reveal.cards
      .map((c) => ({ c, v: scoreCard(s, side, def(c.defId)) }))
      .sort((a, b) => b.v - a.v)[0];
    return { type: 'PICK_REVEAL', uid: best.c.uid };
  }

  // 1) حسم فوري بالوحش الأعظم
  if (canSummonTitan(s, side).ok) return { type: 'SUMMON_TITAN' };

  // 2) التحضير قبل إنفاق الطاقة على الاستدعاء — وإلا لم يبقَ ما يُجهَّز به.
  //    `reservedEnergy` يحمي ثمن أرخص وحشٍ في اليد فلا تُخنق الساحة.
  const prep = chooseLoadout(s, side);
  if (prep) return prep;

  // 3) الكروت غير المنهية للدور (قطع، وحوش، سحر، فخاخ)
  const playable = me.hand
    .filter((c) => canPlayCard(s, side, c.uid).ok)
    .map((c) => ({ inst: c, d: def(c.defId) }));

  const nonEnding = playable
    .filter((x) => !isTurnEnding(x.d))
    .map((x) => ({ ...x, score: scoreCard(s, side, x.d) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (nonEnding.length) {
    const pick = pickMaybeMistake(s, nonEnding, 7);
    let targetUid: string | undefined;
    if (pick.d.needsTarget === 'own_monster') {
      targetUid = me.field.slice().sort((a, b) => b.atk - a.atk)[0]?.uid;
    } else if (pick.d.needsTarget === 'enemy_monster') {
      targetUid = foes
        .flatMap((f) => f.field)
        .slice()
        .sort((a, b) => b.atk - a.atk)[0]?.uid;
    } else if (pick.d.needsTarget === 'enemy_trap') {
      targetUid = foes.find((f) => f.traps.length)?.traps[0]?.uid;
    } else if (pick.d.needsTarget === 'discard_monster') {
      targetUid = s.discard
        .filter((c) => def(c.defId).kind === 'monster')
        .sort((a, b) => (def(b.defId).atk ?? 0) - (def(a.defId).atk ?? 0))[0]?.uid;
    }
    return {
      type: 'PLAY',
      uid: pick.inst.uid,
      chosenElement: pick.d.element === 'wild' ? bestElement(s, side) : undefined,
      targetUid,
    };
  }

  // 4) الهجوم
  const atk = chooseAttack(s, side);
  if (atk) return atk;

  // 5) كروت تُنهي الدور (تخطي / سحب / انعكاس) كحركة أخيرة
  const ending = playable
    .filter((x) => isTurnEnding(x.d))
    .map((x) => ({ ...x, score: scoreCard(s, side, x.d) }))
    .sort((a, b) => b.score - a.score);
  // في المستويات السهلة يتجاهل الخصم كروت التعطيل غالباً بدل تكديسها كل دور
  if (ending.length && aiRandom(s, 53) < level(s).denialWeight) {
    const pick = ending[0];
    return {
      type: 'PLAY',
      uid: pick.inst.uid,
      chosenElement: pick.d.element === 'wild' ? bestElement(s, side) : undefined,
    };
  }

  // 6) سحب إنقاذ
  if (!me.extraDrawUsed && !hasAnyPlayable(s, side)) return { type: 'DRAW' };

  return { type: 'END_TURN' };
}

const AUTO_PLAY_MAX_STEPS = 40;

/** يسجّل أن الكمبيوتر بدأ اللعب التلقائي عن اللاعب الحالي */
export function stampAutoPlay(state: GameState): GameState {
  if (state.phase === 'ended') return state;
  const s = structuredClone(state);
  s.log.push({
    turn: s.turn,
    side: s.current,
    kind: 'system',
    key: 'auto_play',
    params: { player: s.players[s.current].name },
  });
  s.logSeq += 1;
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
  return s;
}

function forceEndAction(s: GameState): GameAction {
  return s.phase === 'respond' ? { type: 'ACCEPT_DRAW' } : { type: 'END_TURN' };
}

/**
 * لعب تلقائي كامل لدور اللاعب الحالي بمحرّك الذكاء الاصطناعي، ثم إنهاء الدور.
 * يُستخدم عند انتهاء مهلة الجولة (محلياً أو عند حَكَم الغرفة).
 */
export function applyAutoPlay(state: GameState): GameState {
  if (state.phase === 'ended') return state;
  const side = state.current;
  const turn = state.turn;
  let s = stampAutoPlay(state);

  for (let n = 0; n < AUTO_PLAY_MAX_STEPS; n++) {
    if (s.phase === 'ended' || s.current !== side || s.turn !== turn) return s;
    const action = aiChooseAction(s);
    const beforeTurn = s.turn;
    // logSeq لا length: السجل حلقة تُقصّ عند 200، فطولها يتجمّد في المباريات
    // الطويلة ويبدو كل تصرّف بلا أثر، فيُنهي اللعبُ التلقائي الدورَ بعد حركة واحدة.
    const beforeSeq = s.logSeq;
    s = applyGameAction(s, action);
    if (action.type === 'END_TURN' || action.type === 'ACCEPT_DRAW') return s;
    if (s.turn === beforeTurn && s.logSeq === beforeSeq) {
      s = applyGameAction(s, forceEndAction(s));
      return s;
    }
  }

  if (s.phase !== 'ended' && s.current === side && s.turn === turn) {
    s = applyGameAction(s, forceEndAction(s));
  }
  return s;
}
