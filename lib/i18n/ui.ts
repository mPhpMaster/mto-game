import type { Localized } from './locale';

/** كل نصوص الواجهة. `{x}` يُستبدل بالمعاملات وقت الاستدعاء. */
export const UI = {
  // --- عام ---
  appName: { ar: 'مواجهة الوحوش', en: 'Monster Clash' },
  menu: { ar: '⟶ القائمة', en: '⟶ Menu' },
  home: { ar: 'القائمة', en: 'Menu' },
  close: { ar: 'إغلاق', en: 'Close' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  next: { ar: 'التالي ⟵', en: 'Next ⟶' },
  skipStep: { ar: 'تخطَّ', en: 'Skip' },

  // --- الصفحة الرئيسية ---
  tagline: {
    ar: 'لعبة كروت استراتيجية — 1 ضد 1 أو 1 ضد 1 ضد 1. مطابقة عناصر وأرقام، طاقة متصاعدة، هجمات مشتركة، ووحش أعظم يحسم المباراة.',
    en: 'A strategy card game — 1v1 or 1v1v1. Match elements and numbers, rising energy, combo attacks, and a Titan that ends the match.',
  },
  learnFirst: { ar: '🎓 تعلّم اللعب أولاً', en: '🎓 Learn to play first' },
  startMatch: { ar: 'ابدأ المباراة', en: 'Start a match' },
  firstTimeHint: {
    ar: 'أول مرة؟ التعليم يأخذ دقيقتين ويعلّمك بالّلعب لا بالقراءة.',
    en: 'First time? The tutorial takes two minutes and teaches by playing, not reading.',
  },
  chooseLevel: { ar: 'ابدأ مباراة — اختر مستوى الخصم', en: 'Start a match — choose the opponent level' },
  recommended: { ar: '(مقترح)', en: '(recommended)' },
  aiHpCap: { ar: 'حياة الخصم {hp} · سقف طاقته {cap}', en: 'Opponent life {hp} · energy cap {cap}' },
  coinNote: {
    ar: '🎲 من يبدأ يُحدَّد بالقرعة في كل مباراة، ومن يلعب ثانياً يأخذ كارتاً وطاقة إضافية تعويضاً — فالترتيب متكافئ.',
    en: '🎲 Who goes first is decided by a coin toss each match; the second player gets an extra card and energy to compensate — so turn order is fair.',
  },
  playFriend: { ar: '👥 العب ضد صديق', en: '👥 Play against a friend' },
  onlineTitle: { ar: '🌐 أونلاين برمز غرفة', en: '🌐 Online with a room code' },
  onlineDesc: {
    ar: 'أنشئ غرفة وأرسل الرمز لصديقك — يلعب كلٌّ من جهازه، ولا يرى أحدكما كروت الآخر.',
    en: 'Create a room and send the code to your friend — each plays from their own device, and neither sees the other’s cards.',
  },
  localTitle: { ar: '🤝 على جهاز واحد', en: '🤝 On one device' },
  localDesc: {
    ar: 'تتناوبان على نفس الشاشة، وستارة تخفي اليد عند تسليم الجهاز.',
    en: 'Take turns on the same screen, with a curtain hiding the hand when you hand the device over.',
  },
  ffa3Title: { ar: '⚔️ 1 ضد 1 ضد 1', en: '⚔️ 1v1v1' },
  ffa3Intro: {
    ar: 'ثلاثة لاعبين في مباراة واحدة — كلٌّ ضد الاثنين الآخرين. آخر واقف يفوز.',
    en: 'Three players in one match — each against the other two. Last one standing wins.',
  },
  ffa3VsAi: { ar: 'أنت ضد خصمين آليين', en: 'You vs two AI opponents' },
  ffa3VsAiDesc: {
    ar: 'خانة واحدة لك وخانتان للخصم الآلي. تختار المستوى كما في 1 ضد 1.',
    en: 'One seat for you, two for the AI. Pick a difficulty just like in 1v1.',
  },
  ffa3Hotseat: { ar: 'ثلاثة لاعبين على جهاز واحد', en: 'Three players, one device' },
  ffa3HotseatDesc: {
    ar: 'تمرّرون الجهاز بينكم. الستارة تخفي اليد عند كل تسليم.',
    en: 'Pass the device around. The curtain hides each hand at handover.',
  },
  playerThreeName: { ar: 'اللاعب الثالث', en: 'Player Three' },
  attackFaceNamed: { ar: '⚔ هجوم مباشر على {name}', en: '⚔ Attack {name} directly' },
  pickEitherOpponent: {
    ar: '· اختر وحشاً من أي خصم، أو اضغط هجوماً مباشراً على من خلت ساحته',
    en: '· pick a monster from either opponent, or attack a player whose field is empty',
  },
  eliminatedTag: { ar: 'أُقصي', en: 'Eliminated' },
  remainingPlayers: { ar: 'المتبقّون: {n}', en: 'Remaining: {n}' },
  installTitle: { ar: '📱 ثبّتها على جوالك', en: '📱 Install it on your phone' },
  downloadApk: { ar: '🤖 حمّل تطبيق أندرويد', en: '🤖 Download the Android app' },
  downloadApkDesc: {
    ar: 'ملفّ APK جاهز للتثبيت. فعّل «تثبيت من مصادر غير معروفة» عند السؤال.',
    en: 'A ready-to-install APK. Enable “install from unknown sources” when asked.',
  },
  addToHome: { ar: '➕ أو أضِفها للشاشة الرئيسية', en: '➕ Or add it to your home screen' },
  addToHomeDesc: {
    ar: 'من قائمة المتصفّح اختر «إضافة إلى الشاشة الرئيسية» — تعمل دون إنترنت بعد أول فتح.',
    en: 'From the browser menu choose “Add to Home screen” — it works offline after the first load.',
  },
  browseCards: { ar: 'تصفّح الكروت', en: 'Browse cards' },
  history: { ar: 'السجل', en: 'History' },
  footerNote: {
    ar: 'النسخة الأولية: مواجهات 1 ضد 1 و1 ضد 1 ضد 1 ضد خصم آلي أو على جهاز واحد.',
    en: 'Early build: 1v1 and 1v1v1 duels against AI or on one device.',
  },

  // --- قواعد الصفحة الرئيسية ---
  ruleDeckTitle: { ar: 'السطح الأساسي', en: 'The main deck' },
  ruleDeckBody: {
    ar: '{total} كارتاً في سطح مشترك: {monster} وحشاً، {action} كارت حركة، {trap} فخاً، {spell} كارت سحر، و{fragment} قطع للوحش الأعظم.',
    en: '{total} cards in a shared deck: {monster} monsters, {action} action cards, {trap} traps, {spell} spells, and {fragment} Titan fragments.',
  },
  ruleTurnTitle: { ar: 'دورة اللعب', en: 'The turn cycle' },
  ruleTurnBody: {
    ar: 'يبدأ كل لاعب بـ{hand} كروت و{hp} نقطة حياة، ويسحب كارتاً في بداية كل دور.',
    en: 'Each player starts with {hand} cards and {hp} life, drawing a card at the start of every turn.',
  },
  ruleEnergyTitle: { ar: 'نظام الطاقة', en: 'The energy system' },
  ruleEnergyBody: {
    ar: 'سقف الطاقة يبدأ من {start} ويزيد +1 كل دور حتى {max}. خاصية «شحن» والفخاخ تمنحك طاقة إضافية فوق السقف.',
    en: 'The energy cap starts at {start} and rises by 1 each turn up to {max}. The Charge ability and traps grant energy above the cap.',
  },
  ruleMatchTitle: { ar: 'المطابقة على طريقة الأونو', en: 'UNO-style matching' },
  ruleMatchBody: {
    ar: 'كل كارت تلعبه يجب أن يطابق عنصر أو رقم أعلى طابور التدفق. الكروت البرية تُطابق كل شيء وتغيّر العنصر الفعّال. الفخاخ والقطع تُوضع دون شرط مطابقة.',
    en: 'Every card you play must match the element or the number on top of the flow pile. Wild cards match anything and change the active element. Traps and fragments are placed with no matching requirement.',
  },
  ruleComboTitle: { ar: 'الهجوم المشترك', en: 'Combo attacks' },
  ruleComboBody: {
    ar: 'ادمج وحشين أو أكثر يشتركان في العنصر أو الرقم — أو أحدهما بخاصية «رابط» — في ضربة واحدة، بمكافأة +{bonus} لكل وحش إضافي. مرة واحدة كل دور. سقف الساحة {field} وحوش.',
    en: 'Combine two or more monsters sharing an element or number — or one with Link — into a single strike, with a +{bonus} bonus per extra monster. Once per turn. The field holds up to {field} monsters.',
  },
  ruleTrapTitle: { ar: 'الفخاخ والمناورة', en: 'Traps and maneuvering' },
  ruleTrapBody: {
    ar: 'جهّز فخاخك مقلوبة، وستنطلق تلقائياً عند هجوم الخصم أو استدعائه أو بداية دوره: كمين، حاجز، شبكة، سرقة طاقة، تحطيم الأثر…',
    en: 'Set your traps face-down; they fire automatically when the opponent attacks, summons, or starts their turn: Ambush, Barrier, Net, Energy Siphon, Relic Break…',
  },
  ruleTitanTitle: { ar: 'الوحش الأعظم', en: 'The Great Titan' },
  ruleTitanBody: {
    ar: '{text} تكلفة الاستدعاء {cost} طاقة. احذر فخ «تحطيم الأثر» — يدمّر قطعك.',
    en: '{text} Summoning costs {cost} energy. Beware Relic Break — it destroys your fragments.',
  },
  ruleWinTitle: { ar: 'شروط الفوز', en: 'Win conditions' },
  ruleWinBody: {
    ar: 'أسقِط حياة الخصم إلى الصفر، أو استدعِ الوحش الأعظم، أو أفرغ يدك عند نفاد الكروت.',
    en: 'Drop the opponent’s life to zero, summon the Great Titan, or empty your hand when the deck runs out.',
  },

  // --- اللوحة ---
  turnLabel: { ar: 'الدور {n}', en: 'Turn {n}' },
  deckLabel: { ar: 'السطح {n}', en: 'Deck {n}' },
  discardLabel: { ar: 'المهملات {n}', en: 'Discard {n}' },
  drawPenalty: { ar: 'عقوبة سحب: {n}', en: 'Draw penalty: {n}' },
  ended: { ar: 'انتهت', en: 'Ended' },
  yourTurn: { ar: 'دورك', en: 'Your turn' },
  playerTurn: { ar: 'دور {name}', en: '{name}’s turn' },
  howToPlay: { ar: '؟ كيف ألعب', en: '? How to play' },
  logTitle: { ar: 'سجل المباراة', en: 'Match log' },
  showLog: { ar: 'إظهار السجل', en: 'Show log' },
  hideLog: { ar: 'إخفاء السجل', en: 'Hide log' },
  deckPile: { ar: 'السطح', en: 'Deck' },
  flowPile: { ar: 'طابور التدفق', en: 'Flow pile' },
  activeElement: { ar: 'العنصر الفعّال', en: 'Active element' },
  numberLabel: { ar: 'الرقم:', en: 'Number:' },
  matchHint: { ar: 'طابِق العنصر أو الرقم', en: 'Match the element or the number' },
  noFoeMonsters: { ar: 'لا وحوش لدى الخصم — هجومك يصله مباشرة', en: 'No enemy monsters — your attacks hit directly' },
  summonHint: { ar: 'استدعِ وحوشاً للدفاع والهجوم — حتى {n} على الساحة', en: 'Summon monsters to defend and attack — up to {n} on the field' },
  trapsLabel: { ar: 'فخاخ:', en: 'Traps:' },
  faceDown: { ar: 'مقلوب', en: 'Face-down' },
  faceDownTrap: { ar: 'فخ مقلوب', en: 'Face-down trap' },
  peekTrap: { ar: 'اطّلع على فخك', en: 'Peek at your trap' },
  peekTrapHint: {
    ar: 'اضغط لترى فخك المجهّز. يبقى مقلوباً أمام الخصم.',
    en: 'Click to see your set trap. It stays face-down to the opponent.',
  },
  ownTrapPeek: {
    ar: 'فخك المجهّز — اضغط للإغلاق حتى لا يبقى مكشوفاً.',
    en: 'Your set trap — click to close so it does not stay revealed.',
  },
  yourHand: { ar: 'يدك ({n})', en: 'Your hand ({n})' },
  greenPlayable: { ar: 'الأخضر = قابل للعب الآن', en: 'Green = playable now' },
  finishTargeting: { ar: 'أكمل اختيار الهدف أولاً', en: 'Finish choosing a target first' },
  emptyHand: { ar: 'يدك فارغة.', en: 'Your hand is empty.' },
  sortedHint: { ar: 'القابل للعب أعلى — والباقي صغير أسفل', en: 'Playable on top — the rest small below' },
  sortedHintMobile: {
    ar: 'الأصفر = قابل للعب — والقفل يفصل الباقي',
    en: 'Yellow = playable — the lock splits the rest',
  },
  unplayableRow: { ar: 'غير قابلة للعب', en: 'Not playable' },

  // --- الأوامر ---
  attackFace: { ar: '⚔ هجوم مباشر', en: '⚔ Attack directly' },
  clearSelection: { ar: 'إلغاء التحديد', en: 'Clear selection' },
  drawCard: { ar: 'اسحب كارتاً', en: 'Draw a card' },
  drawCardHint: { ar: 'متاح فقط عند تعذّر لعب أي كارت', en: 'Only available when no card is playable' },
  summonTitan: { ar: '🗿 استدعِ {titan}', en: '🗿 Summon {titan}' },
  endTurn: { ar: 'إنهاء الدور ⟵', en: 'End turn ⟶' },
  acceptPenalty: { ar: 'اقبل العقوبة', en: 'Accept the penalty' },
  mustDraw: { ar: 'عليك سحب {n} — كدّس كارت سحب مطابق أو اقبل', en: 'You must draw {n} — stack a matching draw card or accept' },
  comboPreview: { ar: '💥 هجوم مشترك — ضرر متوقّع: {damage}', en: '💥 Combo attack — expected damage: {damage}' },
  attackPreview: { ar: 'هجوم — ضرر متوقّع: {damage}', en: 'Attack — expected damage: {damage}' },
  pickFoeMonster: { ar: '· اختر وحش الخصم', en: '· pick an enemy monster' },
  pressDirect: { ar: '· اضغط هجوم مباشر', en: '· press Attack directly' },

  // --- تلميحات ورسائل ---
  waitYourTurn: { ar: 'انتظر دورك', en: 'Wait for your turn' },
  cannotPlay: { ar: 'لا يمكن لعب هذا الكارت', en: 'You cannot play this card' },
  netLocked: { ar: 'وحوشك مقيّدة بالشبكة هذا الدور', en: 'Your monsters are netted this turn' },
  monsterSick: { ar: 'هذا الوحش حديث الاستدعاء', en: 'This monster was just summoned' },
  monsterExhausted: { ar: 'هذا الوحش مُنهك', en: 'This monster is exhausted' },
  pickAttacker: { ar: 'اختر وحشاً مهاجماً أولاً', en: 'Select an attacking monster first' },
  invalidAttack: { ar: 'هجوم غير صالح', en: 'Invalid attack' },
  clearFoeFirst: { ar: 'يجب إزالة وحوش الخصم أولاً', en: 'Clear the enemy monsters first' },

  // --- نوافذ ---
  chooseElement: { ar: 'اختر العنصر الفعّال', en: 'Choose the active element' },
  chooseDiscardMonster: { ar: 'اختر وحشاً من المهملات', en: 'Choose a monster from the discard' },
  chooseOneCard: { ar: 'اختر كارتاً واحداً', en: 'Choose one card' },
  pickOwnMonster: { ar: 'اختر أحد وحوشك', en: 'Choose one of your monsters' },
  pickEnemyMonster: { ar: 'اختر وحش الخصم', en: 'Choose an enemy monster' },
  pickEnemyTrap: { ar: 'اختر فخ الخصم', en: 'Choose an enemy trap' },

  // --- النهاية ---
  youWin: { ar: '🏆 فزت!', en: '🏆 You win!' },
  youLose: { ar: '💀 خسرت', en: '💀 You lose' },
  someoneWins: { ar: '🏆 فاز {name}', en: '🏆 {name} wins' },
  endStats: { ar: 'عدد الأدوار: {turns} · البذرة: {seed}', en: 'Turns: {turns} · Seed: {seed}' },
  saved: { ar: 'حُفظت النتيجة', en: 'Result saved' },
  saving: { ar: 'جارٍ الحفظ…', en: 'Saving…' },
  saveSkipped: { ar: 'لم تُحفظ — قاعدة البيانات غير مهيّأة', en: 'Not saved — database not configured' },
  saveError: { ar: 'تعذّر حفظ النتيجة', en: 'Could not save the result' },
  tryHarder: { ar: 'جرّب مستوى أصعب؟', en: 'Try a harder level?' },
  tooHard: { ar: 'المستوى صعب عليك؟ غيّره وأعِد المحاولة:', en: 'Too hard? Change the level and try again:' },
  newMatch: { ar: 'مباراة جديدة', en: 'New match' },
  learnToPlay: { ar: '🎓 تعلّم اللعب', en: '🎓 Learn to play' },

  // --- المرجع السريع ---
  help1: { ar: '1 · طابِق قبل أن تلعب', en: '1 · Match before you play' },
  help1Body: {
    ar: 'انظر «العنصر الفعّال» و«الرقم» في وسط اللوحة. أي كارت تلعبه يجب أن يطابق أحدهما. الكروت ذات الإطار الأخضر في يدك هي القابلة للعب الآن، والباهتة غير مطابقة أو طاقتك لا تكفيها. الفخاخ وقطع الوحش استثناء: تُوضع دون مطابقة.',
    en: 'Look at the active element and number in the middle of the board. Any card you play must match one of them. Green-outlined cards in your hand are playable now; dimmed ones either don’t match or cost more energy than you have. Traps and Titan fragments are the exception: no matching required.',
  },
  help2: { ar: '2 · أدِر طاقتك', en: '2 · Manage your energy' },
  help2Body: {
    ar: 'الرقم في الدائرة أعلى الكارت هو تكلفته. سقف الطاقة يرتفع +1 كل دور، فالكروت القوية تصبح متاحة تدريجياً.',
    en: 'The number in the circle at the top of a card is its cost. The energy cap rises by 1 each turn, so stronger cards become available over time.',
  },
  help3: { ar: '3 · استدعِ ثم هاجم', en: '3 · Summon, then attack' },
  help3Body: {
    ar: 'يمكنك إنزال حتى {field} وحوش على الساحة. الوحش المكتوب عليه «جديد» لا يهاجم في دور استدعائه إلا بخاصية «اندفاع». للهجوم: اضغط وحشك (سيظهر الضرر المتوقّع) ثم اضغط وحش الخصم. الهجوم المباشر على اللاعب متاح فقط حين تخلو ساحته من الوحوش.',
    en: 'You can have up to {field} monsters on the field. A monster marked “New” cannot attack the turn it was summoned unless it has Rush. To attack: tap your monster (the expected damage appears), then tap an enemy monster. Attacking the player directly is only possible when their field is empty.',
  },
  help4: { ar: '4 · ادمج الهجمات', en: '4 · Combine attacks' },
  help4Body: {
    ar: 'حدّد وحشين أو أكثر يشتركان في العنصر أو الرقم (أو أحدهما بخاصية «رابط») لتضربهما معاً بمكافأة +{bonus} لكل وحش إضافي. مرة واحدة كل دور.',
    en: 'Select two or more monsters sharing an element or number (or one with Link) to strike together, with a +{bonus} bonus per extra monster. Once per turn.',
  },
  help5: { ar: '5 · كروت السحب تتكدّس', en: '5 · Draw cards stack' },
  help5Body: {
    ar: 'حين يلعب الخصم «اسحب كرتين»، إمّا أن تردّ بكارت سحب مطابق فتتضاعف العقوبة وتنتقل إليه، وإمّا أن تقبل فتسحب وتفقد دورك.',
    en: 'When the opponent plays Draw Two, you either stack a matching draw card — doubling the penalty and passing it back — or accept it, drawing and losing your turn.',
  },
  help6: { ar: '6 · طريق الحسم السريع', en: '6 · The fast path to victory' },
  help6Body: {
    ar: 'اجمع قطع الوحش الأعظم الأربع وادفع {cost} طاقة → فوز فوري.',
    en: 'Collect the four Titan fragments and pay {cost} energy → instant win.',
  },
  helpStuck: { ar: 'عالق؟', en: 'Stuck?' },
  helpStuckBody: {
    ar: 'إن لم يكن لديك أي كارت قابل للعب، يصبح زر «اسحب كارتاً» متاحاً — مرة واحدة في الدور.',
    en: 'If you have no playable card, the “Draw a card” button becomes available — once per turn.',
  },
  interactiveTutorial: { ar: '🎓 تعليم تفاعلي خطوة بخطوة', en: '🎓 Interactive step-by-step tutorial' },
  keepPlaying: { ar: 'أكمل اللعب', en: 'Keep playing' },

  // --- حالات الوحش ---
  ready: { ar: 'جاهز', en: 'Ready' },
  fresh: { ar: 'جديد', en: 'New' },
  exhausted: { ar: 'مُنهك', en: 'Exhausted' },
  monsterAria: {
    ar: '{name} — هجوم {atk}، حياة {hp} من {maxHp} — {status}',
    en: '{name} — attack {atk}, life {hp} of {maxHp} — {status}',
  },
  willLoseTurn: { ar: 'سيفقد دوره', en: 'Loses next turn' },
  netted: { ar: 'مقيّد', en: 'Netted' },
  barrierOn: { ar: 'حاجز', en: 'Barrier' },
  mirrorOn: { ar: 'مرآة', en: 'Mirror' },
  amplifiedOn: { ar: 'تضخيم', en: 'Amplify' },
  noFragments: { ar: 'لا قطع', en: 'No fragments' },
  evolvedTag: { ar: 'متطوّر', en: 'Evolved' },
  costTip: { ar: 'تكلفة الطاقة', en: 'Energy cost' },
  numberTip: { ar: 'رقم المطابقة', en: 'Matching number' },

  // --- التعليم ---
  stepOf: { ar: 'خطوة {n}/{total}', en: 'Step {n}/{total}' },
  doItHint: { ar: '↳ نفّذ الحركة أعلاه وستتقدّم الخطوة تلقائياً.', en: '↳ Do the action above and the step advances automatically.' },
  startRealMatch: { ar: 'ابدأ مباراة حقيقية', en: 'Start a real match' },
  restartTutorial: { ar: 'أعِد التعليم', en: 'Restart tutorial' },
  skipStepTip: { ar: 'إن تعثّرت، تخطَّ هذه الخطوة', en: 'If you get stuck, skip this step' },

  // --- تمرير الجهاز ---
  handDevice: { ar: 'سلّم الجهاز إلى {name}', en: 'Hand the device to {name}' },
  handHidden: { ar: 'اليد مخفيّة الآن. لا تضغط الزر إلا بعد تسليم الجهاز.', en: 'The hand is hidden. Don’t tap until the device has changed hands.' },
  revealHand: { ar: 'الجهاز مع {name} — اكشف اليد', en: '{name} has the device — reveal the hand' },

  // --- جهاز واحد ---
  hotseatTitle: { ar: '🤝 لاعبان على جهاز واحد', en: '🤝 Two players, one device' },
  hotseatTitle3: { ar: '🤝 ثلاثة لاعبين على جهاز واحد', en: '🤝 Three players, one device' },
  hotseatIntro: {
    ar: 'تلعبان بالتناوب على نفس الشاشة. بين كل دور وآخر تظهر ستارة تخفي اليد حتى يستلم اللاعب التالي الجهاز — فلا يرى أحدكما كروت الآخر.',
    en: 'Take turns on the same screen. Between turns a curtain hides the hand until the next player takes the device — so neither of you sees the other’s cards.',
  },
  hotseatIntro3: {
    ar: 'ثلاثة لاعبين بالتناوب على نفس الشاشة. بين كل دور وآخر تظهر ستارة تخفي اليد حتى يستلم التالي الجهاز.',
    en: 'Three players take turns on the same screen. Between turns a curtain hides the hand until the next player takes the device.',
  },
  playerOneName: { ar: 'اللاعب الأول', en: 'Player One' },
  playerTwoName: { ar: 'اللاعب الثاني', en: 'Player Two' },
  playerThreeNameHotseat: { ar: 'اللاعب الثالث', en: 'Player Three' },
  playerNameLabel: { ar: 'اسم {which}', en: '{which} name' },
  startGame: { ar: 'ابدأوا المباراة', en: 'Start the match' },
  hotseatCoin: {
    ar: '🎲 من يبدأ يُحدَّد بالقرعة، ومن يلعب ثانياً يأخذ كارتاً وطاقة إضافية تعويضاً.',
    en: '🎲 Who goes first is a coin toss; the second player gets an extra card and energy to compensate.',
  },

  // --- أونلاين ---
  onlineLobbyTitle: { ar: '🌐 العب مع صديقك أونلاين', en: '🌐 Play online with a friend' },
  yourName: { ar: 'اسمك', en: 'Your name' },
  yourNamePlaceholder: { ar: 'اكتب اسمك', en: 'Enter your name' },
  createRoom: { ar: 'أنشئ غرفة واحصل على رمز', en: 'Create a room and get a code' },
  orJoin: { ar: 'أو انضم لغرفة صديقك', en: 'Or join your friend’s room' },
  roomCode: { ar: 'رمز الغرفة', en: 'Room code' },
  join: { ar: 'انضمّ', en: 'Join' },
  codeLength: { ar: 'الرمز يتكوّن من {n} خانات', en: 'The code is {n} characters' },
  onlineDisabled: { ar: 'اللعب أونلاين غير مفعّل.', en: 'Online play is not enabled.' },
  needsSupabase: { ar: 'يحتاج إعدادات Supabase. يمكنكما اللعب الآن على', en: 'It needs Supabase configuration. You can still play on' },
  oneDevice: { ar: 'جهاز واحد', en: 'one device' },
  hostNote: {
    ar: 'المضيف هو من يدير المباراة، فيجب أن يبقى على الصفحة حتى تنتهي. ولا يرى أيٌّ منكما كروت الآخر: يُرسَل لكل لاعب ما يخصّه فقط.',
    en: 'The host runs the match and must stay on the page until it ends. Neither of you sees the other’s cards: each player receives only what concerns them.',
  },
  roomReady: { ar: 'غرفتك جاهزة', en: 'Your room is ready' },
  joining: { ar: 'جارٍ الدخول…', en: 'Joining…' },
  giveCode: { ar: 'أعطِ صديقك هذا الرمز:', en: 'Give your friend this code:' },
  copyInvite: { ar: '📋 انسخ رابط الدعوة', en: '📋 Copy the invite link' },
  copied: { ar: '✓ نُسخ الرابط', en: '✓ Link copied' },
  waitingFriend: { ar: 'بانتظار انضمام صديقك…', en: 'Waiting for your friend to join…' },
  waitingHost: { ar: 'بانتظار أن يبدأ المضيف…', en: 'Waiting for the host to start…' },
  roomLifetime: {
    ar: 'تبقى المباراة قائمة ما دام المضيف على الصفحة. إن أغلقها انتهت الغرفة.',
    en: 'The match lives as long as the host stays on the page. If they close it, the room ends.',
  },
  youAreHost: { ar: '🖥️ أنت المضيف', en: '🖥️ You are the host' },
  youAreGuest: { ar: '🎮 أنت الضيف', en: '🎮 You are the guest' },
  opponentIs: { ar: 'الخصم: {name}', en: 'Opponent: {name}' },
  connected: { ar: 'متصل', en: 'Connected' },
  disconnected: { ar: 'انقطع الاتصال — بانتظار العودة', en: 'Disconnected — waiting to reconnect' },
  requestNewMatch: { ar: 'اطلب مباراة جديدة', en: 'Request a new match' },
  requestNewMatchTip: { ar: 'يطلب من المضيف بدء مباراة جديدة', en: 'Asks the host to start a new match' },
  onlineUnavailable: { ar: 'اللعب أونلاين غير متاح', en: 'Online play unavailable' },
  connectFailed: { ar: 'تعذّر الاتصال', en: 'Connection failed' },
  backToRooms: { ar: 'عُد للغرف', en: 'Back to rooms' },
  invalidCode: { ar: 'رمز الغرفة غير صالح', en: 'Invalid room code' },
  roomConnectError: { ar: 'تعذّر الاتصال بالغرفة', en: 'Could not connect to the room' },
  guest: { ar: 'الضيف', en: 'Guest' },
  host: { ar: 'المضيف', en: 'Host' },
  player: { ar: 'لاعب', en: 'Player' },
  you: { ar: 'أنت', en: 'You' },
  aiOpponent: { ar: 'الخصم الآلي', en: 'AI opponent' },
  aiOpponentN: { ar: 'الخصم الآلي {n}', en: 'AI opponent {n}' },
  coach: { ar: 'المدرّب', en: 'Coach' },

  // --- الكروت ---
  catalogTitle: { ar: 'كتالوج السطح', en: 'Deck catalog' },
  catalogCount: {
    ar: '{total} كارتاً · {monster} وحش · {action} حركة · {trap} فخ · {spell} سحر · {fragment} قطع',
    en: '{total} cards · {monster} monsters · {action} actions · {trap} traps · {spell} spells · {fragment} fragments',
  },
  filterAll: { ar: 'الكل', en: 'All' },
  filterMonsters: { ar: 'وحوش', en: 'Monsters' },
  filterActions: { ar: 'حركة', en: 'Actions' },
  filterTraps: { ar: 'فخاخ', en: 'Traps' },
  filterSpells: { ar: 'سحر', en: 'Spells' },
  filterFragments: { ar: 'قطع الوحش', en: 'Fragments' },
  allElements: { ar: 'كل العناصر', en: 'All elements' },
  searchPlaceholder: { ar: 'ابحث بالاسم أو النص…', en: 'Search by name or text…' },
  designsCount: { ar: '{designs} تصميماً · {copies} كارتاً في السطح', en: '{designs} designs · {copies} cards in the deck' },

  // --- السجل ---
  historyTitle: { ar: 'سجل المباريات', en: 'Match history' },
  wins: { ar: 'الانتصارات:', en: 'Wins:' },
  losses: { ar: 'الهزائم:', en: 'Losses:' },
  lastN: { ar: 'آخر {n} مباراة', en: 'Last {n} matches' },
  noMatches: { ar: 'لا مباريات بعد.', en: 'No matches yet.' },
  startOne: { ar: 'ابدأ واحدة', en: 'Start one' },
  win: { ar: '🏆 فوز', en: '🏆 Win' },
  loss: { ar: '💀 خسارة', en: '💀 Loss' },
  turnsCount: { ar: '{n} دوراً', en: '{n} turns' },
  replaySeed: { ar: 'أعِد اللعب (بذرة {seed})', en: 'Replay (seed {seed})' },
  replayTip: { ar: 'أعِد لعب نفس التوزيع', en: 'Replay the same deal' },
  dbNotConfigured: { ar: 'قاعدة البيانات غير مهيّأة بعد.', en: 'The database is not configured yet.' },
  dbHint: {
    ar: 'اللعبة تعمل بالكامل بدون قاعدة بيانات. لتفعيل حفظ النتائج، أضف متغيّرات البيئة التالية ثم شغّل الترحيل في',
    en: 'The game works fully without a database. To enable saving results, add these environment variables and run the migration in',
  },

  // --- غير متصل ---
  offlineTitle: { ar: 'لا يوجد اتصال', en: 'No connection' },
  offlineBody: {
    ar: 'هذه الصفحة تحتاج إنترنت. لكن المباريات ضد الخصم الآلي والتعليم واللعب على جهاز واحد تعمل دون اتصال.',
    en: 'This page needs the internet. But AI matches, the tutorial, and one-device play all work offline.',
  },
  quickMatch: { ar: 'مباراة سريعة', en: 'Quick match' },
  tutorial: { ar: 'التعليم', en: 'Tutorial' },

  // --- اللغة والصوت ---
  language: { ar: 'اللغة', en: 'Language' },
  soundOn: { ar: 'الصوت مُفعَّل — اضغط للكتم', en: 'Sound on — tap to mute' },
  soundOff: { ar: 'الصوت مكتوم — اضغط للتفعيل', en: 'Sound muted — tap to unmute' },

  // --- دليل اللعب ---
  guideTitle: { ar: '🎓 دليل اللاعب', en: '🎓 Player guide' },
  guideSubtitle: {
    ar: 'كل ما تحتاجه لتفهم اللعبة: طابور التدفق، العنصر الفعّال، دمج البطاقات، وأسرار لا تُذكر في القواعد.',
    en: 'Everything you need: the flow pile, the active element, combining cards, and secrets the rules never mention.',
  },
  openGuide: { ar: '📖 دليل اللاعب والأسرار', en: '📖 Player guide & secrets' },
  guideBack: { ar: '⟶ الدليل الكامل', en: '⟶ Full guide' },
  secretLabel: { ar: 'سرّ', en: 'Secret' },

  // --- مهلة الجولة ---
  turnLength: { ar: 'مدّة الجولة', en: 'Turn length' },
  turnLengthHint: {
    ar: 'إن انتهت المهلة يلعب الكمبيوتر عنك ثم يُنهي الدور. أقلّ مدّة {min} ثانية.',
    en: 'When time runs out the computer plays for you, then ends the turn. Minimum {min} seconds.',
  },
  autoPlaying: { ar: 'الكمبيوتر يلعب عنك…', en: 'The computer is playing for you…' },
  seconds: { ar: '{n} ث', en: '{n}s' },
  minute: { ar: 'دقيقة', en: '1 min' },
  turnClockTip: { ar: 'مهلة الجولة {n} ثانية', en: 'Turn limit: {n} seconds' },

  // --- دردشة الغرفة ---
  chatTitle: { ar: 'الدردشة', en: 'Chat' },
  chatOpen: { ar: 'افتح الدردشة', en: 'Open chat' },
  chatClose: { ar: 'أغلق الدردشة', en: 'Close chat' },
  chatPlaceholder: { ar: 'اكتب رسالة…', en: 'Write a message…' },
  chatSend: { ar: 'إرسال', en: 'Send' },
  chatEmpty: { ar: 'لا رسائل بعد — قل مرحباً.', en: 'No messages yet — say hello.' },
  chatRoster: { ar: 'اللاعبون', en: 'Players' },
  chatWaitingPeers: { ar: 'بانتظار انضمام الآخرين…', en: 'Waiting for others to join…' },
  chatJoinVoice: { ar: 'انضم للصوت (الميكروفون يبدأ مكتوماً)', en: 'Join voice (mic starts muted)' },
  chatLeaveVoice: { ar: 'غادر الصوت', en: 'Leave voice' },
  chatMicOn: { ar: 'الميكروفون مفتوح — اضغط للكتم', en: 'Mic on — tap to mute' },
  chatMicOff: { ar: 'الميكروفون مكتوم — اضغط للتفعيل', en: 'Mic muted — tap to unmute' },
  chatDeafenOn: { ar: 'سماعاتك مكتومة — لن تسمع أحداً', en: 'Speakers muted — you won’t hear anyone' },
  chatDeafenOff: { ar: 'السماعات تعمل — اضغط لكتم كل الأصوات الواردة', en: 'Speakers on — tap to mute all incoming voice' },
  chatMutePeer: {
    ar: 'كتم {name} — لن تسمع صوته ولن ترى رسائله',
    en: 'Mute {name} — you won’t hear their voice or see their messages',
  },
  chatUnmutePeer: { ar: 'إلغاء كتم {name}', en: 'Unmute {name}' },
  chatVoiceOn: { ar: 'في الصوت', en: 'In voice' },
  chatMicDenied: {
    ar: 'المتصفّح رفض الميكروفون. اسمح بالوصول ثم أعد المحاولة.',
    en: 'The browser blocked the microphone. Allow access and try again.',
  },
  chatMicError: { ar: 'تعذّر فتح الميكروفون.', en: 'Could not open the microphone.' },
  chatVoiceUnsupported: { ar: 'الصوت غير مدعوم في هذا المتصفّح.', en: 'Voice is not supported in this browser.' },
  chatIceFailed: {
    ar: 'تعذّر اتصال الصوت على هذه الشبكة (قد تحتاج TURN). الدردشة النصية ما زالت تعمل.',
    en: 'Voice could not connect on this network (TURN may be required). Text chat still works.',
  },
  chatConnecting: { ar: 'جارٍ ربط الدردشة…', en: 'Connecting chat…' },
  chatConnected: { ar: 'الدردشة متصلة', en: 'Chat connected' },
  chatUnread: { ar: '{n} رسالة جديدة', en: '{n} new messages' },

  // --- تفاصيل الكارت والخصائص ---
  cardEffect: { ar: 'ما يفعله الكارت', en: 'What the card does' },
  whyLocked: { ar: 'لماذا لا يمكن لعبه الآن', en: 'Why you can’t play it now' },
  holdForDetails: { ar: 'اضغط مطوّلاً على أي كارت لشرحه', en: 'Hold any card to see what it does' },
  abilitiesTitle: { ar: '✨ خصائص الوحوش — ماذا تعني؟', en: '✨ Monster abilities — what they mean' },
  abilitiesIntro: {
    ar: 'الكلمة المكتوبة أسفل الوحش هي خاصيته، وتعمل تلقائياً في لحظتها. اضغط مطوّلاً على أي كارت داخل المباراة لترى شرحه.',
    en: 'The word under a monster is its ability, and it fires automatically at its moment. Hold any card during a match to read its explanation.',
  },
} as const satisfies Record<string, Localized>;

export type UIKey = keyof typeof UI;

/** أسباب منع اللعب/الهجوم كما يعيدها المحرّك */
export const REASONS: Record<string, Localized> = {
  ended: { ar: 'انتهت المباراة', en: 'The match has ended' },
  not_your_turn: { ar: 'ليس دورك', en: 'Not your turn' },
  not_in_hand: { ar: 'الكارت ليس في يدك', en: 'That card is not in your hand' },
  must_respond_draw: {
    ar: 'يجب الرد بكارت سحب أو قبول العقوبة',
    en: 'You must stack a draw card or accept the penalty',
  },
  no_match_flow: { ar: 'لا يطابق طابور التدفق', en: 'Does not match the flow pile' },
  not_enough_energy: { ar: 'طاقة غير كافية', en: 'Not enough energy' },
  field_full: { ar: 'الساحة ممتلئة (الحد {n} وحوش)', en: 'Your field is full ({n} monsters max)' },
  traps_full: { ar: 'خانات الفخاخ ممتلئة (الحد {n})', en: 'All trap slots are full ({n} max)' },
  already_own_fragment: { ar: 'تملك هذه القطعة بالفعل', en: 'You already own this fragment' },
  no_match: { ar: 'لا يطابق العنصر ولا الرقم', en: 'Matches neither the element nor the number' },
  no_own_monster: { ar: 'لا يوجد وحش لك', en: 'You have no monster' },
  no_enemy_monster: { ar: 'لا يوجد وحش للخصم', en: 'The opponent has no monster' },
  no_enemy_traps: { ar: 'لا فخاخ لدى الخصم', en: 'The opponent has no traps' },
  no_discard_monster: { ar: 'لا وحوش في المهملات', en: 'No monsters in the discard pile' },
  pick_attacker: { ar: 'اختر مهاجماً', en: 'Select an attacker' },
  netted: { ar: 'مقيّد بالشبكة هذا الدور', en: 'Netted this turn' },
  invalid_attacker: { ar: 'مهاجم غير صالح', en: 'Invalid attacker' },
  combo_used: { ar: 'استُخدم الهجوم المشترك هذا الدور', en: 'Combo already used this turn' },
  combo_requires: {
    ar: 'الدمج يتطلّب نفس العنصر أو نفس الرقم أو وحشاً بخاصية «رابط»',
    en: 'A combo needs a shared element, a shared number, or a monster with Link',
  },
  monster_sick: { ar: 'هذا الوحش حديث الاستدعاء', en: 'This monster was just summoned' },
  monster_exhausted: { ar: 'هذا الوحش مُنهك', en: 'This monster is exhausted' },
  need_fragments: { ar: 'تحتاج القطع الأربع أولاً', en: 'You need all four fragments first' },
  need_energy: { ar: 'طاقة غير كافية للاستدعاء', en: 'Not enough energy to summon' },
};
