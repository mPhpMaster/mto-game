import type { Localized } from './locale';

export interface GuideSection {
  id: string;
  icon: string;
  title: Localized;
  /** فقرات الشرح */
  body: Localized[];
  /** نقاط مركّزة تُعرض كقائمة */
  points?: Localized[];
  /** سرّ لا تذكره القواعد */
  secret?: Localized;
}

export const GUIDE: GuideSection[] = [
  {
    id: 'flow',
    icon: '🌊',
    title: { ar: 'ما هو طابور التدفق؟ ولماذا يهمّ؟', en: 'What is the flow pile, and why does it matter?' },
    body: [
      {
        ar: 'طابور التدفق هو الكارت المكشوف في وسط اللوحة. هو **الشرط** الذي يقرّر ماذا يحقّ لك أن تلعب: كل كارت في يدك يجب أن يشترك معه في **العنصر** أو في **الرقم**. لا يهمّ كم تملك من طاقة إن لم يكن لديك كارت مطابق.',
        en: 'The flow pile is the face-up card in the middle of the board. It is the **gate** that decides what you may play: every card in your hand must share either its **element** or its **number**. All the energy in the world is useless without a matching card.',
      },
      {
        ar: 'وكل كارت تلعبه يصبح هو أعلى الطابور — أي أنك **تغيّر الشرط للخصم**. هذه هي اللعبة الحقيقية: أنت لا تلعب كارتاً فحسب، بل تُملي على خصمك ما يستطيع لعبه في دوره.',
        en: 'And every card you play becomes the new top of the pile — meaning you **rewrite the gate for your opponent**. That is the real game: you are not just playing a card, you are dictating what your opponent can play next turn.',
      },
    ],
    points: [
      { ar: 'الإطار الأخضر في يدك = مطابق وطاقتك تكفيه.', en: 'A green outline in your hand = it matches and you can afford it.' },
      { ar: 'الكارت الباهت = لا يطابق، أو الطاقة لا تكفي (حرّك المؤشّر فوقه ليخبرك السبب).', en: 'A dimmed card = no match, or not enough energy (hover it and it tells you which).' },
      { ar: 'الفخاخ وقطع الوحش الأعظم **لا تحتاج مطابقة إطلاقاً** — وهي مخرجك حين تُسدّ عليك الطرق.', en: 'Traps and Titan fragments **need no match at all** — your escape hatch when everything is blocked.' },
    ],
    secret: {
      ar: 'السرّ: انظر إلى عدد كروت خصمك وإلى العنصر الذي يلعبه كثيراً. إن كان يكدّس النار، فاترك الطابور على عنصر آخر عمداً — حتى لو كلّفك ذلك لعب كارت أضعف. تعطيله دور واحد يساوي أحياناً 5 نقاط ضرر.',
      en: 'Secret: watch your opponent’s hand size and the element they keep playing. If they are hoarding Fire, deliberately leave the pile on another element — even if it means playing a weaker card. Locking them out for one turn is often worth 5 damage.',
    },
  },
  {
    id: 'element',
    icon: '🔥',
    title: { ar: 'العنصر الفعّال — والكروت البرية', en: 'The active element — and wild cards' },
    body: [
      {
        ar: 'العنصر الفعّال هو عنصر أعلى الطابور، ويظهر في مربّع كبير في وسط اللوحة. لا يوجد «عنصر يتفوّق على عنصر» في هذه اللعبة — العناصر ليست حجراً ورقةً مقصاً، بل **مفاتيح**: العنصر يقرّر من يستطيع اللعب، لا من يُلحق ضرراً أكبر.',
        en: 'The active element is the element on top of the pile, shown in the large box in the middle. There is no elemental advantage table here — elements are not rock-paper-scissors, they are **keys**: the element decides who can play, not who hits harder.',
      },
      {
        ar: 'الكارت البري (🌈) يطابق أي شيء، وحين تلعبه **تختار أنت** العنصر الفعّال الجديد. هذا أقوى مما يبدو: يمكنك فتح الطريق لنفسك وإغلاقه على خصمك بحركة واحدة.',
        en: 'A wild card (🌈) matches anything, and when you play it **you choose** the new active element. That is stronger than it looks: one card can open your own path and shut your opponent’s at the same time.',
      },
    ],
    points: [
      { ar: 'الرقم طريق ثانٍ للمطابقة: كارت ماء رقمه 2 يُلعَب فوق كارت نار رقمه 2.', en: 'The number is a second path: a Water card numbered 2 can be played on a Fire card numbered 2.' },
      { ar: 'كروت الحركة لها أرقام خاصة: ⊘ للتخطي، +2 للسحب، ⇄ للانعكاس — وتتطابق فيما بينها.', en: 'Action cards have special numbers: ⊘ skip, +2 draw, ⇄ reverse — and they match each other.' },
    ],
    secret: {
      ar: 'السرّ: لا تلعب الكارت البري لمجرّد أنك تستطيع. احتفظ به لِلحظة تُسدّ فيها يدك تماماً — فهو الكارت الوحيد الذي يُلعَب دائماً. لاعب يحتفظ ببريّ واحد لا «يعلق» أبداً.',
      en: 'Secret: don’t play a wild just because you can. Save it for the turn your hand is completely blocked — it is the one card that is always legal. A player holding one wild never gets stuck.',
    },
  },
  {
    id: 'combo',
    icon: '💥',
    title: { ar: 'دمج البطاقات — الهجوم المشترك خطوة بخطوة', en: 'Combining cards — the combo attack, step by step' },
    body: [
      {
        ar: 'الدمج لا يحدث في يدك، بل **على الساحة بين وحوشك**. تختار وحشين أو أكثر جاهزين فيضربون ضربة واحدة مجمّعة بدل ضربات منفصلة.',
        en: 'Combining does not happen in your hand — it happens **on the field, between your monsters**. You select two or more ready monsters and they strike as one instead of separately.',
      },
      {
        ar: '**الخطوات:** ① اضغط وحشك الأول (يظهر عليه إطار أبيض). ② اضغط وحشك الثاني. ③ سيظهر في شريط الأوامر «💥 هجوم مشترك» مع الضرر المتوقّع. ④ اضغط وحش الخصم لمهاجمته، أو «⚔ هجوم مباشر» إن كانت ساحته خالية.',
        en: '**Steps:** ① Tap your first monster (it gets a white outline). ② Tap your second. ③ The command bar shows “💥 Combo attack” with the expected damage. ④ Tap an enemy monster to hit it, or “⚔ Attack directly” if their field is empty.',
      },
      {
        ar: '**شرط الدمج:** يجب أن يشترك الوحوش في **العنصر** أو في **الرقم**. والاستثناء: أي وحش يحمل خاصية «رابط» يُدمج مع أي وحش مهما اختلف عنصره أو رقمه.',
        en: '**The requirement:** the monsters must share an **element** or a **number**. The exception: any monster with **Link** combines with anything, whatever its element or number.',
      },
    ],
    points: [
      { ar: 'الضرر = مجموع هجوم الوحوش + 2 لكل وحش إضافي. ثلاثة وحوش بـ4 هجوم = 12 + 4 = 16.', en: 'Damage = sum of attack + 2 per extra monster. Three 4-attack monsters = 12 + 4 = 16.' },
      { ar: 'مرة واحدة في الدور فقط. والوحوش المشاركة كلّها تصبح مُنهكة.', en: 'Once per turn only. Every participating monster becomes exhausted.' },
      { ar: 'الوحش المكتوب عليه «جديد» لا يشارك — إلا إن كان يحمل «اندفاع».', en: 'A monster marked “New” cannot join — unless it has **Rush**.' },
      { ar: 'كارت «تضخيم» يضاعف الهجوم المشترك القادم في نفس الدور.', en: 'The **Amplify** spell doubles your next combo attack that turn.' },
    ],
    secret: {
      ar: 'السرّ الأكبر في اللعبة: الضربة الواحدة المجمّعة تتجاوز وحش الخصم الحارس بضربة قاضية، بينما الضربات المنفصلة تتكسّر عليه. وأخطر تركيبة: «تضخيم» + ثلاثة وحوش من عنصر واحد = ضرر يقارب 32، أي أكثر من حياة الخصم كاملة. اجمع وحوشك بصمت دورين، ثم اضرب مرة واحدة.',
      en: 'The biggest secret in the game: one merged strike punches through a Guard monster in a single blow, while separate strikes break against it. The deadliest line: **Amplify** + three same-element monsters ≈ 32 damage — more than a full life bar. Build quietly for two turns, then strike once.',
    },
  },
  {
    id: 'draw',
    icon: '🎯',
    title: { ar: 'كروت السحب والتكديس', en: 'Draw cards and stacking' },
    body: [
      {
        ar: 'حين يلعب أحدكما «اسحب كرتين»، لا تُطبَّق العقوبة فوراً. تصل إلى الطرف الآخر وأمامه خياران: أن يردّ بكارت سحب مطابق فتتضاعف العقوبة وترتدّ إليك (2 ← 4 ← 6…)، أو أن يقبل فيسحب كل الكروت **ويفقد دوره**.',
        en: 'When one of you plays Draw Two, the penalty is not applied immediately. It travels to the other player, who has two options: stack a matching draw card so the penalty doubles and bounces back (2 → 4 → 6…), or accept it — drawing every card and **losing their turn**.',
      },
    ],
    points: [
      { ar: 'قبول العقوبة ليس خسارة دائماً: 4 كروت في يدك قد تفتح لك دورين قويّين.', en: 'Accepting is not always bad: 4 extra cards can fuel two strong turns.' },
      { ar: '«تخطي الدور» و«انعكاس» ينهيان دورك فوراً — فالعبهما **بعد** أن تهاجم، لا قبله.', en: 'Skip and Reverse end your turn immediately — play them **after** you attack, never before.' },
    ],
    secret: {
      ar: 'السرّ: كارت السحب سلاح دفاعي أيضاً. إن كانت حياتك منخفضة وللخصم وحوش جاهزة، فـ«تخطي الدور» يمنعه من الهجوم دوراً كاملاً — وهو أرخص من أي حاجز.',
      en: 'Secret: draw cards are also defensive. If your life is low and the opponent has ready monsters, Skip denies them an entire turn of attacks — cheaper than any barrier.',
    },
  },
  {
    id: 'traps',
    icon: '🕸️',
    title: { ar: 'الفخاخ: المناورة حين تُسدّ الطرق', en: 'Traps: maneuvering when you are blocked' },
    body: [
      {
        ar: 'الفخّ يُجهَّز مقلوباً ولا يحتاج مطابقة، ثم ينفجر **تلقائياً** عند شرطه: هجوم الخصم، أو استدعائه وحشاً، أو بداية دوره. الخصم لا يرى ما جهّزت.',
        en: 'A trap is set face-down, needs no match, and fires **automatically** on its condition: the opponent attacking, summoning, or starting their turn. They cannot see what you set.',
      },
    ],
    points: [
      { ar: '«كمين» و«حاجز» و«عكس التيار» تنطلق عند هجوم الخصم.', en: 'Ambush, Barrier and Reverse Current fire when the opponent attacks.' },
      { ar: '«انفجار مضاد» ينطلق عند استدعائه وحشاً.', en: 'Counter Blast fires when they summon.' },
      { ar: '«شبكة» و«لعنة» و«سرقة طاقة» و«تحطيم الأثر» تنطلق في بداية دوره.', en: 'Net, Curse, Energy Siphon and Relic Break fire at the start of their turn.' },
    ],
    secret: {
      ar: 'السرّ: حين لا يكون في يدك كارت مطابق، لا تسحب فوراً — جهّز فخاً أولاً. الفخاخ لا تحتاج مطابقة، فهي تحوّل الدور «الميت» إلى دور مفيد. واللاعب المتمرّس يجهّز «حاجز» قبل أن يبدو عليه الضعف، لا بعده.',
      en: 'Secret: when nothing in your hand matches, don’t draw straight away — set a trap first. Traps need no match, so they turn a dead turn into a useful one. Experienced players set Barrier *before* they look weak, not after.',
    },
  },
  {
    id: 'titan',
    icon: '🗿',
    title: { ar: 'الوحش الأعظم — الطريق الخفيّ للفوز', en: 'The Great Titan — the hidden path to victory' },
    body: [
      {
        ar: 'في السطح 8 قطع من أربعة أنواع: قلب · ناب · درع · تاج. اجمع **الأنواع الأربعة** (لا أربع قطع أياً كانت) وادفع 6 طاقة → تفوز بالمباراة فوراً مهما كانت حياتك.',
        en: 'The deck holds 8 fragments of four kinds: Heart · Fang · Shield · Crown. Collect **all four kinds** (not just any four) and pay 6 energy → you win instantly, whatever your life total.',
      },
    ],
    points: [
      { ar: 'القطع تُوضع دون مطابقة، فلا تكلّفك دوراً ضائعاً أبداً.', en: 'Fragments need no match, so they never cost you a wasted turn.' },
      { ar: 'عدّاد 🗿 في شريط كل لاعب يكشف كم جمع — راقب عدّاد خصمك.', en: 'The 🗿 counter on each player’s bar shows their progress — watch your opponent’s.' },
      { ar: 'فخ «تحطيم الأثر» يدمّر قطعة من الخصم ويعيدها إلى السطح.', en: 'The Relic Break trap destroys one of their fragments and returns it to the deck.' },
    ],
    secret: {
      ar: 'السرّ: إن رأيت عدّاد خصمك يبلغ 3/4، فجهّز «تحطيم الأثر» فوراً — هي طريقتك الوحيدة لإيقافه. وبالمقابل: إن بلغتَ 4 قطع فلا تستدعِ الوحش وطاقتك 6 بالضبط، انتظر دوراً حتى تملك فائضاً؛ فلو انفجر عليك فخّ سرقة طاقة ضاعت الفرصة كلها.',
      en: 'Secret: if their counter hits 3/4, set Relic Break immediately — it is your only way to stop them. Conversely: once you hold all four, don’t summon on exactly 6 energy. Wait a turn for a surplus; if an Energy Siphon fires first, the whole plan evaporates.',
    },
  },
  {
    id: 'tempo',
    icon: '⚡',
    title: { ar: 'الطاقة والإيقاع — أسرار المحترفين', en: 'Energy and tempo — the pro secrets' },
    body: [
      {
        ar: 'سقف الطاقة يرتفع +1 كل دور وتُملأ الطاقة بالكامل في بدايته. **الطاقة غير المستعملة تضيع** — لا تُدَّخر للدور القادم.',
        en: 'Your energy cap rises by 1 each turn and refills completely at its start. **Unused energy is lost** — it does not carry over.',
      },
    ],
    points: [
      { ar: 'خاصية «شحن» تعطيك +1 طاقة **فوق السقف** كل دور — وحش شحن مبكّر يساوي دوراً كاملاً لاحقاً.', en: 'The Charge ability gives +1 energy **above the cap** every turn — an early Charge monster is worth a whole turn later.' },
      { ar: '«حراسة» تقلّل كل ضربة بمقدار 1، فهي قاتلة أمام الضربات الصغيرة المتكرّرة وعديمة الأثر أمام ضربة مجمّعة واحدة.', en: 'Guard reduces every hit by 1 — brutal against many small strikes, useless against one big merged strike.' },
      { ar: '«اختراق» يمرّر الضرر الزائد إلى حياة الخصم مباشرة، فلا يضيع منه شيء.', en: 'Pierce passes excess damage straight to the opponent’s life — nothing is wasted.' },
      { ar: 'إن لم يكن لديك كارت قابل للعب، يصبح زر «اسحب كارتاً» متاحاً — مرة واحدة في الدور.', en: 'If nothing is playable, the “Draw a card” button unlocks — once per turn.' },
    ],
    secret: {
      ar: 'السرّ الأخير: لا تستدعِ وحوشك واحداً واحداً كلّما استطعت. الوحش الوحيد على الساحة يُقتَل بسهولة، أما وحشان يُستدعيان في دور واحد فيصبحان في الدور التالي هجوماً مشتركاً يقصم الظهر. اصبر دوراً — الصبر في هذه اللعبة يُقاس بالضرر.',
      en: 'The last secret: don’t summon monsters one at a time just because you can. A lone monster dies easily; two summoned in the same turn become a back-breaking combo the very next turn. Wait one turn — in this game, patience is measured in damage.',
    },
  },
];
