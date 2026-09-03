'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { aiChooseAction, stampAutoPlay } from '@/lib/game/ai';
import { advanceTally, emptyTally, tallyToPayload, type MatchTally } from '@/lib/game/stats';
import {
  ELEMENT_ICON,
  ELEMENT_NAME,
  ELEMENTS,
  FRAGMENT_NAME,
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
  hasAnyPlayable,
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
import CardView, { CardBack, ELEMENT_HEX, numberLabel, type CardSize } from './CardView';
import MonsterView from './MonsterView';
import TurnClock from './TurnClock';

type Pending =
  | { kind: 'element'; uid: string }
  | { kind: 'target'; uid: string; need: NonNullable<ReturnType<typeof def>['needsTarget']> }
  | null;

/** lg = تخطيط الكمبيوتر (سطران). دونه = الجوال (سطر واحد). */
const visibleHandLayout = () =>
  window.matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'mobile';

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
  const logEnd = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end' });
  }, [game.log.length, showLog]);

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
  useEffect(() => {
    if (!myTurn) return;
    const scroller = handArea.current?.querySelector(
      `[data-hand-scroller="${visibleHandLayout()}"]`
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
      `[data-hand-layout="${visibleHandLayout()}"] [data-fresh="1"]`
    );
    node?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
  const canRescueDraw =
    canAct && game.phase === 'main' && !me.extraDrawUsed && !hasAnyPlayable(game, ME);

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

  /** backdrop-filter على .panel يحبس z-index — ارفع الإطار كلّه فوق الجيران أثناء الاندفاع */
  const fieldIsStriking = (field: GameState['players'][0]['field']) =>
    field.some((m) => Boolean(strikeDelta[m.uid]));
  const monsterWrapClass = (uid: string) => {
    const striking = Boolean(strikeDelta[uid]);
    const hitting = battle?.type === 'strike' && battle.target === uid;
    return [
      'relative',
      striking || hitting ? 'overflow-visible' : '',
      striking ? 'z-50' : hitting ? 'z-20' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };
  const strikePanelClass = (field: GameState['players'][0]['field']) =>
    fieldIsStriking(field) ? 'relative z-30 overflow-visible' : '';

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

  function renderHandCard(c: CardInstance, size: CardSize) {
    const d = def(c.defId);
    const check = canPlayCard(game, ME, c.uid);
    const isFresh = freshUids.includes(c.uid);
    const livePlayable = !pending && playableUids.has(c.uid);
    return (
      <div key={c.uid} data-fresh={isFresh ? '1' : '0'} data-card-id={d.id} className="shrink-0">
        <CardView
          card={d}
          size={size}
          fresh={isFresh}
          playable={livePlayable}
          // المصغّر دائماً خافت؛ وأثناء اختيار الهدف تُجمّد اليد كلّها
          dimmed={size === 'xs' || Boolean(pending) || autoPlaying || (canAct && !playableUids.has(c.uid))}
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
      </div>
    );
  }

  // ---------- العرض ----------
  return (
    <div ref={boardRef} data-players={game.players.length} className="flex min-h-screen max-w-full flex-col overflow-x-clip lg:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-2 p-2 sm:p-3">
        {/* شريط علوي */}
        <header className="panel flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-black text-sm hover:opacity-80">
              ⚔️ {t('appName')}
            </Link>
            <span className="opacity-60">{t('turnLabel', { n: game.turn })}</span>
            <span className="opacity-60">{t('deckLabel', { n: game.deck.length })}</span>
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
          <div className="flex items-center gap-2">
            {game.pendingDraw > 0 && (
              <span className="rounded-md bg-rose-500/25 px-2 py-1 font-bold text-rose-200">
                {t('drawPenalty', { n: game.pendingDraw })}
              </span>
            )}
            <span
              className={`rounded-md px-2 py-1 font-bold ${
                myTurn ? 'bg-emerald-500/25 text-emerald-200' : 'bg-white/10 opacity-70'
              }`}
              data-clock={clockOn ? 'on' : 'off'}
            >
              {game.phase === 'ended'
                ? t('ended')
                : autoPlaying
                  ? t('autoPlaying')
                  : myTurn
                    ? hotseat
                      ? t('playerTurn', { name: pname(me.name) })
                      : t('yourTurn')
                    : t('playerTurn', { name: pname(game.players[game.current].name) })}
            </span>
            {!controlled && clockOn && (
              <TurnClock deadline={turnDeadline} seconds={turnLimit} isMyTurn={myTurn} />
            )}
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
              📜 {showLog ? t('hideLog') : t('showLog')}
            </button>
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
          <section className="pop-in rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
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

        {/* الخصوم — واحد في 1 ضد 1، واثنان جنباً إلى جنب في 1 ضد 1 ضد 1 */}
        <div
          data-foes={foeSeats.length}
          className={
            foeSeats.length > 1
              ? 'grid min-w-0 gap-2 sm:grid-cols-2'
              : 'min-w-0'
          }
        >
          {foeSeats.map((seat) => {
            const foeP = game.players[seat];
            const isCurrent = game.current === seat;
            const canHitFace =
              attackers.length > 0 && canAct && foeP.field.length === 0 && !foeP.eliminated;
            return (
              <section
                key={seat}
                data-seat={seat}
                className={`panel min-w-0 rounded-xl p-2 ${
                  seat === FOE ? focusRing('foeField') : ''
                } ${strikePanelClass(foeP.field)} ${
                  foeP.eliminated ? 'opacity-55' : ''
                } ${isCurrent ? 'ring-1 ring-amber-300/50' : ''}`}
              >
                <PlayerStrip
                  state={foeP}
                  align="start"
                  face={`p${seat}`}
                  current={isCurrent}
                  impact={
                    battle?.type === 'strike' &&
                    battle.target === 'face' &&
                    (battle.targetSeat === seat ||
                      (battle.targetSeat === undefined && battle.entry.side === ME && seat === FOE))
                      ? battle.damage
                      : 0
                  }
                  onFaceClick={canHitFace ? () => launchAttack('face', seat) : undefined}
                />
                <div
                  data-field={`p${seat}`}
                  className={`relative mt-2 flex min-h-[92px] flex-wrap items-start gap-2 ${
                    fieldIsStriking(foeP.field) ? 'z-30 overflow-visible' : ''
                  }`}
                >
                  {foeP.field.length === 0 && (
                    <EmptySlot
                      text={
                        foeP.eliminated
                          ? t('eliminatedTag')
                          : canHitFace
                            ? t('attackFaceNamed', { name: pname(foeP.name) })
                            : t('noFoeMonsters')
                      }
                      onClick={canHitFace ? () => launchAttack('face', seat) : undefined}
                    />
                  )}
                  {foeP.field.map((m) => (
                    <div key={m.uid} data-uid={m.uid} className={monsterWrapClass(m.uid)}>
                      <MonsterView
                        monster={m}
                        strike={strikeDelta[m.uid] ?? null}
                        hit={battle?.type === 'strike' && battle.target === m.uid}
                        targetable={
                          (attackers.length > 0 && canAct) || targeting === 'enemy_monster'
                        }
                        onClick={
                          targeting === 'enemy_monster'
                            ? () => pickTarget(m.uid)
                            : attackers.length > 0 && canAct
                              ? () => launchAttack(m.uid, seat)
                              : undefined
                        }
                      />
                      {battle?.type === 'strike' && battle.target === m.uid && battle.damage > 0 && (
                        <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-lg font-black text-rose-300 drop-shadow">
                          −{battle.damage}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <TrapRow
                  traps={foeP.traps}
                  hidden
                  selectable={targeting === 'enemy_trap'}
                  onPick={pickTarget}
                />
              </section>
            );
          })}
        </div>

        {/* الوسط: طابور التدفق */}
        <section
          className={`panel flex items-center justify-center gap-4 rounded-xl p-3 ${focusRing('flow')}`}
        >
          <div className="text-center">
            <div className="mb-1 text-[10px] opacity-60">{t('deckPile')}</div>
            <CardBack size="sm" label={`${game.deck.length}`} />
          </div>

          <div className="text-center" data-flow>
            <div className="mb-1 text-[10px] opacity-60">{t('flowPile')}</div>
            {game.flow.defId ? (
              <CardView card={def(game.flow.defId)} size="sm" />
            ) : (
              <CardBack size="sm" />
            )}
          </div>

          <div className="min-w-[130px] text-center">
            <div className="mb-1 text-[10px] opacity-60">{t('activeElement')}</div>
            <div
              className="rounded-xl px-3 py-2 text-lg font-black"
              style={{
                background: `${ELEMENT_HEX[game.flow.element]}25`,
                border: `1px solid ${ELEMENT_HEX[game.flow.element]}80`,
                color: ELEMENT_HEX[game.flow.element],
              }}
            >
              {ELEMENT_ICON[game.flow.element]} {L(ELEMENT_NAME[game.flow.element])}
            </div>
            <div className="mt-1 text-[11px] opacity-70">
              {t('numberLabel')}{' '}
              <b className="tabular-nums">
                {game.flow.defId ? numberLabel(def(game.flow.defId)) : '—'}
              </b>
            </div>
            <div className="mt-1 text-[10px] opacity-50">{t('matchHint')}</div>
          </div>
        </section>

        {/* أنت */}
        <section className={`panel rounded-xl p-2 ${focusRing('myField')} ${strikePanelClass(me.field)}`}>
          <TrapRow traps={me.traps} peekable={!pending} onPeek={peekOwnTrap} />
          <div data-field={`p${ME}`} className={`relative mt-2 flex min-h-[92px] flex-wrap items-start gap-2 ${fieldIsStriking(me.field) ? 'z-30 overflow-visible' : ''}`}>
            {me.field.length === 0 && <EmptySlot text={t('summonHint', { n: RULES.MAX_FIELD })} />}
            {me.field.map((m) => (
              <div key={m.uid} data-uid={m.uid} className={monsterWrapClass(m.uid)}>
                <MonsterView
                  monster={m}
                  selected={attackers.includes(m.uid)}
                  ready={canAct && !m.sick && !m.exhausted && !me.attackLocked}
                  strike={strikeDelta[m.uid] ?? null}
                  hit={battle?.type === 'strike' && battle.target === m.uid}
                  onClick={
                    targeting === 'own_monster'
                      ? () => pickTarget(m.uid)
                      : () => toggleAttacker(m.uid)
                  }
                />
                {battle?.type === 'strike' && battle.target === m.uid && battle.damage > 0 && (
                  <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-lg font-black text-rose-300 drop-shadow">
                    −{battle.damage}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <PlayerStrip
              state={me}
              align="end"
              face={`p${ME}`}
              current={myTurn}
              impact={
                battle?.type === 'strike' &&
                battle.target === 'face' &&
                (battle.targetSeat === ME ||
                  (battle.targetSeat === undefined && battle.entry.side !== ME))
                  ? battle.damage
                  : 0
              }
            />
          </div>
        </section>

        {/* شريط الأوامر */}
        <section
          className={`panel flex flex-wrap items-center gap-2 rounded-xl p-2 text-xs ${focusRing('commands')}`}
        >
          {game.phase === 'respond' && myTurn ? (
            <>
              <span className="font-bold text-rose-200">
                {t('mustDraw', { n: game.pendingDraw })}
              </span>
              <button
                disabled={autoPlaying}
                onClick={() => dispatch({ type: 'ACCEPT_DRAW' })}
                className="rounded-lg bg-rose-500/80 px-3 py-1.5 font-bold enabled:hover:bg-rose-500 disabled:opacity-35"
              >
                {t('acceptPenalty')}
              </button>
            </>
          ) : (
            <>
              {foeSeats.length <= 1 ? (
                <button
                  disabled={!attackers.length || game.players[FOE]?.field.length > 0 || autoPlaying}
                  onClick={() => launchAttack('face', FOE)}
                  className="rounded-lg bg-orange-500/85 px-3 py-1.5 font-bold enabled:hover:bg-orange-500 disabled:opacity-35"
                >
                  {t('attackFace')}
                </button>
              ) : (
                foeSeats
                  .filter((seat) => !game.players[seat].eliminated && game.players[seat].field.length === 0)
                  .map((seat) => (
                    <button
                      key={seat}
                      disabled={!attackers.length || autoPlaying}
                      onClick={() => launchAttack('face', seat)}
                      className="rounded-lg bg-orange-500/85 px-3 py-1.5 font-bold enabled:hover:bg-orange-500 disabled:opacity-35"
                    >
                      {t('attackFaceNamed', { name: pname(game.players[seat].name) })}
                    </button>
                  ))
              )}
              <button
                disabled={!attackers.length || autoPlaying}
                onClick={() => setAttackers([])}
                className="rounded-lg bg-white/10 px-3 py-1.5 enabled:hover:bg-white/20 disabled:opacity-35"
              >
                {t('clearSelection')}
              </button>
              <button
                disabled={!canRescueDraw}
                onClick={() => dispatch({ type: 'DRAW' })}
                className="rounded-lg bg-sky-500/80 px-3 py-1.5 font-bold enabled:hover:bg-sky-500 disabled:opacity-35"
                title={t('drawCardHint')}
              >
                {t('drawCard')}
              </button>
              <button
                disabled={!titanCheck.ok || autoPlaying}
                onClick={() => dispatch({ type: 'SUMMON_TITAN' })}
                title={reason(titanCheck.reason)}
                className={`rounded-lg px-3 py-1.5 font-black disabled:opacity-35 ${
                  titanCheck.ok
                    ? 'glow-pulse bg-amber-400 text-black hover:bg-amber-300'
                    : 'bg-amber-400/30'
                }`}
              >
                {t('summonTitan', { titan: L(TITAN.name) })}
              </button>
              <button
                disabled={!canAct || game.phase !== 'main'}
                onClick={() => dispatch({ type: 'END_TURN' })}
                className="ms-auto rounded-lg bg-emerald-500/85 px-4 py-1.5 font-bold enabled:hover:bg-emerald-500 disabled:opacity-35"
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

        {/* اليد: الجوال سطر واحد يتمرّر أفقياً؛ الكمبيوتر سطران (قابل كبير / موقوف مصغّر) */}
        <section data-hand className={`panel min-w-0 overflow-x-hidden rounded-xl p-2 ${focusRing('hand')}`}>
          <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[11px] opacity-70">
            <span className="shrink-0">{t('yourHand', { n: me.hand.length })}</span>
            <span className="min-w-0 truncate">
              {pending ? (
                t('finishTargeting')
              ) : (
                <>
                  <span className="lg:hidden">
                    {t('sortedHintMobile')} · {t('holdForDetails')}
                  </span>
                  <span className="hidden lg:inline">
                    {t('sortedHint')} · {t('holdForDetails')}
                  </span>
                </>
              )}
            </span>
          </div>
          <div ref={handArea} className="min-w-0">
            {/* جوال: كل الكروت بنفس الحجم في سطر واحد، وفاصل 🔒 بين المجموعتين */}
            <div
              data-hand-layout="mobile"
              data-hand-scroller="mobile"
              className="thin-scroll flex w-full min-w-0 items-stretch gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-2 lg:hidden"
            >
              {playableHand.map((c) => renderHandCard(c, 'md'))}
              {playableHand.length > 0 && parkedHand.length > 0 && (
                <HandSplit title={t('cannotPlay')} />
              )}
              {parkedHand.map((c) => renderHandCard(c, 'md'))}
              {me.hand.length === 0 && (
                <div className="p-4 text-xs opacity-60">{t('emptyHand')}</div>
              )}
            </div>

            {/* كمبيوتر: القابل للعب كبيراً أعلى، والموقوف مصغّراً أسفل */}
            <div data-hand-layout="desktop" className="hidden min-w-0 flex-col gap-1.5 lg:flex">
              {(playableHand.length > 0 || me.hand.length === 0) && (
                <div
                  data-hand-scroller="desktop"
                  className="thin-scroll flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-2"
                >
                  {playableHand.map((c) => renderHandCard(c, 'md'))}
                  {me.hand.length === 0 && (
                    <div className="p-4 text-xs opacity-60">{t('emptyHand')}</div>
                  )}
                </div>
              )}
              {parkedHand.length > 0 && (
                <div className="min-w-0 rounded-lg bg-black/25 px-1 py-1">
                  <div className="mb-0.5 px-1 text-[10px] font-bold opacity-45">
                    🔒 {t('unplayableRow')} · {parkedHand.length}
                  </div>
                  <div className="thin-scroll flex w-full min-w-0 items-end gap-1 overflow-x-auto overscroll-x-contain pb-0.5">
                    {parkedHand.map((c) => renderHandCard(c, 'xs'))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showLog && (
      <aside className="panel m-2 w-full shrink-0 rounded-xl p-2 lg:m-3 lg:w-72">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-bold opacity-80">{t('logTitle')}</div>
          <button
            type="button"
            onClick={() => writeLogPref(false)}
            className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold hover:bg-white/20"
            title={t('hideLog')}
            aria-label={t('hideLog')}
          >
            {t('hideLog')}
          </button>
        </div>
        <div className="thin-scroll h-[60vh] space-y-1 overflow-y-auto pe-1 text-[11px] leading-snug lg:h-[calc(100vh-6rem)]">
          {game.log.map((l, i) => (
            <div
              key={i}
              className={`rounded px-2 py-1 ${
                l.kind === 'win'
                  ? 'bg-amber-400/20 font-bold text-amber-200'
                  : l.kind === 'trap'
                    ? 'bg-fuchsia-500/15 text-fuchsia-200'
                    : l.kind === 'attack'
                      ? 'bg-orange-500/12 text-orange-100'
                      : l.side === ME
                        ? 'bg-emerald-500/10'
                        : l.side !== null
                          ? 'bg-sky-500/10'
                          : 'bg-white/5 opacity-70'
              }`}
            >
              {logText(l)}
            </div>
          ))}
          <div ref={logEnd} />
        </div>
      </aside>
      )}

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

      {detail && (
        <CardDetail
          card={detail.card}
          reason={detail.reason}
          trapPeek={Boolean(detail.peekUid)}
          onClose={() => setDetail(null)}
        />
      )}

      {/* مرجع سريع */}
      {showHelp && (
        <Modal title={t('howToPlay')} onClose={() => setShowHelp(false)}>
          <div className="thin-scroll max-h-[70vh] space-y-3 overflow-y-auto text-[13px] leading-relaxed">
            <HelpRow icon="🎨" title={t('help1')}>
              انظر «العنصر الفعّال» و«الرقم» في وسط اللوحة. أي كارت تلعبه يجب أن يطابق أحدهما.
              الكروت ذات الإطار الأخضر في يدك هي القابلة للعب الآن، والباهتة غير مطابقة أو طاقتك
              لا تكفيها. الفخاخ وقطع الوحش استثناء: تُوضع دون مطابقة.
            </HelpRow>
            <HelpRow icon="⚡" title={t('help2')}>
              الرقم في الدائرة أعلى الكارت هو تكلفته. سقف الطاقة يرتفع +1 كل دور، فالكروت
              القوية تصبح متاحة تدريجياً.
            </HelpRow>
            <HelpRow icon="🐾" title={t('help3')}>
              {t('help3Body', { field: RULES.MAX_FIELD })}
            </HelpRow>
            <HelpRow icon="💥" title={t('help4')}>
              حدّد وحشين أو أكثر يشتركان في العنصر أو الرقم (أو أحدهما بخاصية «رابط») لتضربهما
              معاً بمكافأة +{RULES.COMBO_BONUS_PER_EXTRA} لكل وحش إضافي. مرة واحدة كل دور.
            </HelpRow>
            <HelpRow icon="🎯" title={t('help5')}>
              حين يلعب الخصم «اسحب كرتين»، إمّا أن تردّ بكارت سحب مطابق فتتضاعف العقوبة وتنتقل
              إليه، وإمّا أن تقبل فتسحب وتفقد دورك.
            </HelpRow>
            <HelpRow icon="🗿" title={t('help6')}>
              اجمع قطع الوحش الأعظم الأربع وادفع {TITAN.cost} طاقة → فوز فوري.
            </HelpRow>
            <HelpRow icon="🚫" title={t('helpStuck')}>
              إن لم يكن لديك أي كارت قابل للعب، يصبح زر «اسحب كارتاً» متاحاً — مرة واحدة في الدور.
            </HelpRow>
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

function PlayerStrip({
  state,
  align,
  face,
  impact = 0,
  current = false,
  onFaceClick,
}: {
  state: GameState['players'][0];
  align: 'start' | 'end';
  face: string;
  impact?: number;
  current?: boolean;
  onFaceClick?: () => void;
}) {
  const { t: tr, L, name: pn } = useLocale();
  const hpPct = Math.round((state.hp / Math.max(1, state.maxHp)) * 100);
  return (
    <div
      data-face={face}
      data-current={current ? '1' : undefined}
      role={onFaceClick ? 'button' : undefined}
      tabIndex={onFaceClick ? 0 : undefined}
      onClick={onFaceClick}
      onKeyDown={
        onFaceClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFaceClick();
              }
            }
          : undefined
      }
      className={`relative flex flex-wrap items-center gap-2 text-xs ${align === 'end' ? 'justify-end' : ''} ${
        onFaceClick ? 'cursor-pointer rounded-lg ring-2 ring-orange-400/80' : ''
      }`}
    >
      <span className="font-black">{pn(state.name)}</span>
      {state.eliminated && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold opacity-70">
          {tr('eliminatedTag')}
        </span>
      )}

      <div className="flex items-center gap-1">
        <span className="text-emerald-300">❤</span>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <b className="tabular-nums">{state.hp}</b>
        {impact > 0 && (
          <span className="damage-pop pointer-events-none absolute start-1/2 top-0 z-40 text-base font-black text-rose-300">
            −{impact}
          </span>
        )}
      </div>

      <span className="rounded bg-yellow-400/20 px-2 py-0.5 font-bold text-yellow-200">
        ⚡ {state.energy}/{state.energyCap}
      </span>

      <span className="rounded bg-white/10 px-2 py-0.5">🃏 {state.hand.length}</span>

      <span
        className={`rounded px-2 py-0.5 ${
          state.fragments.length >= TITAN.fragmentsNeeded
            ? 'glow-pulse bg-amber-400 font-black text-black'
            : 'bg-amber-400/15 text-amber-200'
        }`}
        title={state.fragments.map((f) => L(FRAGMENT_NAME[f])).join('، ') || tr('noFragments')}
      >
        🗿 {state.fragments.length}/{TITAN.fragmentsNeeded}
        {state.fragments.length > 0 && (
          <span className="ms-1 opacity-80">
            ({state.fragments.map((f) => L(FRAGMENT_NAME[f])).join('،')})
          </span>
        )}
      </span>

      {state.skipNext && (
        <span className="rounded bg-rose-500/25 px-2 py-0.5 text-rose-200">{tr('willLoseTurn')}</span>
      )}
      {state.attackLocked && (
        <span className="rounded bg-fuchsia-500/25 px-2 py-0.5 text-fuchsia-200">{tr('netted')}</span>
      )}
      {state.barrier && (
        <span className="rounded bg-sky-500/25 px-2 py-0.5 text-sky-200">{tr('barrierOn')}</span>
      )}
      {state.mirror && (
        <span className="rounded bg-purple-500/25 px-2 py-0.5 text-purple-200">{tr('mirrorOn')}</span>
      )}
      {state.amplified && (
        <span className="rounded bg-amber-500/25 px-2 py-0.5 text-amber-200">{tr('amplifiedOn')}</span>
      )}
    </div>
  );
}

function TrapRow({
  traps,
  hidden,
  selectable,
  peekable,
  onPick,
  onPeek,
}: {
  traps: GameState['players'][0]['traps'];
  hidden?: boolean;
  selectable?: boolean;
  peekable?: boolean;
  onPick?: (uid: string) => void;
  onPeek?: (slot: SetTrap) => void;
}) {
  const { t: tr } = useLocale();
  if (traps.length === 0) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[10px] opacity-50">{tr('trapsLabel')}</span>
      {traps.map((slot) => {
        const canPeek = Boolean(peekable && !hidden && slot.defId !== HIDDEN_CARD_ID);
        const clickable = Boolean(selectable || canPeek);
        const label = hidden
          ? tr('faceDownTrap')
          : canPeek
            ? tr('peekTrapHint')
            : tr('faceDownTrap');
        return (
          <button
            key={slot.uid}
            type="button"
            disabled={!clickable}
            data-trap={hidden ? 'foe' : 'own'}
            data-trap-uid={slot.uid}
            onClick={() => {
              if (selectable) onPick?.(slot.uid);
              else if (canPeek) onPeek?.(slot);
            }}
            className={`rounded-md bg-transparent p-0 disabled:opacity-100 ${
              selectable
                ? 'cursor-pointer ring-2 ring-rose-400 glow-pulse'
                : canPeek
                  ? 'cursor-pointer ring-1 ring-fuchsia-300/70 hover:ring-2 hover:ring-fuchsia-200 focus-visible:ring-2 focus-visible:ring-fuchsia-200'
                  : 'cursor-default opacity-90'
            }`}
            title={label}
            aria-label={label}
          >
            <CardBack size="xs" label={tr('faceDown')} />
          </button>
        );
      })}
    </div>
  );
}

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

function EmptySlot({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`grid h-[92px] flex-1 place-items-center rounded-xl border border-dashed border-white/12 text-[11px] opacity-40 ${
        onClick ? 'cursor-pointer opacity-90 ring-2 ring-orange-400/70' : ''
      }`}
    >
      {text}
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
