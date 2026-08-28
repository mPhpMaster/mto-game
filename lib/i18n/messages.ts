import { ELEMENT_NAME, FRAGMENT_NAME, TITAN, def } from '@/lib/game/cards';
import type { Element, GameOutcome, LogEntry, LogParams } from '@/lib/game/types';
import { type Locale, type Localized, tx } from './locale';

/**
 * رسائل سجل المباراة والنتائج.
 * `{name}` يُستبدل بالمعامل، والمعاملات المعروفة تُترجَم بدورها:
 * `card` معرّف كارت، `element` عنصر، `fragment` قطعة، `reason` مفتاح رسالة أخرى.
 */
export const LOG_MESSAGES: Record<string, Localized> = {
  // --- النظام ---
  match_start: { ar: 'بدأت المباراة — السطح فيه {deck} كارت.', en: 'Match started — {deck} cards in the deck.' },
  coin_toss: {
    ar: '🎲 القرعة: يبدأ {first}. تعويضاً لذلك يأخذ {second} كارتاً إضافياً، والبادئ لا يسحب في دوره الأول.',
    en: '🎲 Coin toss — first to play: {first}. Compensation: an extra card for {second}, and no first-turn draw for the starter.',
  },
  coin_toss_ffa: {
    ar: '🎲 القرعة الثلاثية: يبدأ {first} ثم {second} ثم {third}. من لا يبدأ يأخذ كارتاً وطاقة إضافية، والبادئ لا يسحب في دوره الأول.',
    en: '🎲 Three-player coin toss: {first}, then {second}, then {third}. Later players get an extra card and energy; the starter skips the first-turn draw.',
  },
  deck_reshuffled: { ar: 'نفد السطح — أُعيد خلط المهملات.', en: 'Deck empty — the discard pile was reshuffled.' },
  fatigue: { ar: '{player} يتلقى {damage} ضرر إنهاك (لا كروت متبقية).', en: '{player} takes {damage} fatigue damage (no cards left).' },
  drew: { ar: '{player} سحب {n} كارت.', en: '{player} — drew {n} card(s).' },
  turn_start: { ar: '— دور {player} (طاقة {energy}/{cap}) —', en: '— Turn: {player} (energy {energy}/{cap}) —' },
  auto_play: {
    ar: '⏱ انتهى الوقت — الكمبيوتر يلعب عن {player}.',
    en: '⏱ Time up — the computer is playing for {player}.',
  },
  turn_lost: { ar: '{player} فقد دوره.', en: '{player} — turn lost.' },
  eliminated: { ar: '💀 أُقصي {player} من المباراة.', en: '💀 {player} has been eliminated.' },
  pending_draw: { ar: 'عقوبة سحب متراكمة: {n} — كدّس كارت سحب أو اقبل.', en: 'Stacked draw penalty: {n} — stack another draw card or accept.' },
  accept_draw: { ar: '{player} قبِل العقوبة وسحب {n} كروت وفقد دوره.', en: '{player} — accepted the penalty, drew {n} cards, turn lost.' },

  // --- اللعب ---
  summoned: { ar: '{player} استدعى {card} ({atk}/{hp}).', en: '{player} summoned {card} ({atk}/{hp}).' },
  played: { ar: '{player} لعب {card}.', en: '{player} played {card}.' },
  played_wild: { ar: '{player} لعب {card} واختار عنصر {element}.', en: '{player} played {card} and chose {element}.' },
  trap_set: { ar: '{player} جهّز فخاً مقلوباً.', en: '{player} set a face-down trap.' },
  fragment_gained: { ar: '{player} حصل على «{card}» ({have}/{need}).', en: '{player} claimed “{card}” ({have}/{need}).' },
  pick_reveal: { ar: '{player} أخذ كارتاً من الكشف.', en: '{player} took a card from the reveal.' },

  // --- السحر ---
  healed: { ar: '{player} استعاد {amount} حياة ({hp}).', en: '{player} restored {amount} life ({hp}).' },
  boosted: { ar: '{card} حصل على +{amount} هجوم ({atk}).', en: '{card} gained +{amount} attack ({atk}).' },
  storm: { ar: 'عاصفة: {amount} ضرر لكل وحوش {player}.', en: 'Storm: {amount} damage to every monster controlled by {player}.' },
  gained_energy: { ar: '{player} كسب {amount} طاقة ({energy}).', en: '{player} gained {amount} energy ({energy}).' },
  search_revealed: { ar: 'بحث: كُشفت {n} كروت.', en: 'Search: {n} cards revealed.' },
  bounced: { ar: 'أُعيد {card} إلى يد {player}.', en: '{card} was returned to the hand of {player}.' },
  amplify: { ar: 'تضخيم: الهجوم المشترك القادم مضاعف.', en: 'Amplify: the next combo attack is doubled.' },
  revived: { ar: 'إحياء: عاد {card} إلى الساحة.', en: 'Revive: {card} returned to the field.' },
  purged: { ar: 'تطهير: دُمّر فخ لدى {player}.', en: 'Purge: destroyed a trap controlled by {player}.' },
  skip_next: { ar: '{player} سيفقد دوره القادم.', en: '{player} — next turn will be lost.' },
  reverse: { ar: 'انعكاس: {foe} يفقد دوره و{player} يسحب كارتاً.', en: 'Reverse: {foe} loses their turn and {player} draws a card.' },
  reverse_dir: {
    ar: 'انعكاس: انقلب اتجاه الدور، و{player} سحب كارتاً.',
    en: 'Reverse: turn order flipped, and {player} drew a card.',
  },
  draw_penalty: { ar: 'عقوبة السحب أصبحت {n}.', en: 'The draw penalty is now {n}.' },

  // --- الفخاخ ---
  trap_ambush: { ar: 'فخ «كمين» انفجر: {amount} ضرر للمهاجم.', en: '“Ambush” triggered: {amount} damage to the attacker.' },
  trap_barrier: { ar: 'فخ «حاجز» نشط: الهجوم القادم مُلغى.', en: '“Barrier” is up: the next attack is negated.' },
  trap_mirror: { ar: 'فخ «عكس التيار» جاهز: نصف الضرر سيرتد.', en: '“Reverse Current” is ready: half the damage will reflect.' },
  trap_blast: { ar: 'فخ «انفجار مضاد»: {amount} ضرر للوحش المُستدعى.', en: '“Counter Blast”: {amount} damage to the summoned monster.' },
  trap_net: { ar: 'فخ «شبكة»: {player} لا يستطيع الهجوم هذا الدور.', en: '“Net”: no attacks allowed this turn for {player}.' },
  trap_energy_steal: { ar: 'فخ «سرقة طاقة»: -1 طاقة للخصم و+2 لك.', en: '“Energy Siphon”: -1 energy for the opponent, +2 for you.' },
  trap_counter_surge: { ar: 'فخ «شحنة مضادة»: +3 طاقة في دورك القادم.', en: '“Counter Surge”: +3 energy on your next turn.' },
  trap_curse: { ar: 'فخ «لعنة»: {player} تخلّص من {n} كارت.', en: '“Curse”: {n} cards discarded by {player}.' },
  trap_relic_break: { ar: 'فخ «تحطيم الأثر»: تدمّرت قطعة «{fragment}» من الخصم.', en: '“Relic Break”: the opponent’s “{fragment}” fragment was destroyed.' },

  // --- خصائص الوحوش (تُعلن عن نفسها حتى لا تبدو معطّلة) ---
  ability_rush: {
    ar: '⚡ اندفاع: {card} يستطيع الهجوم فوراً.',
    en: '⚡ Rush: {card} can attack immediately.',
  },
  ability_scout: {
    ar: '🔍 استطلاع: {card} سحب لك كارتاً.',
    en: '🔍 Scout: {card} drew you a card.',
  },
  ability_charge: {
    ar: '🔋 شحن: +{amount} طاقة إضافية فوق السقف من {n} وحش.',
    en: '🔋 Charge: +{amount} bonus energy above the cap from {n} monster(s).',
  },
  ability_guard: {
    ar: '🛡️ حراسة: {card} امتصّ {amount} من الضرر.',
    en: '🛡️ Guard: {card} absorbed {amount} damage.',
  },

  // --- القتال ---
  monster_fell: { ar: 'سقط {card}.', en: '{card} was destroyed.' },
  attack_face: { ar: '{names} ضرب {player} مباشرة بـ{damage} ضرر.', en: '{names} hit {player} directly for {damage}.' },
  combo_face: { ar: '💥 هجوم مشترك: {names} ضرب {player} مباشرة بـ{damage} ضرر.', en: '💥 Combo attack: {names} hit {player} directly for {damage}.' },
  attack_monster: { ar: '{names} هاجم {card} بـ{damage} ضرر.', en: '{names} attacked {card} for {damage}.' },
  combo_monster: { ar: '💥 هجوم مشترك: {names} هاجم {card} بـ{damage} ضرر.', en: '💥 Combo attack: {names} attacked {card} for {damage}.' },
  attack_blocked: { ar: '{names} هاجم لكن الحاجز صدّ الهجوم بالكامل.', en: '{names} attacked but the Barrier absorbed it completely.' },
  attack_failed: { ar: 'فشل الهجوم — سقط المهاجمون.', en: 'The attack failed — the attackers were destroyed.' },
  mirror_reflect: { ar: 'ارتد {amount} ضرر إلى {player}.', en: '{amount} damage reflected back to {player}.' },
  pierce_extra: { ar: 'اختراق: {amount} ضرر إضافي إلى {player}.', en: 'Pierce: {amount} extra damage to {player}.' },
  venom_bite: { ar: 'سُم {card}: {amount} ضرر لكل مهاجم.', en: '{card}’s venom: {amount} damage to each attacker.' },
  drain_heal: { ar: 'امتصاص: {player} استعاد {amount} حياة.', en: 'Drain: {player} restored {amount} life.' },
  titan_summon: { ar: '⚡ {player} استدعى {titan}!', en: '⚡ {player} summoned {titan}!' },

  // --- النهاية ---
  win: { ar: '🏆 {winner} فاز — {reason}.', en: '🏆 {winner} wins — {reason}.' },
  reason_hp: { ar: 'أُسقطت حياة {loser} إلى الصفر', en: '{loser} was reduced to zero life' },
  reason_titan: { ar: 'استدعى {titan}', en: 'summoned {titan}' },
  reason_empty_hand: { ar: 'أفرغ يده أولاً', en: 'emptied their hand first' },
};

/**
 * أسماء اللاعبين المدمجة (أنت/الخصم الآلي/المدرّب) تُخزَّن كمفاتيح مسبوقة بـ@
 * فتتبع لغة القارئ حتى لو تغيّرت بعد بدء المباراة. أسماء اللاعبين الحقيقية
 * تُعرض كما كتبها صاحبها.
 */
const BUILTIN_NAMES: Record<string, Localized> = {
  '@you': { ar: 'أنت', en: 'You' },
  '@ai': { ar: 'الخصم الآلي', en: 'AI opponent' },
  '@coach': { ar: 'المدرّب', en: 'Coach' },
  '@opponent': { ar: 'الخصم', en: 'Opponent' },
  '@ai2': { ar: 'الخصم الآلي ٢', en: 'AI opponent 2' },
};

export function playerName(value: string, locale: Locale): string {
  const b = BUILTIN_NAMES[value];
  return b ? tx(b, locale) : value;
}

const NAME_PARAMS = new Set(['player', 'first', 'second', 'third', 'foe', 'winner', 'loser', 'name']);

/** أسماء معاملات تحتاج ترجمة بدل إدراجها كما هي */
function resolveParam(name: string, value: string | number, locale: Locale): string {
  if (name === 'card' && typeof value === 'string') return tx(def(value).name, locale);
  // أسماء المهاجمين تُخزَّن كمعرّفات مفصولة بـ | ليُترجَم كلٌّ منها
  if (name === 'names' && typeof value === 'string')
    return value
      .split('|')
      .map((id) => tx(def(id).name, locale))
      .join(' + ');
  if (name === 'element' && typeof value === 'string')
    return tx(ELEMENT_NAME[value as Element], locale);
  if (name === 'fragment' && typeof value === 'string')
    return tx(FRAGMENT_NAME[value] ?? { ar: value, en: value }, locale);
  if (name === 'titan') return tx(TITAN.name, locale);
  if (NAME_PARAMS.has(name) && typeof value === 'string') return playerName(value, locale);
  return String(value);
}

function fill(template: string, params: LogParams | undefined, locale: Locale): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? resolveParam(key, params[key], locale) : match
  );
}

export function renderMessage(key: string, params: LogParams | undefined, locale: Locale): string {
  const msg = LOG_MESSAGES[key];
  if (!msg) return key;

  // المعامل `reason` مفتاح رسالة أخرى يُحلّ أولاً ثم يُحقن في الرسالة الأمّ.
  // لا بدّ من نزعه قبل النداء الداخلي: تمريره كما هو يجعل الرسالة الداخلية
  // ترى `reason` من جديد فتستدعي نفسها بلا نهاية حتى ينفد المكدّس.
  if (params && typeof params.reason === 'string') {
    const { reason: reasonKey, ...rest } = params;
    const reason = renderMessage(reasonKey, rest, locale);
    return fill(tx(msg, locale), { ...rest, reason }, locale);
  }

  return fill(tx(msg, locale), params, locale);
}

export const renderLog = (entry: LogEntry, locale: Locale): string =>
  renderMessage(entry.key, entry.params, locale);

export const renderOutcome = (outcome: GameOutcome | null, locale: Locale): string =>
  outcome ? renderMessage(outcome.key, outcome.params, locale) : '';
