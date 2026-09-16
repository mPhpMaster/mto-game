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
      { ar: 'الكارت المتوهّج بلون عنصره في يدك = مطابق وطاقتك تكفيه، ووسم ⭐ «تامّة» = يطابق العنصر والرقم معاً (وسمٌ بلا مكافأة).', en: 'A card glowing in its element colour = it matches and you can afford it; a ⭐ Perfect tag = it matches element and number at once (a tag, no bonus).' },
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
        ar: 'العنصر الفعّال هو عنصر أعلى الطابور، ويظهر في شارة «التدفق» أعلى الشاشة وعلى بلاطة وسط الساحة. لا يوجد «عنصر يتفوّق على عنصر» في هذه اللعبة — العناصر ليست حجراً ورقةً مقصاً، بل **مفاتيح**: العنصر يقرّر من يستطيع اللعب، لا من يُلحق ضرراً أكبر.',
        en: 'The active element is the element on top of the pile, shown in the Flow badge at the top and on the centre tile of the arena. There is no elemental advantage table here — elements are not rock-paper-scissors, they are **keys**: the element decides who can play, not who hits harder.',
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
        ar: '**شرط الدمج:** يجب أن يشترك الوحوش في **العنصر** أو في **الرقم**. لا استثناء — كانت خاصية «رابط» تتجاوز الشرط، وقد زالت مع تبديل الخصائص بكلمات العناصر.',
        en: '**The requirement:** the monsters must share an **element** or a **number**. No exceptions — the old **Link** ability bypassed it, and it is gone with the move to element keywords.',
      },
    ],
    points: [
      { ar: 'الضرر = مجموع هجوم الوحوش + 2 لكل وحش إضافي. ثلاثة وحوش بـ4 هجوم = 12 + 4 = 16.', en: 'Damage = sum of attack + 2 per extra monster. Three 4-attack monsters = 12 + 4 = 16.' },
      { ar: 'مرة واحدة في الدور فقط. والوحوش المشاركة كلّها تصبح مُنهكة.', en: 'Once per turn only. Every participating monster becomes exhausted.' },
      { ar: 'الوحش المكتوب عليه «جديد» لا يشارك — إلا إن كان يحمل «سرعة».', en: 'A monster marked “New” cannot join — unless it has **Speed**.' },
      { ar: 'قبل أن تضرب: الأهداف الصالحة تتوهّج بالأحمر وفوقها الضرر المتوقّع (💀 إن كان قاتلاً)، وتبهت بعلامة ✕ إن كان الدمج غير صالح — فلا تكتشف الخطأ بعد النقر.', en: 'Before you strike: valid targets glow red with the expected damage above them (💀 if lethal), and grey out with an ✕ if the combo is invalid — so you never find out after the tap.' },
      { ar: 'كارت «تضخيم» يضاعف الهجوم المشترك القادم في نفس الدور.', en: 'The **Amplify** spell doubles your next combo attack that turn.' },
      { ar: 'سقف الساحة 6 وحوش — فالتشكيلة الكبيرة للدمج لم تعد تُقطَع عند الرابع.', en: 'The field holds 6 monsters — a wide combo line is no longer cut off at four.' },
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
    id: 'prep',
    icon: '⚙️',
    title: { ar: 'التحضير: التجهيزات والطقس', en: 'Preparation: gear and weather' },
    body: [
      {
        ar: 'زر «⚙ التحضير» في دورك يفتح لوحتين: **التجهيزات** و**الطقس**. كلاهما يُدفع من طاقة الدور نفسها، فالتحضير ليس مجانياً: كل نقطة تنفقها هنا نقطةٌ لم تلعب بها كارتاً.',
        en: 'The ⚙ Prepare button on your turn opens two panels: **gear** and **weather**. Both are paid from that turn’s energy, so preparation is never free: every point spent here is a point not spent on a card.',
      },
      {
        ar: 'التجهيزة تُركَّب على **وحشٍ واحد** وتبقى معه ما دام حيّاً. أما الطقس فهو **أثرٌ واحد على الساحة كلّها** يصيب الطرفين — فالعاصفة التي تقوّي كهرباءك تقوّي كهرباء خصمك أيضاً.',
        en: 'Gear attaches to **one monster** and stays with it while it lives. Weather is **a single effect across the whole arena** and hits both sides — the storm that powers your Electric monsters powers your opponent’s too.',
      },
    ],
    points: [
      { ar: 'درع الصخر يقلّل كل ضربة، ونصل البرق للكهرباء وحدها ويخترق، وتميمة الشفاء ترمّم كل دور، وجوهرة السرعة تُهاجم فوراً.', en: 'Rock Shield trims every hit, Lightning Blade (Electric only) adds attack and pierces, Healing Amulet heals every turn, Speed Jewel lets a new monster attack at once.' },
      { ar: 'العاصفة ترفع هجوم الكهرباء، والمطر الحمضي يؤذي كل الوحوش ويضاعف السم، والضباب يُضيع بعض الضربات.', en: 'Thunderstorm boosts Electric attacks, Acid Rain hurts every monster and doubles poison, Heavy Fog makes some strikes miss.' },
      { ar: 'الدروع لا تحمي من المطر الحمضي ولا من السم: هما ضررٌ يصيب الجسد لا الضربة.', en: 'Armour does not stop acid rain or poison: they wear down the body, not a strike.' },
    ],
    secret: {
      ar: 'السرّ: الطقس سلاحٌ ذو حدّين، فلا تفعّله إلا حين تكون ساحتك أكثر استفادةً منه من ساحة خصمك. وإن فعّل الخصم طقساً يخدمه، فإزاحته بطاقة واحدة أرخص غالباً من محاربته دوراً كاملاً.',
      en: 'Secret: weather cuts both ways — only call it when your field gains more from it than your opponent’s. And if they call weather that serves them, dispelling it for one energy is usually cheaper than fighting it for a whole turn.',
    },
  },
  {
    id: 'passives',
    icon: '🧬',
    title: { ar: 'قدرات الطُّرُز — ما يفعله الوحش دون أن تطلب', en: 'Archetype passives — what a monster does unasked' },
    body: [
      {
        ar: 'لكل وحش **طراز** يُعرف من شكله، ولكل طراز قدرةٌ تعمل دائماً دون تفعيل ولا تكلفة. القدرة تُورَّث: الفصائل الخمس من الطراز نفسه تحملها كلّها.',
        en: 'Every monster has an **archetype** you can tell from its shape, and each archetype has a passive that is always on, with no activation and no cost. It is inherited: every species of that archetype carries it.',
      },
    ],
    points: [
      { ar: 'العملاق — درع حراري: يردّ نقطة ضرر على كل من يهاجمه.', en: 'Golem — Thermal Shield: reflects 1 damage onto anything that attacks it.' },
      { ar: 'الأفعى — أثر سام: يسمّم من يضربه.', en: 'Serpent — Venom Trail: poisons what it strikes.' },
      { ar: 'الكرة — حلقة امتصاص: تمتصّ أول ضرر من سحرٍ أو طقس.', en: 'Orb — Absorb Ring: soaks the first damage from a spell or weather.' },
      { ar: 'الوحش — صاعقة خارقة: تتجاهل نصف درع الهدف.', en: 'Beast — Surge Strike: ignores half of the target’s armour.' },
      { ar: 'الطائر — تفادٍ هوائي: فرصةٌ لتفادي الضربة كلّها.', en: 'Avian — Air Dodge: a chance to evade a strike entirely.' },
      { ar: 'الشبح — عودة الطيف: ينجو مرّة من ضربةٍ قاتلة.', en: 'Wraith — Spectral Return: survives one killing blow.' },
    ],
    secret: {
      ar: 'السرّ: اضغط مطوّلاً على وحوش خصمك قبل أن تهاجم. ضرب عملاقٍ بوحوشٍ ضعيفة الحياة يُهلكها بدرعه الحراري، والضربة القاضية على شبحٍ لم يستعمل عودته تذهب هدراً.',
      en: 'Secret: hold your opponent’s monsters before you attack. Hitting a Golem with fragile attackers burns them on its thermal shield, and a killing blow on a Wraith that still has its return is wasted.',
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
      { ar: 'كلمة «إمداد» (كهرباء) تعطيك +1 طاقة **فوق السقف** كل دور — وحشٌ مبكّر منها يساوي دوراً كاملاً لاحقاً.', en: 'The Recharge keyword (Electric) gives +1 energy **above the cap** every turn — an early one is worth a whole turn later.' },
      { ar: 'الدفاع لم يعد كلمةَ عنصر: «درع الصخر» من التحضير هو ما يقلّل الضربات، و«الدرع الحراري» من الطُّرُز هو ما يردّها.', en: 'Defence is no longer an element keyword: the Rock Shield from preparation is what reduces hits, and the archetype Thermal Shield is what reflects them.' },
      { ar: '«نصل البرق» من التحضير يمرّر الضرر الزائد إلى حياة الخصم مباشرة، فلا يضيع منه شيء.', en: 'The Lightning Blade from preparation passes excess damage straight to the opponent’s life — nothing is wasted.' },
      { ar: 'زر «اسحب كارتاً» متاح مرة واحدة في كل دور، حتى لو كان في يدك ما يُلعب — والسحب لا يُنهي دورك.', en: 'The “Draw a card” button works once every turn, even when you hold something playable — and drawing does not end your turn.' },
    ],
    secret: {
      ar: 'السرّ الأخير: لا تستدعِ وحوشك واحداً واحداً كلّما استطعت. الوحش الوحيد على الساحة يُقتَل بسهولة، أما وحشان يُستدعيان في دور واحد فيصبحان في الدور التالي هجوماً مشتركاً يقصم الظهر. اصبر دوراً — الصبر في هذه اللعبة يُقاس بالضرر.',
      en: 'The last secret: don’t summon monsters one at a time just because you can. A lone monster dies easily; two summoned in the same turn become a back-breaking combo the very next turn. Wait one turn — in this game, patience is measured in damage.',
    },
  },
];
