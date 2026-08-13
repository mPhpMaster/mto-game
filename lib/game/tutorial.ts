import type { Localized } from '@/lib/i18n/locale';
import { def } from './cards';
import type { GameScript } from './engine';
import type { GameState } from './types';

/**
 * توزيع ثابت للتعليم — نفس الكروت في كل مرة حتى تُطابق الخطوات ما يراه اللاعب.
 *
 * طابور التدفق يبدأ بـ«جمرة» (🔥 نار · رقم 1)، ويده:
 *   لهيبو    🔥 نار  رقم 2 — يطابق بالعنصر
 *   ناريكس   🔥 نار  رقم 5 — يطابق بالعنصر، وله «اندفاع»
 *   تسونا    💧 ماء  رقم 2 — لا يطابق الآن (درس المطابقة)
 *   كمين     🕸️ فخ            — يُجهَّز دون مطابقة
 *   قلب الوحش 🗿 قطعة          — تُوضع دون مطابقة
 */
export const TUTORIAL_SCRIPT: GameScript = {
  flow: 'mon_fire_jamra_1',
  hands: [
    ['mon_fire_lahibo_1', 'mon_fire_nariks_1', 'mon_water_tsuna_1', 'trap_ambush', 'frag_heart'],
    ['mon_grass_bur3um_1', 'mon_dark_thilli_1'],
  ],
  fields: [[], ['mon_grass_waraqi_1']],
  energyCap: [5, 3],
};

export const TUTORIAL_SEED = 20260806;

export type TutorialFocus =
  | 'hand'
  | 'myField'
  | 'foeField'
  | 'flow'
  | 'commands'
  | 'status'
  | null;

export interface TutorialStep {
  title: Localized;
  body: Localized;
  /** أين ينظر اللاعب — يُبرز هذا الجزء من اللوحة */
  focus?: TutorialFocus;
  /** خطوة شرح فقط، تتقدّم بزر «التالي» */
  manual?: boolean;
  /** شرط الإنجاز — يُفحص بعد كل حركة */
  done?: (s: GameState) => boolean;
}

const myField = (s: GameState) => s.players[0].field;
const hasMonster = (s: GameState, species: string) =>
  myField(s).some((m) => def(m.defId).species === species);

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: { ar: 'أهلاً بك في مواجهة الوحوش', en: 'Welcome to Monster Clash' },
    body: {
      ar: 'اللوحة مقسومة إلى ثلاثة: الخصم في الأعلى، طابور التدفق في الوسط، وأنت ويدك في الأسفل. سنلعب دوراً حقيقياً خطوة بخطوة — وأي خطوة يمكنك تخطّيها.',
      en: 'The board has three parts: the opponent on top, the flow pile in the middle, and you and your hand at the bottom. We’ll play a real turn step by step — and you can skip any step.',
    },
    focus: null,
    manual: true,
  },
  {
    title: { ar: 'اقرأ الكارت أولاً', en: 'Read the card first' },
    body: {
      ar: 'في كل كارت: الدائرة الملوّنة أعلى اليسار هي ⚡ تكلفة الطاقة، والمربّع أعلى اليمين هو رقم المطابقة، وأسفل الكارت ⚔ قوة الهجوم و❤ الحياة. اللون والأيقونة يدلّان على العنصر.',
      en: 'On every card: the coloured circle is the ⚡ energy cost, the box opposite it is the matching number, and at the bottom are ⚔ attack and ❤ life. The colour and icon show the element.',
    },
    focus: 'hand',
    manual: true,
  },
  {
    title: { ar: 'القاعدة الأهم: المطابقة', en: 'The key rule: matching' },
    body: {
      ar: 'طابور التدفق الآن 🔥 نار · رقم 1. لا يمكنك لعب كارت إلا إذا طابَق العنصر أو الرقم. لهذا ترى «لهيبو» و«ناريكس» بإطار أخضر (كلاهما نار)، بينما «تسونا» باهت لأنه ماء ورقمه 2 — لا العنصر ولا الرقم يطابق.',
      en: 'The flow pile is 🔥 Fire · number 1. You can only play a card that matches the element or the number. That’s why Blazlet and Narix have green outlines (both Fire), while Tsuna is dimmed — it’s Water with number 2, so neither matches.',
    },
    focus: 'flow',
    manual: true,
  },
  {
    title: { ar: 'استدعِ أول وحش لك', en: 'Summon your first monster' },
    body: {
      ar: 'اضغط كارت «لهيبو» في يدك (🔥 نار · ⚔3 ❤5) لتستدعيه إلى ساحتك.',
      en: 'Tap “Blazlet” in your hand (🔥 Fire · ⚔3 ❤5) to summon it to your field.',
    },
    focus: 'hand',
    done: (s) => hasMonster(s, 'lahibo'),
  },
  {
    title: { ar: 'ماذا تغيّر؟', en: 'What changed?' },
    body: {
      ar: 'نقصت طاقتك بمقدار تكلفة الكارت، وصار «لهيبو» هو أعلى طابور التدفق — أي أن العنصر الفعّال الآن نار والرقم 2. لاحظ أن «تسونا» أصبح قابلاً للعب رغم أنه ماء، لأن رقمه 2 يطابق الرقم الجديد. وعلى وحشك كلمة «جديد»: الوحش لا يهاجم في الدور الذي استُدعي فيه.',
      en: 'Your energy dropped by the card’s cost, and Blazlet is now on top of the flow pile — so the active element is Fire and the number is 2. Notice Tsuna became playable even though it’s Water: its number 2 matches the new number. And your monster is marked “New”: a monster cannot attack the turn it was summoned.',
    },
    focus: 'myField',
    manual: true,
  },
  {
    title: { ar: 'استثناء: خاصية «اندفاع»', en: 'The exception: Rush' },
    body: {
      ar: 'استدعِ «ناريكس» (🔥 نار · ⚔4 ❤4). خاصيته «اندفاع» تعني أنه يستطيع الهجوم فور استدعائه، دون انتظار دور كامل.',
      en: 'Summon “Narix” (🔥 Fire · ⚔4 ❤4). Its Rush ability lets it attack the moment it is summoned, without waiting a full turn.',
    },
    focus: 'hand',
    done: (s) => hasMonster(s, 'nariks'),
  },
  {
    title: { ar: 'هاجِم وحش الخصم', en: 'Attack the enemy monster' },
    body: {
      ar: 'اضغط «ناريكس» في ساحتك لتحديده — سيظهر الضرر المتوقّع في شريط الأوامر — ثم اضغط وحش الخصم «ورقي» لمهاجمته. ضرره 4 وحياة ورقي 4، فسيسقط.',
      en: 'Tap “Narix” on your field to select it — the expected damage appears in the command bar — then tap the enemy “Leafin” to attack it. Narix deals 4 and Leafin has 4 life, so it falls.',
    },
    focus: 'myField',
    done: (s) => s.players[1].field.length === 0,
  },
  {
    title: { ar: 'أنهِ دورك', en: 'End your turn' },
    body: {
      ar: 'نفدت طاقتك — الوحشان كلّفاك 5 نقاط. اضغط «إنهاء الدور». سيلعب الخصم دوره، ثم يعود إليك: يرتفع سقف طاقتك +1 وتُملأ من جديد، تسحب كارتاً، ويصبح وحوشك جاهزين للهجوم.',
      en: 'Your energy is spent — the two monsters cost 5. Press “End turn”. The opponent takes their turn, then it comes back to you: your energy cap rises by 1 and refills, you draw a card, and your monsters become ready to attack.',
    },
    focus: 'commands',
    done: (s) => s.turn >= 3 && s.current === 0,
  },
  {
    title: { ar: 'الفخاخ لا تحتاج مطابقة', en: 'Traps need no matching' },
    body: {
      ar: 'عادت طاقتك وارتفع سقفها. جهّز فخ «كمين» من يدك. الفخاخ وقطع الوحش تُوضع دون شرط المطابقة — وهذه مساحة المناورة حين لا تملك كارتاً مطابقاً. يبقى الفخ مقلوباً وينفجر تلقائياً: «كمين» يصيب أي وحش يهاجمك بـ3 ضرر.',
      en: 'Your energy is back and the cap is higher. Set the “Ambush” trap from your hand. Traps and Titan fragments are placed with no matching requirement — that’s your room to maneuver when nothing matches. The trap stays face-down and fires automatically: Ambush deals 3 damage to any monster that attacks you.',
    },
    focus: 'hand',
    done: (s) => s.players[0].traps.length > 0,
  },
  {
    title: { ar: 'اجمع قطع الوحش الأعظم', en: 'Collect the Titan fragments' },
    body: {
      ar: 'العب «قلب الوحش». في السطح 8 قطع من أربعة أنواع (قلب · ناب · درع · تاج). اجمع الأنواع الأربعة وادفع 6 طاقة لتستدعي الوحش الأعظم وتفوز بالمباراة فوراً — وهو أسرع طريق للفوز إن تأخّر القتال.',
      en: 'Play “Titan Heart”. The deck holds 8 fragments of four kinds (Heart · Fang · Shield · Crown). Collect all four kinds and pay 6 energy to summon the Great Titan and win instantly — the fastest path when combat drags on.',
    },
    focus: 'hand',
    done: (s) => s.players[0].fragments.length > 0,
  },
  {
    title: { ar: 'الهجوم المشترك', en: 'The combo attack' },
    body: {
      ar: 'الآن «لهيبو» و«ناريكس» جاهزان، وكلاهما نار. اضغطهما معاً لتحديدهما — سترى «💥 هجوم مشترك» بضرر أكبر (مجموع الهجوم + 2 لكل وحش إضافي) — ثم اضغط «⚔ هجوم مباشر» لأن ساحة الخصم خالية.',
      en: 'Blazlet and Narix are both ready, and both are Fire. Tap both to select them — you’ll see “💥 Combo attack” with higher damage (total attack + 2 per extra monster) — then press “⚔ Attack directly” since the enemy field is empty.',
    },
    focus: 'myField',
    done: (s) => s.players[0].comboUsed,
  },
  {
    title: { ar: 'أتقنت الأساسيات 👏', en: 'You’ve got the basics 👏' },
    body: {
      ar: 'طابِق العنصر أو الرقم، أدِر طاقتك المتصاعدة، استدعِ وحوشك وادمج هجماتها، ناوِر بالفخاخ، واجمع قطع الوحش الأعظم للحسم. بقي شيئان تكتشفهما في المباراة: كروت السحب تتكدّس (2 → 4) ومن يتلقّاها يردّ بمثلها أو يقبل ويفقد دوره، وكروت السحر تقلب الموازين. جاهز؟',
      en: 'Match the element or number, manage your rising energy, summon monsters and combine their attacks, maneuver with traps, and collect Titan fragments to finish. Two things left to discover in a real match: draw cards stack (2 → 4) and the receiver either stacks back or accepts and loses their turn, and spells can swing the game. Ready?',
    },
    focus: null,
    manual: true,
  },
];
