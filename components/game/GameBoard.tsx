'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { aiChooseAction, stampAutoPlay } from '@/lib/game/ai';
import { advanceTally, emptyTally, tallyToPayload, type MatchTally } from '@/lib/game/stats';
import {
  ELEMENT_ICON,
  ELEMENT_NAME,
  ELEMENTS,
  HAND_KIND_ORDER,
  HIDDEN_CARD_ID,
  TITAN,
  def,
} from '@/lib/game/cards';
import {
  RULES,
  applyGameAction,
  canPlayCard,
  canSummonTitan,
  createGame,
  evaluateAttack,
  isPerfectMatch,
  matchesFlow,
} from '@/lib/game/engine';
import { pickBattleFx, type BattleFx } from '@/lib/game/battleFx';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  type Difficulty,
} from '@/lib/game/difficulty';
import {
  TUTORIAL_SCRIPT,
  TUTORIAL_SEED,
  TUTORIAL_STEPS,
  type TutorialFocus,
} from '@/lib/game/tutorial';
import type { CardDef, CardInstance, GameAction, GameState, PlayableElement, Seat, SetTrap } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEFAULT_TURN_SECONDS } from '@/lib/multiplayer/turnClock';
import { playSfx, primeAudio } from '@/lib/audio/sfx';
import { pickSfx } from '@/lib/audio/logSfx';
import LanguageSwitch from '@/components/LanguageSwitch';
import SoundToggle from '@/components/SoundToggle';
import CardDetail from './CardDetail';
import CardView, { ELEMENT_HEX } from './CardView';
import Battlefield from './Battlefield';
import { ArenaBackdrop, TitanCinematic } from './ArenaArt';
import { BattleLog, BoardStatus, ElementLegend, FlowBadge, MonsterDetails, QuickGuide, SideCard } from './MatchPanels';
import LoadoutScreen from './LoadoutScreen';
import { WEATHER_BY_ID } from '@/lib/game/loadout';
import TurnClock from './TurnClock';

type Pending =
  | { kind: 'element'; uid: string }
  | { kind: 'target'; uid: string; need: NonNullable<ReturnType<typeof def>['needsTarget']> }
  | null;

const LOG_PREF_KEY = 'mto-match-log';
let logPref: boolean | null = null;
const logPrefListeners = new Set<() => void>();

function readLogPref(): boolean {
  if (logPref !== null) return logPref;
  try {
    const stored = window.localStorage.getItem(LOG_PREF_KEY);
    if (stored === 'on') logPref = true;
    else if (stored === 'off') logPref = false;
    // بلا تفضيل محفوظ: الشاشات العريضة كانت تعرض السجل دائماً، والجوال يخفيه
    else logPref = window.matchMedia('(min-width: 1024px)').matches;
  } catch {
    logPref = false;
  }
  return logPref;
}

function writeLogPref(on: boolean): void {
  logPref = on;
  try {
    window.localStorage.setItem(LOG_PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* التخزين قد يكون معطّلاً — الإعداد يبقى لهذه الجلسة */
  }
  for (const listener of logPrefListeners) listener();
}

function subscribeLogPref(listener: () => void): () => void {
  logPrefListeners.add(listener);
  return () => logPrefListeners.delete(listener);
}

/** أسماء اللاعبين تُلتقط بلغة الواجهة وقت الإنشاء لأنها تُخزَّن في الحالة */
function newGame(
  seed: number | undefined,
  tutorial: boolean,
  difficulty: Difficulty,
  names: { you: string; ai: string; coach: string; ai2: string },
  playerCount: number
): GameState {
  return tutorial
    ? createGame({
        seed: TUTORIAL_SEED,
        playerName: names.you,
        opponentName: names.coach,
        opponentIsAI: true,
        script: TUTORIAL_SCRIPT,
        difficulty: 'easy',
        firstPlayer: 0,
      })
    : createGame({
        seed,
        playerName: names.you,
        opponentName: names.ai,
        opponentIsAI: true,
        difficulty,
        playerCount,
        roster:
          playerCount >= 3
            ? [
                { name: names.you, isAI: false },
                { name: names.ai, isAI: true },
                { name: names.ai2, isAI: true },
              ]
            : undefined,
      });
}

export interface GameBoardProps {
  seed?: number;
  tutorial?: boolean;
  difficulty?: Difficulty;
  /** خانة اللاعب على اللوحة — تتغيّر في اللعب الجماعي */
  mySeat?: Seat;
  /**
   * وضع مُدار من الخارج (اللعب الجماعي): الحالة تأتي جاهزة والحركات تُرسَل
   * إلى الحَكَم بدل تطبيقها محلياً.
   */
  externalState?: GameState;
  onAction?: (action: GameAction) => void;
  /** تمرير الجهاز بين لاعبَين على نفس الشاشة */
  hotseat?: boolean;
  /** عدد اللاعبين في مباراة ضد الآلي (2 أو 3) */
  playerCount?: number;
  /** مُنشئ مباراة مخصّص (أسماء اللاعبين مثلاً) — يُستعمل أيضاً عند «مباراة جديدة» */
  makeGame?: () => GameState;
  /** شريط معلومات إضافي أعلى اللوحة (حالة الغرفة مثلاً) */
  banner?: React.ReactNode;
  /** يستبدل أزرار نافذة النهاية */
  endActions?: React.ReactNode;
  /** مهلة الجولة بالثواني — عند انتهائها يلعب الكمبيوتر عن اللاعب الحالي */
  turnSeconds?: number;
  /** رمز الغرفة في اللعب الجماعي — يُشتقّ منه معرّف المباراة المشترك */
  roomCode?: string;
  /** أسماء الخصوم لسجلّ الحساب */
  opponentNames?: string[];
}

export default function GameBoard({
  seed,
  tutorial = false,
  difficulty = DEFAULT_DIFFICULTY,
  mySeat,
  externalState,
  onAction,
  hotseat = false,
  playerCount = 2,
  makeGame,
  banner,
  endActions,
  roomCode,
  opponentNames,
  turnSeconds = DEFAULT_TURN_SECONDS,
}: GameBoardProps) {
  const { t, L, logText, outcomeText, reason, name: pname } = useLocale();
  const [level, setLevel] = useState<Difficulty>(difficulty);
  const names = { you: '@you', ai: '@ai', coach: '@coach', ai2: '@ai2' };
  const [internalGame, setInternalGame] = useState<GameState>(
    () => makeGame?.() ?? newGame(seed, tutorial, difficulty, names, playerCount)
  );
  const controlled = externalState !== undefined;
  const game = controlled ? externalState : internalGame;
  const setGame = setInternalGame;

  // في تمرير الجهاز تتبع الخانة صاحبَ الدور، وفي اللعب الجماعي تكون ثابتة
  const ME: Seat = hotseat ? game.current : (mySeat ?? 0);
  const foeSeats: Seat[] = game.players.map((_, i) => i).filter((i) => i !== ME);
  const FOE: Seat = foeSeats[0] ?? (ME === 0 ? 1 : 0);
  const [step, setStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  /** قائمة العناصر المنبثقة — على الهاتف بدل اللوحة الجانبية */
  const [showElements, setShowElements] = useState(false);
  /** الوحش المعروضة تفاصيله، مع رقم الدور الذي فُتح فيه */
  const [inspect, setInspect] = useState<{ uid: string; turn: number } | null>(null);
  /** كارت مفتوح شرحه (ضغط مطوّل أو ضغطة على كارت لا يمكن لعبه أو اطّلاع على فخ) */
  const [detail, setDetail] = useState<{ card: CardDef; reason?: string; peekUid?: string } | null>(
    null
  );
  const [attackers, setAttackers] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleFx | null>(null);
  const [strikeDelta, setStrikeDelta] = useState<Record<string, { dx: number; dy: number }>>({});
  const [fly, setFly] = useState<{ left: number; top: number; tx: number; ty: number } | null>(null);
  const showLog = useSyncExternalStore(subscribeLogPref, readLogPref, () => false);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'skipped' | 'error'
  >('idle');

  /**
   * ستارة تمرير الجهاز: تُشتقّ من الحالة بلا مؤثّر جانبي — تظهر كلّما تغيّر
   * رقم الدور عمّا أقرّ اللاعب استلامه، فلا يرى القادمُ يدَ من قبله.
   */
  const [readyTurn, setReadyTurn] = useState(-1);
  const showCurtain = hotseat && game.phase !== 'ended' && readyTurn !== game.turn;

  /** آخر سطر سجل صدر صوته — الأصوات تُشتقّ من السجل فتغطّي دور الخصم أيضاً */
  const lastSfxIndex = useRef(0);

  const aiSteps = useRef<{ turn: number; n: number }>({ turn: -1, n: 0 });
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayingRef = useRef(false);
  const autoPlayTurnRef = useRef<number | null>(null);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const savedRef = useRef(false);
  /** حصيلة ما لعبتَه — تُجمَّع تزايدياً لأن السجل يُقصّ عند 200 سطر */
  const tallyRef = useRef<MatchTally>(emptyTally());
  const boardRef = useRef<HTMLDivElement>(null);

  const me = game.players[ME];
  const foe = game.players[FOE];
  const myTurn = game.current === ME && game.phase !== 'ended';
  const canAct = myTurn && !autoPlaying;
  const turnLimit = Number(turnSeconds) > 0 ? Number(turnSeconds) : DEFAULT_TURN_SECONDS;
  const clockOn =
    !tutorial &&
    !controlled &&
    !autoPlaying &&
    game.phase !== 'ended' &&
    !game.players[game.current]?.isAI &&
    !(hotseat && readyTurn !== game.turn);
  const clockEpochKey = clockOn ? `${game.seed}:${game.clockEpoch}` : '';

  useEffect(() => {
    if (showCurtain) setDetail(null);
  }, [showCurtain]);

  const flash = useCallback((msg: string) => {
    playSfx('error');
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1900);
  }, []);

  /** يتقدّم بخطوات الدرس التي تحقّق شرطها في الحالة الجديدة (قد تكتمل أكثر من خطوة بحركة واحدة) */
  const advanceLesson = useCallback((next: GameState) => {
    setStep((cur) => {
      let i = cur;
      while (i < TUTORIAL_STEPS.length - 1) {
        const s = TUTORIAL_STEPS[i];
        if (s.manual || !s.done || !s.done(next)) break;
        i++;
      }
      return i;
    });
  }, []);

  const dispatch = useCallback(
    (action: GameAction) => {
      if (autoPlayingRef.current) return;
      setAttackers([]);
      setPending(null);
      // الوضع المُدار من الخارج: الحَكَم هو من يطبّق الحركة، لا هذه الشاشة
      if (controlled) {
        onAction?.(action);
        return;
      }
      const next = applyGameAction(game, action);
      setGame(next);
      if (tutorial) advanceLesson(next);
    },
    [controlled, onAction, game, setGame, tutorial, advanceLesson]
  );

  // ---------- حلقة الخصم الآلي + اللعب التلقائي عند انتهاء المهلة ----------
  useEffect(() => {
    if (controlled) return;
    if (game.phase === 'ended') {
      if (autoPlaying) {
        autoPlayingRef.current = false;
        setAutoPlaying(false);
      }
      return;
    }

    if (autoPlaying && autoPlayTurnRef.current !== game.turn) {
      autoPlayingRef.current = false;
      setAutoPlaying(false);
    }

    const seatIsAI = game.players[game.current].isAI;
    const thisTurnAuto = autoPlayingRef.current && autoPlayTurnRef.current === game.turn;
    if (hotseat && !thisTurnAuto) return;
    if (!seatIsAI && !thisTurnAuto) return;

    if (aiSteps.current.turn !== game.turn) aiSteps.current = { turn: game.turn, n: 0 };

    const timer = window.setTimeout(() => {
      // في التعليم لا يهاجم المدرّب — يمرّر دوره ليبقى الدرس متوقّعاً
      if (tutorial && seatIsAI && !thisTurnAuto) {
        const action =
          game.phase === 'respond'
            ? ({ type: 'ACCEPT_DRAW' } as const)
            : ({ type: 'END_TURN' } as const);
        const next = applyGameAction(game, action);
        setGame(next);
        advanceLesson(next);
        return;
      }
      setGame((g) => {
        if (g.phase === 'ended') return g;
        const playingAI = g.players[g.current].isAI;
        const playingAuto = autoPlayingRef.current && autoPlayTurnRef.current === g.turn;
        if (!playingAI && !playingAuto) return g;
        aiSteps.current.n += 1;
        const force =
          g.phase === 'respond'
            ? ({ type: 'ACCEPT_DRAW' } as const)
            : ({ type: 'END_TURN' } as const);
        const action = aiSteps.current.n > 40 ? force : aiChooseAction(g);
        return applyGameAction(g, action);
      });
    }, game.phase === 'respond' ? 500 : 900);

    return () => window.clearTimeout(timer);
  }, [game, tutorial, advanceLesson, controlled, hotseat, setGame, autoPlaying]);

  // ---------- مهلة الجولة: عند الصفر يلعب الكمبيوتر عن اللاعب البشري ----------
  useEffect(() => {
    if (!clockOn) {
      setTurnDeadline(null);
      return;
    }
    // الحقبة لا رقم الدور: «تخطي» يقفز بالدور دون أن ينقله لشخص آخر
    const expectedEpoch = game.clockEpoch;
    setTurnDeadline(Date.now() + turnLimit * 1000);
    const timer = window.setTimeout(() => {
      const g = gameRef.current;
      if (g.phase === 'ended' || g.players[g.current].isAI) return;
      if (g.clockEpoch !== expectedEpoch) return;
      if (autoPlayingRef.current) return;
      autoPlayingRef.current = true;
      autoPlayTurnRef.current = g.turn;
      setAutoPlaying(true);
      setPending(null);
      setAttackers([]);
      setGame((prev) => {
        if (prev.phase === 'ended' || prev.players[prev.current].isAI) {
          autoPlayingRef.current = false;
          autoPlayTurnRef.current = null;
          queueMicrotask(() => setAutoPlaying(false));
          return prev;
        }
        if (prev.clockEpoch !== expectedEpoch) {
          autoPlayingRef.current = false;
          autoPlayTurnRef.current = null;
          queueMicrotask(() => setAutoPlaying(false));
          return prev;
        }
        return stampAutoPlay(prev);
      });
    }, turnLimit * 1000);
    return () => window.clearTimeout(timer);
  }, [clockOn, clockEpochKey, turnLimit, game.clockEpoch, setGame]);

  // ---------- حصيلة ما لعبتَه (لإحصاءات الحساب) ----------
  useEffect(() => {
    if (tutorial) return;
    tallyRef.current = advanceTally(tallyRef.current, game.log, game.logSeq, ME);
  }, [game.logSeq, game.log, tutorial, ME]);

  // ---------- حفظ نتيجة المباراة ----------
  useEffect(() => {
    // التعليم لا يُسجَّل، واللعب على جهاز واحد لا صاحب له
    if (tutorial || hotseat) return;
    // اللعب الجماعي يحتاج رمز غرفة ليُشتقّ منه معرّف مشترك بين المقاعد
    if (controlled && !roomCode) return;
    if (game.phase !== 'ended' || savedRef.current) return;
    savedRef.current = true;
    setSaveState('saving');
    const tally = tallyRef.current;
    const stats = {
      cards: tallyToPayload(tally),
      titans: tally.titans,
      trapsSet: tally.trapsSet,
    };
    const online = controlled && roomCode;
    fetch(online ? '/api/matches/online' : '/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        online
          ? {
              roomCode,
              seed: game.seed,
              seat: ME,
              playerCount: game.players.length,
              result: game.winner === ME ? 'win' : 'loss',
              turns: game.turn,
              hpLeft: me.hp,
              reason: game.winReason?.key ?? null,
              opponents: opponentNames ?? [],
              stats,
            }
          : {
              seed: game.seed,
              turns: game.turn,
              winner: game.winner === ME ? 'player' : 'ai',
              reason: game.winReason?.key ?? null,
              playerHp: me.hp,
              opponentHp: foe.hp,
              difficulty: game.difficulty,
              stats,
            }
      ),
    })
      // الحالة 202 تعني أن قاعدة البيانات غير مهيّأة — ليست نجاحاً في الحفظ
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as { saved?: boolean } | null;
        if (!r.ok) return setSaveState('error');
        setSaveState(body?.saved ? 'saved' : 'skipped');
      })
      .catch(() => setSaveState('error'));
  }, [
    tutorial,
    controlled,
    hotseat,
    game.phase,
    game.seed,
    game.turn,
    game.winner,
    game.winReason,
    game.difficulty,
    me.hp,
    foe.hp,
    ME,
    roomCode,
    opponentNames,
    game.players.length,
  ]);

  // المتصفّحات لا تسمح بالصوت قبل تفاعل المستخدم
  useEffect(() => primeAudio(), []);

  // صوت وحركة لكل ما استجدّ في السجل منذ آخر رسم
  useEffect(() => {
    const from = lastSfxIndex.current;
    if (game.log.length < from) lastSfxIndex.current = 0; // مباراة جديدة
    const fresh = game.log.slice(lastSfxIndex.current);
    lastSfxIndex.current = game.log.length;
    if (!fresh.length) return;
    for (const name of pickSfx(fresh, ME, game.winner)) playSfx(name);
    const fx = pickBattleFx(fresh);
    if (fx) setBattle(fx);
  }, [game.log, ME, game.winner]);

  useEffect(() => {
    if (!battle) return;
    const ms = 1400;
    const timer = window.setTimeout(() => {
      setBattle(null);
      setStrikeDelta({});
      setFly(null);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [battle]);

  useLayoutEffect(() => {
    if (!battle || !boardRef.current) return;
    const root = boardRef.current;
    const center = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    if (battle.type === 'strike') {
      const faceSel =
        battle.target === 'face'
          ? `[data-face="p${
              battle.targetSeat ?? (battle.entry.side === ME ? FOE : ME)
            }"]`
          : null;
      const targetEl = faceSel
        ? root.querySelector(faceSel)
        : root.querySelector(`[data-uid="${battle.target}"]`) ??
          root.querySelector(`[data-field="p${battle.targetSeat ?? FOE}"]`);
      const dest = center(targetEl);
      if (!dest) return;
      const next: Record<string, { dx: number; dy: number }> = {};
      for (const uid of battle.strikers) {
        const origin = center(root.querySelector(`[data-uid="${uid}"]`));
        if (!origin) continue;
        next[uid] = { dx: (dest.x - origin.x) * 0.72, dy: (dest.y - origin.y) * 0.72 };
      }
      setStrikeDelta(next);
      return;
    }

    const fromEl =
      battle.entry.side === ME
        ? root.querySelector('[data-hand]')
        : root.querySelector(`[data-field="p${battle.entry.side}"]`);
    const toEl =
      battle.dest === 'flow'
        ? root.querySelector('[data-flow]')
        : root.querySelector(`[data-field="p${battle.entry.side}"] [data-uid]:last-of-type`) ??
          root.querySelector(`[data-field="p${battle.entry.side}"]`);
    const from = center(fromEl) ?? { x: window.innerWidth / 2, y: window.innerHeight - 80 };
    const to = center(toEl) ?? from;
    setFly({ left: from.x - 43, top: from.y - 61, tx: to.x - from.x, ty: to.y - from.y });
  }, [battle, ME, FOE]);

  // ---------- مساعدات ----------
  const playableUids = useMemo(() => {
    const set = new Set<string>();
    if (!canAct) return set;
    for (const c of me.hand) if (canPlayCard(game, ME, c.uid).ok) set.add(c.uid);
    return set;
  }, [game, me.hand, canAct, ME]);

  /**
   * ترتيب اليد على ثلاثة مستويات: القابل للعب أوّلاً، ثم داخل كل مجموعة حسب
   * النوع (وحوش ثم أفخاخ ثم البقية)، ثم الأرخص تكلفةً أوّلاً — فتتجمّع الكروت
   * المتشابهة وتتدرّج بالتكلفة. المعيار يتجاهل «هل الدور دورك» عمداً، وإلا
   * انقلب الترتيب مع كل انتقال دور فتضيع الكروت من تحت عين اللاعب. الرتبة
   * الأخيرة هي الترتيب الأصلي (Array.sort ثابت).
   */
  const orderedHand = useMemo(() => {
    const rank = (uid: string) => (canPlayCard(game, ME, uid, true).ok ? 0 : 1);
    const kindRank = (defId: string) => HAND_KIND_ORDER[def(defId).kind] ?? 99;
    return me.hand
      .map((c, i) => ({ c, i, r: rank(c.uid), k: kindRank(c.defId), cost: def(c.defId).cost }))
      .sort((a, b) => a.r - b.r || a.k - b.k || a.cost - b.cost || a.i - b.i)
      .map((x) => x.c);
  }, [game, me.hand, ME]);

  /** فصل ثابت عن الدور: الكروت القانونية أعلى، والموقوفة أسفل — بلا قفز عند تبدّل الدور */
  const legalUids = useMemo(() => {
    const set = new Set<string>();
    for (const c of me.hand) if (canPlayCard(game, ME, c.uid, true).ok) set.add(c.uid);
    return set;
  }, [game, me.hand, ME]);
  const playableHand = useMemo(
    () => orderedHand.filter((c) => legalUids.has(c.uid)),
    [orderedHand, legalUids]
  );
  const parkedHand = useMemo(
    () => orderedHand.filter((c) => !legalUids.has(c.uid)),
    [orderedHand, legalUids]
  );

  /**
   * الكروت التي وصلت اليد للتوّ — تُبرَز ويُمرَّر الشريط إليها.
   * الحساب أثناء العرض بمقارنة اللقطة السابقة (نمط React لضبط الحالة عند
   * تغيّر المدخلات) لأن الحالة قد تأتي من الشبكة لا من حركة محلّية.
   */
  const handKey = me.hand.map((c) => c.uid).join(',');
  const [prevHandKey, setPrevHandKey] = useState(handKey);
  const [freshUids, setFreshUids] = useState<string[]>([]);
  if (prevHandKey !== handKey) {
    const before = new Set(prevHandKey ? prevHandKey.split(',') : []);
    const added = me.hand.map((c) => c.uid).filter((u) => !before.has(u));
    setPrevHandKey(handKey);
    setFreshUids(added);
  }

  const handArea = useRef<HTMLDivElement>(null);
  const freshKey = freshUids.join(',');

  /**
   * بداية دورك: أعِد شريط اليد إلى أوّله.
   * اليد مرتّبة بالقابل للعب أولاً، فالبداية هي أهمّ ما تحتاج رؤيته —
   * ولو بقي الشريط حيث تركته لبدأ الدور على كارت لا يعنيك.
   */
  /** لحظة بداية دورك — يُستعمل ليُسكِت تمرير «الكارت الجديد» في اللحظة نفسها */
  const turnStartAt = useRef(0);
  useEffect(() => {
    if (!myTurn) return;
    turnStartAt.current = Date.now();
    const scroller = handArea.current?.querySelector(
      '[data-hand-scroller]'
    );
    scroller?.firstElementChild?.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  }, [game.turn, myTurn]);

  // تمرير الشريط إلى أول كارت جديد، ثم إطفاء الإبراز
  useEffect(() => {
    if (!freshUids.length) return;
    const node = handArea.current?.querySelector<HTMLElement>(
      '[data-hand-scroller] [data-fresh="1"]'
    );
    /*
      في بداية الدور يُسحب كارتٌ جديد، وكان هذا التمرير يلحق به فيسحب اليد
      نحو اليسار — إلى آخرها حيث يقع الكارت المسحوب — بعد أن أعادها المؤثّر
      السابق إلى أوّلها يميناً. فيبدأ الدور على الكروت الموقوفة لا القابلة
      للعب. عند بداية الدور يكفي الإبراز، ويبقى الشريط على أوّله.
    */
    if (Date.now() - turnStartAt.current > 1200) {
      node?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    const timer = window.setTimeout(() => setFreshUids([]), 2200);
    return () => window.clearTimeout(timer);
    // freshKey يمثّل المجموعة نفسها بصورة قابلة للمقارنة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey]);

  const comboPreview = useMemo(
    () => (attackers.length ? evaluateAttack(game, ME, attackers) : null),
    [game, attackers, ME]
  );

  const titanCheck = canSummonTitan(game, ME);
  // مرة كل دور، سواءٌ أكان في اليد ما يُلعب أم لا
  const canRescueDraw = canAct && game.phase === 'main' && !me.extraDrawUsed;

  const discardMonsters = useMemo(
    () => game.discard.filter((c) => def(c.defId).kind === 'monster'),
    [game.discard]
  );

  // ---------- التفاعل ----------
  function onHandCard(uid: string) {
    const card = def(game.players[ME].hand.find((c) => c.uid === uid)!.defId);
    const check = canPlayCard(game, ME, uid);
    // الكارت الممنوع: افتح شرحه بدل إطلاق رسالة خطأ تختفي
    if (!canAct || !check.ok) {
      setDetail({
        card,
        reason: autoPlaying
          ? t('autoPlaying')
          : canAct
            ? reason(check.reason) || t('cannotPlay')
            : t('waitYourTurn'),
      });
      return;
    }
    const d = card;

    if (d.element === 'wild') return setPending({ kind: 'element', uid });
    if (d.needsTarget) return setPending({ kind: 'target', uid, need: d.needsTarget });
    dispatch({ type: 'PLAY', uid });
  }

  function pickTarget(targetUid: string) {
    if (!pending || pending.kind !== 'target') return;
    dispatch({ type: 'PLAY', uid: pending.uid, targetUid });
  }

  function toggleAttacker(uid: string) {
    if (!canAct || game.phase !== 'main') return;
    if (me.attackLocked) return flash(t('netLocked'));
    const m = me.field.find((x) => x.uid === uid)!;
    if (m.sick) return flash(t('monsterSick'));
    if (m.exhausted) return flash(t('monsterExhausted'));
    setAttackers((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  }

  function launchAttack(target: string | 'face', targetSeat?: Seat) {
    if (!attackers.length) return flash(t('pickAttacker'));
    const res = evaluateAttack(game, ME, attackers);
    if (!res.ok) return flash(reason(res.reason) || t('invalidAttack'));
    if (target === 'face') {
      const seat = targetSeat ?? (foeSeats.length === 1 ? foeSeats[0] : undefined);
      if (seat === undefined) return flash(t('pickEitherOpponent'));
      if (game.players[seat].field.length > 0) return flash(t('clearFoeFirst'));
      dispatch({ type: 'ATTACK', attackers, target: 'face', targetSeat: seat });
      return;
    }
    dispatch({ type: 'ATTACK', attackers, target, targetSeat });
  }

  function peekOwnTrap(slot: SetTrap) {
    if (slot.defId === HIDDEN_CARD_ID) return;
    const card = def(slot.defId);
    setDetail((cur) =>
      cur?.peekUid === slot.uid ? null : { card, reason: t('ownTrapPeek'), peekUid: slot.uid }
    );
  }

  const targeting = pending?.kind === 'target' ? pending.need : null;
  const comboHint = !comboPreview
    ? null
    : comboPreview.ok
      ? `${
          attackers.length > 1
            ? t('comboPreview', { damage: comboPreview.damage })
            : t('attackPreview', { damage: comboPreview.damage })
        } ${
          foeSeats.some((seat) => game.players[seat].field.length > 0)
            ? foeSeats.length > 1
              ? t('pickEitherOpponent')
              : t('pickFoeMonster')
            : t('pressDirect')
        }`
      : reason(comboPreview.reason);

  // ---------- التعليم ----------
  const lesson = tutorial ? TUTORIAL_STEPS[step] : null;
  const isLastLesson = step === TUTORIAL_STEPS.length - 1;
  const focusRing = (area: TutorialFocus) =>
    lesson?.focus === area ? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[#070912]' : '';

  function restart(nextLevel: Difficulty = level) {
    savedRef.current = false;
    setSaveState('idle');
    setAttackers([]);
    setPending(null);
    setDetail(null);
    autoPlayingRef.current = false;
    autoPlayTurnRef.current = null;
    setAutoPlaying(false);
    setStep(0);
    setLevel(nextLevel);
    setGame(makeGame?.() ?? newGame(undefined, tutorial, nextLevel, names, playerCount));
  }

  function renderHandCard(c: CardInstance, first: boolean) {
    const d = def(c.defId);
    const check = canPlayCard(game, ME, c.uid);
    const isFresh = freshUids.includes(c.uid);
    const livePlayable = !pending && playableUids.has(c.uid);
    return (
      <div
        key={c.uid}
        data-fresh={isFresh ? '1' : '0'}
        data-card-id={d.id}
        className={`relative shrink-0 transition-[translate] duration-150 hover:z-20 hover:-translate-y-3 focus-within:z-20 focus-within:-translate-y-3 ${
          first ? '' : '-ms-11 lg:-ms-5'
        }`}
      >
        <CardView
          card={d}
          size="md"
          fresh={isFresh}
          playable={livePlayable}
          // أثناء اختيار الهدف تُجمّد اليد كلّها
          dimmed={Boolean(pending) || autoPlaying || (canAct && !playableUids.has(c.uid))}
          onClick={pending ? undefined : () => onHandCard(c.uid)}
          onLongPress={() =>
            setDetail({
              card: d,
              reason: check.ok ? undefined : reason(check.reason) || t('cannotPlay'),
            })
          }
          title={
            check.ok
              ? `${L(d.name)} — ${L(d.text)}`
              : `${L(d.name)} — ${L(d.text)}\n⛔ ${reason(check.reason)}`
          }
        />
        {/* وسمٌ لا مكافأة: يُري اللاعب المطابقة التامّة دون أن يغيّر أثر الكارت */}
        {isPerfectMatch(d, game.flow) && (
          <span
            className="pointer-events-none absolute -top-2 start-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-b from-amber-200 to-amber-500 px-1.5 text-[10px] font-black text-black shadow-[0_0_10px_rgba(251,191,36,0.7)]"
            title={t('perfectMatch')}
          >
            ⭐ {t('perfectMatchShort')}
          </span>
        )}
      </div>
    );
  }

  // ---------- العرض ----------
  const titanReady = titanCheck.ok && canAct;
  const canHitFace = (seat: Seat) => {
    const p = game.players[seat];
    return attackers.length > 0 && canAct && p.field.length === 0 && !p.eliminated;
  };
  const foeMonsterAction = (uid: string, seat: Seat) =>
    targeting === 'enemy_monster'
      ? () => pickTarget(uid)
      : attackers.length > 0 && canAct
        ? () => launchAttack(uid, seat)
        : undefined;
  const faceImpact = (seat: Seat) =>
    battle?.type === 'strike' &&
    battle.target === 'face' &&
    (battle.targetSeat === seat ||
      (battle.targetSeat === undefined &&
        (seat === ME ? battle.entry.side !== ME : battle.entry.side === ME && seat === FOE)))
      ? battle.damage
      : 0;
  const faceSeats = foeSeats.filter(
    (seat) => !game.players[seat].eliminated && game.players[seat].field.length === 0
  );
  // التفاصيل مربوطةٌ برقم الدور: تنطفئ وحدها حين يتبدّل الدور، بلا مؤثّر
  const inspectUid = inspect && inspect.turn === game.turn ? inspect.uid : null;
  const onInspect = (uid: string | null) => setInspect(uid ? { uid, turn: game.turn } : null);
  // اللوحة الجانبية: الوحش المفتوح، وإلا آخر مهاجمٍ حدّدتَه
  const detailUid = inspectUid ?? attackers[attackers.length - 1] ?? null;
  const inspected = detailUid
    ? (game.players.flatMap((p) => p.field).find((m) => m.uid === detailUid) ?? null)
    : null;
  const turnText =
    game.phase === 'ended'
      ? t('ended')
      : autoPlaying
        ? t('autoPlaying')
        : myTurn
          ? hotseat
            ? t('playerTurn', { name: pname(me.name) })
            : t('yourTurn')
          : t('playerTurn', { name: pname(game.players[game.current].name) });

  return (
    <div ref={boardRef} data-players={game.players.length} className="relative isolate min-h-screen max-w-full overflow-x-clip">
      {/* isolate: بدونه تُرسم الخلفية ذات z سالب تحت خلفية body فلا تُرى */}
      <ArenaBackdrop titanReady={titanReady} />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 p-2 sm:p-3">
        {/* شريط النظام: ما لا يُحتاج في كل حركة، بخطٍّ صغير خارج بطاقات اللاعبين */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/" className="text-sm font-black hover:opacity-80">
              ⚔️ {t('appName')}
            </Link>
            <span className="opacity-60">{t('turnLabel', { n: game.turn })}</span>
            <span className="hidden opacity-60 sm:inline">{t('discardLabel', { n: game.discard.length })}</span>
            {!tutorial && !controlled && !hotseat && (
              <span
                className="rounded-md bg-white/10 px-2 py-0.5 font-bold"
                title={L(DIFFICULTIES[game.difficulty].description)}
              >
                {DIFFICULTIES[game.difficulty].short} {L(DIFFICULTIES[game.difficulty].label)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {game.weather && (
              <span
                className="rounded-md bg-sky-400/20 px-2 py-1 font-bold text-sky-100"
                title={L(WEATHER_BY_ID[game.weather].text)}
              >
                {WEATHER_BY_ID[game.weather].icon} {L(WEATHER_BY_ID[game.weather].name)}
              </span>
            )}
            {game.pendingDraw > 0 && (
              <span className="rounded-md bg-rose-500/25 px-2 py-1 font-bold text-rose-200">
                {t('drawPenalty', { n: game.pendingDraw })}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowElements(true)}
              className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20 xl:hidden"
              title={t('elementsTitle')}
              aria-label={t('elementsTitle')}
            >
              🎨
            </button>
            <SoundToggle />
            <LanguageSwitch compact />
            <button
              onClick={() => setShowHelp(true)}
              className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20"
              title="كيف ألعب؟"
            >
              {t('howToPlay')}
            </button>
            <button
              type="button"
              onClick={() => writeLogPref(!showLog)}
              aria-pressed={showLog}
              title={showLog ? t('hideLog') : t('showLog')}
              aria-label={showLog ? t('hideLog') : t('showLog')}
              className={`rounded-md px-2 py-1 font-bold ${
                showLog ? 'bg-emerald-500/25 text-emerald-200' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              📜 <span className="hidden sm:inline">{showLog ? t('hideLog') : t('showLog')}</span>
            </button>
          </div>
        </div>

        {/*
          الشريط العلوي: أنت · الدور والتدفق · الخصم. التدفق في الوسط وأكبر
          عنصرٍ فيه لأنه ما يُقرأ قبل كل كارت. على الهاتف ينزل إلى سطرٍ ثانٍ
          تحت البطاقتين بدل أن يضغطهما.
        */}
        <header className="grid grid-cols-2 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <SideCard state={me} face={`p${ME}`} you current={myTurn} impact={faceImpact(ME)} />
          <div className="col-span-2 row-start-2 flex items-center justify-center gap-2 md:col-span-1 md:row-start-auto md:flex-col md:gap-1.5">
            <div
              key={`turn-${game.turn}-${game.current}`}
              data-clock={clockOn ? 'on' : 'off'}
              className={`pop-in flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black ring-1 ${
                myTurn
                  ? 'bg-emerald-500/25 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.4)] ring-emerald-300/60'
                  : game.phase === 'ended'
                    ? 'bg-white/10 ring-white/20'
                    : 'bg-rose-500/20 text-rose-100 ring-rose-300/50'
              }`}
            >
              <span
                aria-hidden
                className={`size-2 rounded-full ${myTurn ? 'animate-pulse bg-emerald-400' : 'bg-rose-400'}`}
              />
              {turnText}
              {!controlled && clockOn && (
                <TurnClock deadline={turnDeadline} seconds={turnLimit} isMyTurn={myTurn} />
              )}
            </div>
            <div className={focusRing('flow')}>
              <FlowBadge flow={game.flow} />
            </div>
          </div>
          <div data-foes={foeSeats.length} className="flex min-w-0 flex-col gap-1.5">
            {foeSeats.map((seat) => (
              <SideCard
                key={seat}
                state={game.players[seat]}
                face={`p${seat}`}
                current={game.current === seat}
                impact={faceImpact(seat)}
                compact={foeSeats.length > 1}
                onFaceClick={canHitFace(seat) ? () => launchAttack('face', seat) : undefined}
              />
            ))}
          </div>
        </header>

        {banner}

        {autoPlaying && (
          <div
            className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-center text-sm font-black text-amber-100"
            role="status"
            aria-live="polite"
            data-autoplay="1"
          >
            {t('autoPlaying')}
          </div>
        )}

        {/* شريط المدرّب */}
        {lesson && (
          <section className="hud-panel pop-in rounded-xl border-amber-400/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-black text-black">
                {t('stepOf', { n: step + 1, total: TUTORIAL_STEPS.length })}
              </span>
              <h2 className="font-black text-amber-100">{L(lesson.title)}</h2>
              <div className="ms-auto flex gap-2 text-[11px]">
                {isLastLesson ? (
                  <>
                    <Link
                      href="/play"
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 font-black text-black hover:bg-emerald-400"
                    >
                      {t('startRealMatch')}
                    </Link>
                    <button
                      onClick={() => restart()}
                      className="rounded-lg bg-white/15 px-3 py-1.5 font-bold"
                    >
                      {t('restartTutorial')}
                    </button>
                  </>
                ) : lesson.manual ? (
                  <button
                    onClick={() => setStep((n) => n + 1)}
                    className="rounded-lg bg-amber-400 px-4 py-1.5 font-black text-black hover:bg-amber-300"
                  >
                    {t('next')}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep((n) => n + 1)}
                    className="rounded-lg bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25"
                    title={t('skipStepTip')}
                  >
                    {t('skipStep')}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-amber-50/90">{L(lesson.body)}</p>
            {!lesson.manual && (
              <p className="mt-1 text-[11px] text-amber-200/70">
                {t('doItHint')}
              </p>
            )}
          </section>
        )}

        {/* الساحة بين لوحتين جانبيتين على الشاشة الواسعة، ووحدها على الهاتف */}
        <div className="grid items-start gap-3 xl:grid-cols-[210px_minmax(0,1fr)_290px]">
          <aside className="hidden flex-col gap-3 xl:flex">
            <ElementLegend />
            <QuickGuide />
          </aside>

          <main className="flex min-w-0 flex-col gap-2">
            <Battlefield
              game={game}
              me={ME}
              foeSeats={foeSeats}
              attackers={attackers}
              canAct={canAct}
              targeting={targeting}
              battle={battle}
              strikeDelta={strikeDelta}
              attackPreview={
                comboPreview ? { ok: comboPreview.ok, damage: comboPreview.ok ? comboPreview.damage : 0 } : null
              }
              onOwnMonster={(uid) => (targeting === 'own_monster' ? pickTarget(uid) : toggleAttacker(uid))}
              foeMonsterAction={foeMonsterAction}
              canHitFace={canHitFace}
              onFaceAttack={(seat) => launchAttack('face', seat)}
              trapSelectable={targeting === 'enemy_trap'}
              onPickTrap={pickTarget}
              peekable={!pending}
              onPeekTrap={peekOwnTrap}
              inspectUid={inspectUid}
              onInspect={onInspect}
              focus={{ foe: focusRing('foeField'), flow: '', mine: focusRing('myField') }}
              titanReady={titanReady}
            />

            {/*
              شريط الأوامر سياقيّ: يعرض ما يصلح للحظة لا كل ما في اللعبة. تحديد
              وحشٍ يُبدّل الأزرار إلى أزرار الهجوم، وزرّ الوحش الأعظم لا يظهر إلا
              حين يصحّ استدعاؤه — فالزرّ المعطَّل الدائم يُعلّم العين أن تتجاهله.
            */}
            <section
              className={`hud-panel flex flex-wrap items-center gap-2 rounded-2xl p-2 text-xs ${focusRing('commands')}`}
            >
              {game.phase === 'respond' && myTurn ? (
                <>
                  <span className="font-bold text-rose-200">
                    {t('mustDraw', { n: game.pendingDraw })}
                  </span>
                  <button
                    disabled={autoPlaying}
                    onClick={() => dispatch({ type: 'ACCEPT_DRAW' })}
                    className="ms-auto rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 px-4 py-2 font-black text-black disabled:opacity-35"
                  >
                    {t('acceptPenalty')}
                  </button>
                </>
              ) : !myTurn && game.phase !== 'ended' ? (
                <span className="flex-1 py-1.5 text-center font-bold opacity-70">
                  {t('foeThinking', { name: pname(game.players[game.current].name) })}
                </span>
              ) : attackers.length > 0 ? (
                <>
                  {faceSeats.map((seat) => (
                    <button
                      key={seat}
                      disabled={autoPlaying}
                      onClick={() => launchAttack('face', seat)}
                      className="glow-pulse rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-4 py-2 font-black text-black disabled:opacity-35"
                    >
                      {foeSeats.length > 1
                        ? t('attackFaceNamed', { name: pname(game.players[seat].name) })
                        : t('attackFace')}
                    </button>
                  ))}
                  <button
                    onClick={() => setAttackers([])}
                    className="rounded-xl bg-white/10 px-3 py-2 font-bold ring-1 ring-white/15 hover:bg-white/20"
                  >
                    {t('clearSelection')}
                  </button>
                  <button
                    disabled={!canAct || game.phase !== 'main'}
                    onClick={() => dispatch({ type: 'END_TURN' })}
                    className="ms-auto rounded-xl bg-emerald-500/25 px-3 py-2 font-bold text-emerald-100 ring-1 ring-emerald-300/40 disabled:opacity-35"
                  >
                    {t('endTurn')}
                  </button>
                </>
              ) : (
                <>
                  {titanCheck.ok && (
                    <button
                      disabled={autoPlaying}
                      onClick={() => dispatch({ type: 'SUMMON_TITAN' })}
                      className="glow-pulse w-full rounded-xl bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-black text-black shadow-[0_0_28px_rgba(251,191,36,0.55)] disabled:opacity-35"
                      title={t('titanReadyBanner')}
                    >
                      🗿 {t('summonTitan', { titan: L(TITAN.name) })}
                    </button>
                  )}
                  {canRescueDraw && (
                    <button
                      onClick={() => dispatch({ type: 'DRAW' })}
                      className="rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2 font-black text-black"
                      title={t('drawCardHint')}
                    >
                      {t('drawCard')}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canAct || game.phase !== 'main'}
                    onClick={() => setShowPrep(true)}
                    title={canAct ? t('prepHint') : t('prepClosed')}
                    className="rounded-xl bg-white/10 px-3 py-2 font-bold ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-35"
                  >
                    {t('openPrep')}
                  </button>
                  <button
                    disabled={!canAct || game.phase !== 'main'}
                    onClick={() => dispatch({ type: 'END_TURN' })}
                    className="ms-auto rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2 text-sm font-black text-black shadow-[0_0_18px_rgba(52,211,153,0.4)] disabled:opacity-35 disabled:shadow-none"
                  >
                    {t('endTurn')}
                  </button>
                </>
              )}

              {comboPreview && comboHint && (
                <span
                  className={`w-full rounded-lg px-2 py-1 ${
                    comboPreview.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
                  }`}
                >
                  {comboHint}
                </span>
              )}
            </section>

            {/*
              اليد صفٌّ واحد متراكب: يُرى أكثر من خمسة كروت على الهاتف، ويبقى من
              كل كارتٍ رأسُه (التكلفة والعنصر والاسم) — وهو ما يُختار به. العدد
              ظاهرٌ كبيراً، وسهمٌ عند الحافّة يقول إن وراءها كروتاً أخرى.
            */}
            <section data-hand className={`hud-panel min-w-0 overflow-x-hidden rounded-2xl px-2 pt-1.5 ${focusRing('hand')}`}>
              <div className="flex min-w-0 items-center justify-between gap-2 px-1 text-[11px]">
                <span className="flex shrink-0 items-center gap-1.5 font-bold">
                  <span className="grid h-6 min-w-8 place-items-center rounded-md bg-white/10 px-1.5 text-[13px] font-black tabular-nums ring-1 ring-white/15">
                    {me.hand.length}
                  </span>
                  <span className="opacity-70">{t('cardsWord')}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-center opacity-70">
                  {pending ? t('finishTargeting') : t('holdForDetails')}
                </span>
                {/* أزرارٌ سريعة في متناول الإبهام: المساعدة والسجل والتحضير والخروج */}
                <span className="flex shrink-0 items-center gap-1">
                  {[
                    { icon: '❓', label: t('howToPlay'), onClick: () => setShowHelp(true) },
                    { icon: '📜', label: showLog ? t('hideLog') : t('showLog'), onClick: () => writeLogPref(!showLog) },
                    {
                      icon: '⚙',
                      label: t('openPrep'),
                      onClick: () => setShowPrep(true),
                      disabled: !canAct || game.phase !== 'main',
                    },
                  ].map((b) => (
                    <button
                      key={b.icon}
                      type="button"
                      onClick={b.onClick}
                      disabled={b.disabled}
                      title={b.label}
                      aria-label={b.label}
                      className="grid size-8 place-items-center rounded-lg bg-white/10 text-sm ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-35"
                    >
                      {b.icon}
                    </button>
                  ))}
                  <Link
                    href="/"
                    title={t('home')}
                    aria-label={t('home')}
                    className="grid size-8 place-items-center rounded-lg bg-white/10 text-sm ring-1 ring-white/15 hover:bg-white/20"
                  >
                    🚪
                  </Link>
                </span>
              </div>
              <div ref={handArea} className="relative min-w-0">
                <div
                  data-hand-scroller
                  className="thin-scroll flex w-full min-w-0 items-end overflow-x-auto overscroll-x-contain px-1 pb-2 pt-4"
                >
                  {playableHand.map((c, i) => renderHandCard(c, i === 0))}
                  {playableHand.length > 0 && parkedHand.length > 0 && (
                    <div className="flex shrink-0 self-stretch pe-10 lg:pe-4">
                      <HandSplit title={t('cannotPlay')} />
                    </div>
                  )}
                  {parkedHand.map((c, i) => renderHandCard(c, i === 0))}
                  {me.hand.length === 0 && (
                    <div className="p-4 text-xs opacity-60">{t('emptyHand')}</div>
                  )}
                </div>
                {me.hand.length > 4 && (
                  <button
                    type="button"
                    aria-label={t('scrollHand')}
                    title={t('scrollHand')}
                    onClick={() =>
                      handArea.current
                        ?.querySelector('[data-hand-scroller]')
                        ?.scrollBy({ left: -260, behavior: 'smooth' })
                    }
                    className="absolute inset-y-4 end-0 z-30 grid w-8 place-items-center rounded-s-xl bg-gradient-to-r from-[#0b0b14] to-transparent text-2xl font-black text-white/85 hover:text-white"
                  >
                    ‹
                  </button>
                )}
              </div>
            </section>

            {/* التذييل: الهوية تحت اليد، خارج مسار اللعب فلا يزاحم شيئاً */}
            <footer className="mt-1 flex flex-col items-center gap-1.5 pb-3">
              <div className="bg-gradient-to-b from-slate-100 to-slate-500 bg-clip-text text-2xl font-black tracking-[0.2em] text-transparent">
                MTO
              </div>
              <div className="text-[9px] tracking-[0.25em] opacity-50">MONSTERS · TACTICS · OVERPOWER</div>
              <ul className="mt-1 grid w-full grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-4">
                {[
                  ['👁', t('featClarity')],
                  ['🧠', t('featDepth')],
                  ['🏆', t('featCompetitive')],
                  ['📱', t('featMobile')],
                ].map(([icon, text]) => (
                  <li key={icon} className="hud-panel flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 opacity-80">
                    <span aria-hidden>{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </footer>
          </main>

          <aside className="flex min-w-0 flex-col gap-3">
            <div className="hidden xl:block">
              <MonsterDetails m={inspected} weather={game.weather ?? null} />
            </div>
            <div className="hidden xl:block">
              <BoardStatus player={me} />
            </div>
            {showLog && (
              <div className="hidden xl:block">
                <BattleLog entries={game.log} me={ME} onClose={() => writeLogPref(false)} />
              </div>
            )}
          </aside>
        </div>
      </div>


      {/* اختيار العنصر للكارت البري */}
      {pending?.kind === 'element' && (
        <Modal onClose={() => setPending(null)} title={t('chooseElement')}>
          <div className="grid grid-cols-3 gap-2">
            {ELEMENTS.map((el) => (
              <button
                key={el}
                onClick={() =>
                  dispatch({ type: 'PLAY', uid: pending.uid, chosenElement: el as PlayableElement })
                }
                className="rounded-lg px-3 py-3 font-bold transition hover:scale-105"
                style={{
                  background: `${ELEMENT_HEX[el]}25`,
                  border: `1px solid ${ELEMENT_HEX[el]}80`,
                  color: ELEMENT_HEX[el],
                }}
              >
                {ELEMENT_ICON[el]} {L(ELEMENT_NAME[el])}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* اختيار وحش من المهملات (إحياء) */}
      {targeting === 'discard_monster' && (
        <Modal onClose={() => setPending(null)} title={t('chooseDiscardMonster')}>
          <div className="thin-scroll flex max-h-[60vh] flex-wrap gap-2 overflow-y-auto">
            {discardMonsters.map((c) => (
              <CardView
                key={c.uid}
                card={def(c.defId)}
                size="sm"
                onClick={() => pickTarget(c.uid)}
              />
            ))}
          </div>
        </Modal>
      )}

      {/* تلميح الاستهداف */}
      {(targeting === 'own_monster' ||
        targeting === 'enemy_monster' ||
        targeting === 'enemy_trap') && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center">
          <div className="panel flex items-center gap-3 rounded-full px-4 py-2 text-xs">
            <span className="font-bold">
              {targeting === 'own_monster'
                ? t('pickOwnMonster')
                : targeting === 'enemy_monster'
                  ? t('pickEnemyMonster')
                  : t('pickEnemyTrap')}
            </span>
            <button onClick={() => setPending(null)} className="rounded bg-white/15 px-2 py-0.5">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* كشف كروت (بحث) */}
      {game.reveal && game.reveal.side === ME && (
        <Modal onClose={() => dispatch({ type: 'PICK_REVEAL', uid: '' })} title={t('chooseOneCard')}>
          <div className="flex flex-wrap justify-center gap-2">
            {game.reveal.cards.map((c) => (
              <CardView
                key={c.uid}
                card={def(c.defId)}
                size="sm"
                onClick={() => dispatch({ type: 'PICK_REVEAL', uid: c.uid })}
              />
            ))}
          </div>
        </Modal>
      )}

      {/* النهاية */}
      {game.phase === 'ended' && (
        <Modal
          title={
            hotseat || controlled
              ? t('someoneWins', { name: pname(game.players[game.winner ?? 0].name) })
              : game.winner === ME
                ? t('youWin')
                : t('youLose')
          }
        >
          <p className="mb-4 text-sm opacity-80">{outcomeText(game.winReason)}</p>
          <p className="mb-4 text-xs opacity-60">
            {t('endStats', { turns: game.turn, seed: game.seed })} ·{' '}
            {saveState === 'saved'
              ? t('saved')
              : saveState === 'saving'
                ? t('saving')
                : saveState === 'skipped'
                  ? t('saveSkipped')
                  : saveState === 'error'
                    ? t('saveError')
                    : ''}
          </p>
          {endActions ? (
            <div className="flex flex-wrap gap-2">{endActions}</div>
          ) : hotseat ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setReadyTurn(-1);
                  restart();
                }}
                className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-black"
              >
                {t('newMatch')}
              </button>
              <Link href="/" className="rounded-lg bg-white/15 px-4 py-2 font-bold">
                {t('home')}
              </Link>
            </div>
          ) : (
            <>
          <div className="mb-3">
            <div className="mb-1.5 text-[11px] opacity-70">
              {game.winner === ME
                ? t('tryHarder')
                : t('tooHard')}
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((id) => (
                <button
                  key={id}
                  onClick={() => restart(id)}
                  title={L(DIFFICULTIES[id].description)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    id === game.difficulty
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/12 hover:bg-white/25'
                  }`}
                >
                  {DIFFICULTIES[id].short} {L(DIFFICULTIES[id].label)}
                  {id === game.difficulty && ' ↻'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {game.winner !== ME && (
              <Link href="/tutorial" className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-black">
                {t('learnToPlay')}
              </Link>
            )}
            <Link href="/" className="rounded-lg bg-white/15 px-4 py-2 font-bold">
              {t('home')}
            </Link>
          </div>
            </>
          )}
        </Modal>
      )}

      {/* ستارة تمرير الجهاز */}
      {showCurtain && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#070912] p-6">
          <div className="pop-in panel w-full max-w-sm rounded-2xl p-6 text-center">
            <div className="text-5xl">🤝</div>
            <h2 className="mt-3 text-2xl font-black">{t('handDevice', { name: pname(me.name) })}</h2>
            <p className="mt-2 text-sm opacity-70">
              {t('handHidden')}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs opacity-60">
              <span>{t('turnLabel', { n: game.turn })}</span>
              {game.players.map((p) => (
                <span key={p.id}>
                  ❤ {pname(p.name)}: {p.hp}
                  {p.eliminated ? ` (${t('eliminatedTag')})` : ''}
                </span>
              ))}
            </div>
            <button
              onClick={() => setReadyTurn(game.turn)}
              className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-black hover:bg-emerald-400"
            >
              {t('revealHand', { name: pname(me.name) })}
            </button>
          </div>
        </div>
      )}

      {/*
        السجل على الهاتف لوحةٌ منبثقة من الأسفل بدل أن يُلحَق تحت اليد: هناك
        كان يمدّ الصفحة ويُبعد اللاعب عن الساحة ليقرأه.
      */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-end xl:hidden">
          <button
            type="button"
            aria-label={t('hideLog')}
            onClick={() => writeLogPref(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />
          <div className="pop-in relative max-h-[72vh] w-full p-2">
            <BattleLog entries={game.log} me={ME} onClose={() => writeLogPref(false)} />
          </div>
        </div>
      )}

      {showElements && (
        <Modal title={t('elementsTitle')} onClose={() => setShowElements(false)}>
          <ElementLegend />
        </Modal>
      )}

      {/* فوق نافذة النهاية: تُخفيها ثلاث ثوانٍ ثم تختفي وحدها */}
      {game.phase === 'ended' &&
        (() => {
          const entry = game.log.find((l) => l.key === 'titan_summon');
          return entry ? (
            <TitanCinematic key={entry.turn} summoner={pname(game.players[entry.side ?? 0].name)} />
          ) : null;
        })()}

      {detail && (
        <CardDetail
          card={detail.card}
          reason={detail.reason}
          trapPeek={Boolean(detail.peekUid)}
          onClose={() => setDetail(null)}
        />
      )}

      {/* مرجع سريع */}
      {/*
        شاشة التحضير تُغطّي اللوحة ولا تحلّ محلّها: تُرسَل أفعالُها إلى
        `dispatch` نفسه، فتمرّ في الوضع المُدار عبر الحَكَم كما تمرّ أي حركة
        أخرى — ولولا ذلك لغيّر التجهيزُ لوحةَ صاحبه وحده وافترقت اللوحتان.
      */}
      {showPrep && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0c18]">
          <LoadoutScreen
            state={game}
            seat={ME}
            onAction={dispatch}
            onBack={() => setShowPrep(false)}
          />
        </div>
      )}

      {showHelp && (
        <Modal title={t('howToPlay')} onClose={() => setShowHelp(false)}>
          <div className="thin-scroll max-h-[70vh] space-y-3 overflow-y-auto text-[13px] leading-relaxed">
            {/* النصوص من ui.ts لا مكتوبةً هنا: كانت عربيةً ثابتة فتظهر بالعربية للاعبٍ اختار الإنجليزية */}
            <HelpRow icon="🎨" title={t('help1')}>{t('help1Body')}</HelpRow>
            <HelpRow icon="⚡" title={t('help2')}>{t('help2Body')}</HelpRow>
            <HelpRow icon="🐾" title={t('help3')}>{t('help3Body', { field: RULES.MAX_FIELD })}</HelpRow>
            <HelpRow icon="💥" title={t('help4')}>{t('help4Body', { bonus: RULES.COMBO_BONUS_PER_EXTRA })}</HelpRow>
            <HelpRow icon="🎯" title={t('help5')}>{t('help5Body')}</HelpRow>
            <HelpRow icon="🗿" title={t('help6')}>{t('help6Body', { cost: TITAN.cost })}</HelpRow>
            <HelpRow icon="⚙" title={t('help7')}>{t('help7Body')}</HelpRow>
            <HelpRow icon="👁" title={t('help8')}>{t('help8Body')}</HelpRow>
            <HelpRow icon="🚫" title={t('helpStuck')}>{t('helpStuckBody')}</HelpRow>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/guide"
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-black"
            >
              {t('openGuide')}
            </Link>
            <Link
              href="/tutorial"
              className="rounded-lg bg-white/15 px-4 py-2 text-sm font-bold"
            >
              {t('interactiveTutorial')}
            </Link>
            <button
              onClick={() => setShowHelp(false)}
              className="rounded-lg bg-white/15 px-4 py-2 text-sm font-bold"
            >
              {t('keepPlaying')}
            </button>
          </div>
        </Modal>
      )}

      {battle && (
        <div className="battle-caption pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-3">
          <div className="max-w-lg rounded-full bg-black/85 px-4 py-2 text-center text-sm font-black text-amber-100 ring-1 ring-white/20">
            {logText(battle.entry)}
          </div>
        </div>
      )}
      {battle?.type === 'play' && battle.defId && fly && (
        <div
          className="play-fly pointer-events-none fixed z-50"
          style={
            {
              left: fly.left,
              top: fly.top,
              '--tx': `${fly.tx}px`,
              '--ty': `${fly.ty}px`,
            } as React.CSSProperties
          }
        >
          <CardView card={def(battle.defId)} size="sm" />
        </div>
      )}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center">
          <div className="shake rounded-full bg-rose-500/90 px-4 py-2 text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== عناصر مساعدة =====================

function HelpRow({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <div className="mb-0.5 flex items-center gap-2 font-black">
        <span>{icon}</span>
        {title}
      </div>
      <p className="opacity-80">{children}</p>
    </div>
  );
}

function HandSplit({ title }: { title: string }) {
  return (
    <div
      aria-hidden
      className="mx-1 flex shrink-0 flex-col items-center justify-center self-stretch"
      title={title}
    >
      <div className="w-0 flex-1 border-l border-dashed border-white/25" />
      <span className="my-1 text-base leading-none opacity-40">🔒</span>
      <div className="w-0 flex-1 border-l border-dashed border-white/25" />
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="pop-in panel w-full max-w-lg rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black">{title}</h3>
          {onClose && (
            <button onClick={onClose} className="rounded bg-white/10 px-2 py-1 text-xs">
              إغلاق
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export { matchesFlow };
