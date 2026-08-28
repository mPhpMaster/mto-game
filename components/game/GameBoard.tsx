'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { aiChooseAction } from '@/lib/game/ai';
import {
  ELEMENT_ICON,
  ELEMENT_NAME,
  ELEMENTS,
  FRAGMENT_NAME,
  HAND_KIND_ORDER,
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
import type { CardDef, GameAction, GameState, PlayableElement } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { playSfx, primeAudio } from '@/lib/audio/sfx';
import { pickSfx } from '@/lib/audio/logSfx';
import LanguageSwitch from '@/components/LanguageSwitch';
import SoundToggle from '@/components/SoundToggle';
import CardDetail from './CardDetail';
import CardView, { CardBack, ELEMENT_HEX, numberLabel } from './CardView';
import MonsterView from './MonsterView';

type Pending =
  | { kind: 'element'; uid: string }
  | { kind: 'target'; uid: string; need: NonNullable<ReturnType<typeof def>['needsTarget']> }
  | null;

const other = (seat: 0 | 1): 0 | 1 => (seat === 0 ? 1 : 0);

/** أسماء اللاعبين تُلتقط بلغة الواجهة وقت الإنشاء لأنها تُخزَّن في الحالة */
function newGame(
  seed: number | undefined,
  tutorial: boolean,
  difficulty: Difficulty,
  names: { you: string; ai: string; coach: string }
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
      });
}

export interface GameBoardProps {
  seed?: number;
  tutorial?: boolean;
  difficulty?: Difficulty;
  /** خانة اللاعب على اللوحة — تتغيّر في اللعب الجماعي */
  mySeat?: 0 | 1;
  /**
   * وضع مُدار من الخارج (اللعب الجماعي): الحالة تأتي جاهزة والحركات تُرسَل
   * إلى الحَكَم بدل تطبيقها محلياً.
   */
  externalState?: GameState;
  onAction?: (action: GameAction) => void;
  /** تمرير الجهاز بين لاعبَين على نفس الشاشة */
  hotseat?: boolean;
  /** مُنشئ مباراة مخصّص (أسماء اللاعبين مثلاً) — يُستعمل أيضاً عند «مباراة جديدة» */
  makeGame?: () => GameState;
  /** شريط معلومات إضافي أعلى اللوحة (حالة الغرفة مثلاً) */
  banner?: React.ReactNode;
  /** يستبدل أزرار نافذة النهاية */
  endActions?: React.ReactNode;
}

export default function GameBoard({
  seed,
  tutorial = false,
  difficulty = DEFAULT_DIFFICULTY,
  mySeat,
  externalState,
  onAction,
  hotseat = false,
  makeGame,
  banner,
  endActions,
}: GameBoardProps) {
  const { t, L, logText, outcomeText, reason, name: pname } = useLocale();
  const [level, setLevel] = useState<Difficulty>(difficulty);
  const names = { you: '@you', ai: '@ai', coach: '@coach' };
  const [internalGame, setInternalGame] = useState<GameState>(
    () => makeGame?.() ?? newGame(seed, tutorial, difficulty, names)
  );
  const controlled = externalState !== undefined;
  const game = controlled ? externalState : internalGame;
  const setGame = setInternalGame;

  // في تمرير الجهاز تتبع الخانة صاحبَ الدور، وفي اللعب الجماعي تكون ثابتة
  const ME: 0 | 1 = hotseat ? game.current : (mySeat ?? 0);
  const FOE: 0 | 1 = other(ME);
  const [step, setStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  /** كارت مفتوح شرحه (ضغط مطوّل أو ضغطة على كارت لا يمكن لعبه) */
  const [detail, setDetail] = useState<{ card: CardDef; reason?: string } | null>(null);
  const [attackers, setAttackers] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
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
  const savedRef = useRef(false);
  const logEnd = useRef<HTMLDivElement>(null);

  const me = game.players[ME];
  const foe = game.players[FOE];
  const myTurn = game.current === ME && game.phase !== 'ended';

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

  // ---------- حلقة الخصم الآلي ----------
  useEffect(() => {
    // لا خصم آلي في اللعب الجماعي ولا في تمرير الجهاز
    if (controlled || hotseat) return;
    if (game.phase === 'ended') return;
    if (!game.players[game.current].isAI) return;

    if (aiSteps.current.turn !== game.turn) aiSteps.current = { turn: game.turn, n: 0 };

    const timer = window.setTimeout(() => {
      // في التعليم لا يهاجم المدرّب — يمرّر دوره ليبقى الدرس متوقّعاً
      if (tutorial) {
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
        if (g.phase === 'ended' || !g.players[g.current].isAI) return g;
        aiSteps.current.n += 1;
        const action =
          aiSteps.current.n > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(g);
        return applyGameAction(g, action);
      });
    }, game.phase === 'respond' ? 500 : 720);

    return () => window.clearTimeout(timer);
  }, [game, tutorial, advanceLesson, controlled, hotseat, setGame]);

  // ---------- حفظ نتيجة المباراة ----------
  useEffect(() => {
    // السجل مخصّص لمبارياتك ضد الخصم الآلي
    if (tutorial || controlled || hotseat) return;
    if (game.phase !== 'ended' || savedRef.current) return;
    savedRef.current = true;
    setSaveState('saving');
    fetch('/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        seed: game.seed,
        turns: game.turn,
        winner: game.winner === ME ? 'player' : 'ai',
        reason: game.winReason?.key ?? null,
        playerHp: me.hp,
        opponentHp: foe.hp,
        difficulty: game.difficulty,
      }),
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
  ]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end' });
  }, [game.log.length, showLog]);

  // المتصفّحات لا تسمح بالصوت قبل تفاعل المستخدم
  useEffect(() => primeAudio(), []);

  // صوت لكل ما استجدّ في السجل منذ آخر رسم
  useEffect(() => {
    const from = lastSfxIndex.current;
    if (game.log.length < from) lastSfxIndex.current = 0; // مباراة جديدة
    const fresh = game.log.slice(lastSfxIndex.current);
    lastSfxIndex.current = game.log.length;
    if (!fresh.length) return;
    for (const name of pickSfx(fresh, ME, game.winner)) playSfx(name);
  }, [game.log, ME, game.winner]);

  // ---------- مساعدات ----------
  const playableUids = useMemo(() => {
    const set = new Set<string>();
    if (!myTurn) return set;
    for (const c of me.hand) if (canPlayCard(game, ME, c.uid).ok) set.add(c.uid);
    return set;
  }, [game, me.hand, myTurn, ME]);

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

  /**
   * حدّ الفصل بين ما يمكن لعبه وما لا يمكن: اليد مرتّبة بالقابل للعب أوّلاً،
   * فعدد القابلة في المقدّمة هو موضع الفاصل. نُظهره في دورك فقط ودون اختيار
   * هدف، وحين توجد المجموعتان معاً — وإلا فلا معنى لفاصل.
   */
  const handSplitAt =
    myTurn && !pending ? orderedHand.filter((c) => playableUids.has(c.uid)).length : -1;
  const showHandSplit = handSplitAt > 0 && handSplitAt < orderedHand.length;

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

  const handScroller = useRef<HTMLDivElement>(null);
  const freshKey = freshUids.join(',');

  /**
   * بداية دورك: أعِد شريط اليد إلى أوّله.
   * اليد مرتّبة بالقابل للعب أولاً، فالبداية هي أهمّ ما تحتاج رؤيته —
   * ولو بقي الشريط حيث تركته لبدأ الدور على كارت لا يعنيك.
   */
  useEffect(() => {
    if (!myTurn) return;
    const first = handScroller.current?.firstElementChild;
    first?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, [game.turn, myTurn]);

  // تمرير الشريط إلى أول كارت جديد، ثم إطفاء الإبراز
  useEffect(() => {
    if (!freshUids.length) return;
    const node = handScroller.current?.querySelector<HTMLElement>('[data-fresh="1"]');
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
    myTurn && game.phase === 'main' && !me.extraDrawUsed && !hasAnyPlayable(game, ME);

  const discardMonsters = useMemo(
    () => game.discard.filter((c) => def(c.defId).kind === 'monster'),
    [game.discard]
  );

  // ---------- التفاعل ----------
  function onHandCard(uid: string) {
    const card = def(game.players[ME].hand.find((c) => c.uid === uid)!.defId);
    const check = canPlayCard(game, ME, uid);
    // الكارت الممنوع: افتح شرحه بدل إطلاق رسالة خطأ تختفي
    if (!myTurn || !check.ok) {
      setDetail({ card, reason: myTurn ? reason(check.reason) || t('cannotPlay') : t('waitYourTurn') });
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
    if (!myTurn || game.phase !== 'main') return;
    if (me.attackLocked) return flash(t('netLocked'));
    const m = me.field.find((x) => x.uid === uid)!;
    if (m.sick) return flash(t('monsterSick'));
    if (m.exhausted) return flash(t('monsterExhausted'));
    setAttackers((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  }

  function launchAttack(target: string | 'face') {
    if (!attackers.length) return flash(t('pickAttacker'));
    const res = evaluateAttack(game, ME, attackers);
    if (!res.ok) return flash(reason(res.reason) || t('invalidAttack'));
    if (target === 'face' && foe.field.length > 0)
      return flash(t('clearFoeFirst'));
    dispatch({ type: 'ATTACK', attackers, target });
  }

  const targeting = pending?.kind === 'target' ? pending.need : null;

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
    setStep(0);
    setLevel(nextLevel);
    setGame(makeGame?.() ?? newGame(undefined, tutorial, nextLevel, names));
  }

  // ---------- العرض ----------
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <main className="flex flex-1 flex-col gap-2 p-2 sm:p-3">
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
            >
              {game.phase === 'ended'
                ? t('ended')
                : myTurn
                  ? hotseat
                    ? t('playerTurn', { name: pname(me.name) })
                    : t('yourTurn')
                  : t('playerTurn', { name: pname(foe.name) })}
            </span>
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
              onClick={() => setShowLog((v) => !v)}
              className="rounded-md bg-white/10 px-2 py-1 lg:hidden"
            >
              {t('history')}
            </button>
          </div>
        </header>

        {banner}

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

        {/* الخصم */}
        <section className={`panel rounded-xl p-2 ${focusRing('foeField')}`}>
          <PlayerStrip state={foe} align="start" />
          <div className="mt-2 flex min-h-[92px] flex-wrap items-start gap-2">
            {foe.field.length === 0 && (
              <EmptySlot text={t('noFoeMonsters')} />
            )}
            {foe.field.map((m) => (
              <MonsterView
                key={m.uid}
                monster={m}
                targetable={
                  (attackers.length > 0 && myTurn) || targeting === 'enemy_monster'
                }
                onClick={
                  targeting === 'enemy_monster'
                    ? () => pickTarget(m.uid)
                    : attackers.length > 0 && myTurn
                      ? () => launchAttack(m.uid)
                      : undefined
                }
              />
            ))}
          </div>
          <TrapRow
            traps={foe.traps}
            hidden
            selectable={targeting === 'enemy_trap'}
            onPick={pickTarget}
          />
        </section>

        {/* الوسط: طابور التدفق */}
        <section
          className={`panel flex items-center justify-center gap-4 rounded-xl p-3 ${focusRing('flow')}`}
        >
          <div className="text-center">
            <div className="mb-1 text-[10px] opacity-60">{t('deckPile')}</div>
            <CardBack size="sm" label={`${game.deck.length}`} />
          </div>

          <div className="text-center">
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
        <section className={`panel rounded-xl p-2 ${focusRing('myField')}`}>
          <TrapRow traps={me.traps} />
          <div className="mt-2 flex min-h-[92px] flex-wrap items-start gap-2">
            {me.field.length === 0 && <EmptySlot text={t('summonHint', { n: RULES.MAX_FIELD })} />}
            {me.field.map((m) => (
              <MonsterView
                key={m.uid}
                monster={m}
                selected={attackers.includes(m.uid)}
                ready={myTurn && !m.sick && !m.exhausted && !me.attackLocked}
                onClick={
                  targeting === 'own_monster'
                    ? () => pickTarget(m.uid)
                    : () => toggleAttacker(m.uid)
                }
              />
            ))}
          </div>
          <div className="mt-2">
            <PlayerStrip state={me} align="end" />
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
                onClick={() => dispatch({ type: 'ACCEPT_DRAW' })}
                className="rounded-lg bg-rose-500/80 px-3 py-1.5 font-bold hover:bg-rose-500"
              >
                {t('acceptPenalty')}
              </button>
            </>
          ) : (
            <>
              <button
                disabled={!attackers.length || foe.field.length > 0}
                onClick={() => launchAttack('face')}
                className="rounded-lg bg-orange-500/85 px-3 py-1.5 font-bold enabled:hover:bg-orange-500 disabled:opacity-35"
              >
                {t('attackFace')}
              </button>
              <button
                disabled={!attackers.length}
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
                disabled={!titanCheck.ok}
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
                disabled={!myTurn || game.phase !== 'main'}
                onClick={() => dispatch({ type: 'END_TURN' })}
                className="ms-auto rounded-lg bg-emerald-500/85 px-4 py-1.5 font-bold enabled:hover:bg-emerald-500 disabled:opacity-35"
              >
                {t('endTurn')}
              </button>
            </>
          )}

          {comboPreview && (
            <span
              className={`w-full rounded-lg px-2 py-1 ${
                comboPreview.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
              }`}
            >
              {comboPreview.ok
                ? `${
                    attackers.length > 1
                      ? t('comboPreview', { damage: comboPreview.damage })
                      : t('attackPreview', { damage: comboPreview.damage })
                  } ${foe.field.length ? t('pickFoeMonster') : t('pressDirect')}`
                : reason(comboPreview.reason)}
            </span>
          )}
        </section>

        {/* اليد */}
        <section className={`panel rounded-xl p-2 ${focusRing('hand')}`}>
          <div className="mb-1 flex items-center justify-between text-[11px] opacity-70">
            <span>{t('yourHand', { n: me.hand.length })}</span>
            <span className="truncate">
              {pending ? t('finishTargeting') : `${t('sortedHint')} · ${t('holdForDetails')}`}
            </span>
          </div>
          <div ref={handScroller} className="thin-scroll flex gap-2 overflow-x-auto pb-2 pt-1">
            {orderedHand.map((c, i) => {
              const d = def(c.defId);
              const check = canPlayCard(game, ME, c.uid);
              const isFresh = freshUids.includes(c.uid);
              // فاصل مرئي قبل أوّل كارت لا يمكن لعبه — يفصل المجموعتين
              const divider = showHandSplit && i === handSplitAt && (
                <div
                  key="hand-split"
                  aria-hidden
                  className="mx-1 flex shrink-0 flex-col items-center justify-center self-stretch"
                  title={t('cannotPlay')}
                >
                  <div className="w-0 flex-1 border-l border-dashed border-white/25" />
                  <span className="my-1 text-base leading-none opacity-40">🔒</span>
                  <div className="w-0 flex-1 border-l border-dashed border-white/25" />
                </div>
              );
              return (
                <Fragment key={c.uid}>
                {divider}
                <div data-fresh={isFresh ? '1' : '0'} className="shrink-0">
                  <CardView
                    card={d}
                    fresh={isFresh}
                    playable={!pending && playableUids.has(c.uid)}
                    // أثناء اختيار الهدف تُجمّد اليد حتى لا يستبدل ضغطٌ عابر الكارت الجاري لعبه
                    dimmed={Boolean(pending) || (myTurn && !playableUids.has(c.uid))}
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
                </Fragment>
              );
            })}
            {me.hand.length === 0 && (
              <div className="p-4 text-xs opacity-60">{t('emptyHand')}</div>
            )}
          </div>
        </section>
      </main>

      {/* السجل */}
      <aside
        className={`panel m-2 w-full shrink-0 rounded-xl p-2 lg:m-3 lg:w-72 ${
          showLog ? '' : 'hidden lg:block'
        }`}
      >
        <div className="mb-2 text-xs font-bold opacity-80">{t('logTitle')}</div>
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
                        : l.side === FOE
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
            <div className="mt-4 flex justify-center gap-4 text-xs opacity-60">
              <span>{t('turnLabel', { n: game.turn })}</span>
              <span>
                ❤ {pname(me.name)}: {me.hp}
              </span>
              <span>
                ❤ {pname(foe.name)}: {foe.hp}
              </span>
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
        <CardDetail card={detail.card} reason={detail.reason} onClose={() => setDetail(null)} />
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
}: {
  state: GameState['players'][0];
  align: 'start' | 'end';
}) {
  const { t: tr, L, name: pn } = useLocale();
  const hpPct = Math.round((state.hp / state.maxHp) * 100);
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${align === 'end' ? 'justify-end' : ''}`}>
      <span className="font-black">{pn(state.name)}</span>

      <div className="flex items-center gap-1">
        <span className="text-emerald-300">❤</span>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <b className="tabular-nums">{state.hp}</b>
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
  onPick,
}: {
  traps: GameState['players'][0]['traps'];
  hidden?: boolean;
  selectable?: boolean;
  onPick?: (uid: string) => void;
}) {
  const { t: tr, L } = useLocale();
  if (traps.length === 0) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[10px] opacity-50">{tr('trapsLabel')}</span>
      {traps.map((slot) => (
        <button
          key={slot.uid}
          disabled={!selectable}
          onClick={() => onPick?.(slot.uid)}
          className={`rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-1 text-[10px] ${
            selectable ? 'cursor-pointer ring-2 ring-rose-400 glow-pulse' : ''
          }`}
          title={hidden ? tr('faceDownTrap') : L(def(slot.defId).text)}
        >
          🕸️ {hidden ? tr('faceDown') : L(def(slot.defId).name)}
        </button>
      ))}
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

function EmptySlot({ text }: { text: string }) {
  return (
    <div className="grid h-[92px] flex-1 place-items-center rounded-xl border border-dashed border-white/12 text-[11px] opacity-40">
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
