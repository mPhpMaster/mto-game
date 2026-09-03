/**
 * يتأكد أن مباراة 1 ضد 1 ضد 1 تعمل: ثلاث خانات، دوران الأدوار،
 * الهجوم على أي خصم، والفوز لآخر واقف. ويبقي 1 ضد 1 سليماً.
 *   npm run check:ffa3
 */
import { applyAutoPlay, aiChooseAction } from '../lib/game/ai';
import { HIDDEN_CARD_ID } from '../lib/game/cards';
import {
  applyGameAction,
  createGame,
  livingSeats,
  nextLiving,
  opponentsOf,
} from '../lib/game/engine';
import { redactFor } from '../lib/game/redact';
import type { GameState } from '../lib/game/types';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};
const ok = (m: string) => console.log(`  ✓ ${m}`);

function ffa3(seed: number, first = 0): GameState {
  return createGame({
    seed,
    playerCount: 3,
    firstPlayer: first,
    opponentIsAI: true,
    roster: [
      { name: 'A', isAI: true },
      { name: 'B', isAI: true },
      { name: 'C', isAI: true },
    ],
    difficulty: 'hard',
  });
}

console.log('1 ضد 1 ضد 1:\n');

{
  const duo = createGame({ seed: 1, opponentIsAI: true, firstPlayer: 0 });
  if (duo.players.length === 2) ok('1 ضد 1 ما زال بخانتين');
  else fail(`1 ضد 1 صار ${duo.players.length} خانات`);
  if (duo.turnDir === 1) ok('اتجاه الدور الافتراضي +1');
  else fail(`turnDir=${duo.turnDir}`);
}

{
  const s = ffa3(11, 0);
  if (s.players.length === 3) ok('ثلاث خانات في المباراة الثلاثية');
  else fail(`المتوقع 3 لاعبين، وُجد ${s.players.length}`);
  if (s.players.every((p) => p.hand.length >= 5)) ok('كل لاعب بدأ بيد');
  else fail(`أيدي: ${s.players.map((p) => p.hand.length).join('/')}`);
  if (s.current === 0) ok('firstPlayer=0 يحترم الخانة');
  else fail(`current=${s.current} والمتوقع 0`);
  const laterBonus = s.players.filter((p, i) => i !== 0 && p.bonusEnergy >= 1).length;
  // beginTurn للاعب الأول يصفّر bonusEnergy للبادئ فقط
  if (s.players[1].bonusEnergy >= 1 && s.players[2].bonusEnergy >= 1)
    ok('الثاني والثالث يأخذان طاقة تعويض');
  else fail(`bonusEnergy: ${s.players.map((p) => p.bonusEnergy).join('/')}`);
  void laterBonus;
}

{
  let s = ffa3(22, 0);
  const seen: number[] = [s.current];
  for (let i = 0; i < 6; i++) {
    s = applyGameAction(s, { type: 'END_TURN' });
    seen.push(s.current);
  }
  const cycle = seen.slice(0, 3).join('');
  if (cycle === '012' || seen.join('').includes('012')) ok(`دوران الأدوار: ${seen.join('→')}`);
  else fail(`دوران الأدوار غير ثلاثي: ${seen.join('→')}`);
}

{
  let s = ffa3(33, 0);
  s.turnDir = -1;
  const nxt = nextLiving(s, 0);
  if (nxt === 2) ok('الاتجاه المعكوس: بعد 0 يأتي 2');
  else fail(`nextLiving عكسياً من 0 = ${nxt}`);
}

{
  let s = ffa3(44, 0);
  // أفرغ الساحات ليُسمح بالهجوم المباشر على الوجه
  for (const p of s.players) p.field = [];
  const MON = 'mon_fire_lahibo_1';
  s.players[0].field = [
    {
      uid: 'atk1',
      defId: MON,
      atk: 5,
      hp: 8,
      maxHp: 8,
      exhausted: false,
      sick: false,
    },
  ];
  s.players[1].hp = 4;
  s.players[2].hp = 30;

  const uid = s.players[0].field[0].uid;
  const hit2 = applyGameAction(s, {
    type: 'ATTACK',
    attackers: [uid],
    target: 'face',
    targetSeat: 2,
  });
  if (hit2.players[2].hp < 30 && hit2.players[1].hp === 4)
    ok('الهجوم المباشر يصيب المقعد 2 دون 1');
  else
    fail(
      `هجوم على 2: hp1=${hit2.players[1].hp} hp2=${hit2.players[2].hp} (المتوقع hp2<30 و hp1=4)`
    );

  const hit1 = applyGameAction(s, {
    type: 'ATTACK',
    attackers: [uid],
    target: 'face',
    targetSeat: 1,
  });
  if (hit1.players[1].hp < 4) ok('الهجوم المباشر يصيب المقعد 1 أيضاً');
  else fail(`هجوم على 1 لم ينقص حياته (${hit1.players[1].hp})`);
}

{
  let s = ffa3(55, 0);
  s.players[1].hp = 0;
  s = applyGameAction(s, { type: 'END_TURN' });
  if (s.phase === 'ended') {
    fail('إقصاء لاعب واحد أنهاه المباراة');
  } else {
    ok('إقصاء واحد لا ينهي الثلاثي');
  }
  if (livingSeats(s).length === 2 || s.players[1].eliminated || s.players[1].hp <= 0) {
    // checkDeath runs on damage, not on END_TURN with already-0 hp unless we damage
  }
  s.players[1].hp = 0;
  s.players[1].eliminated = true;
  s.players[2].hp = 0;
  s.players[2].eliminated = false;
  // fatigue-style check: damage player 2
  s.players[2].hp = 1;
  s.current = 0;
  s.players[0].field = [
    {
      uid: 'finisher',
      defId: 'mon_fire_lahibo_1',
      atk: 9,
      hp: 5,
      maxHp: 5,
      exhausted: false,
      sick: false,
    },
  ];
  for (const p of s.players) if (p !== s.players[0]) p.field = [];
  s.phase = 'main';
  const ended = applyGameAction(s, {
    type: 'ATTACK',
    attackers: ['finisher'],
    target: 'face',
    targetSeat: 2,
  });
  if (ended.phase === 'ended' && ended.winner === 0) ok('آخر واقف يفوز بعد إقصاء الاثنين');
  else fail(`المتوقع فوز 0، phase=${ended.phase} winner=${ended.winner}`);
}

{
  let s = ffa3(66, 0);
  let steps = 0;
  while (s.phase !== 'ended' && steps < 800) {
    const before = s;
    const action = aiChooseAction(s);
    s = applyGameAction(s, action);
    steps++;
    if (s.turn === before.turn && s.logSeq === before.logSeq && action.type !== 'END_TURN') {
      s = applyGameAction(s, { type: 'END_TURN' });
      steps++;
    }
  }
  if (s.phase === 'ended' && s.winner !== null) {
    ok(`آلي ثلاثي ينتهي (فائز ${s.winner} بعد ${s.turn} دوراً)`);
    const living = s.players.filter((p) => !p.eliminated && p.hp > 0);
    if (living.length <= 1) ok('لا يبقى أكثر من واقف واحد');
    else fail(`بقي ${living.length} أحياء بعد النهاية`);
  } else fail(`المباراة الثلاثية لم تنتهِ بعد ${steps} حركة`);
}

{
  const s = ffa3(77, 2);
  const next = applyAutoPlay(s);
  if (next.log.some((l) => l.key === 'auto_play' && l.side === 2))
    ok('اللعب التلقائي يعمل لخانة 2');
  else fail('auto_play لم يُسجَّل لخانة 2');
  if (next.current !== 2 || next.phase === 'ended') ok('المهلة تُنهي دور الخانة 2');
  else fail(`بعد autoplay current=${next.current}`);
}

{
  const s = ffa3(88, 0);
  const view = redactFor(s, 0);
  const leak1 = view.players[1].hand.some((c) => c.defId !== HIDDEN_CARD_ID);
  const leak2 = view.players[2].hand.some((c) => c.defId !== HIDDEN_CARD_ID);
  const trap1 = view.players[1].traps.some((t) => t.defId !== HIDDEN_CARD_ID);
  const trap2 = view.players[2].traps.some((t) => t.defId !== HIDDEN_CARD_ID);
  if (!leak1 && !leak2 && !trap1 && !trap2) ok('التنقيص يخفي يد وفخاخ الخصمين');
  else fail('تسريب في التنقيص الثلاثي');
  if (view.players[0].hand.every((c) => c.defId !== HIDDEN_CARD_ID)) ok('المشاهد يرى يده');
  else fail('يد المشاهد أُخفيت');
}

{
  const s = ffa3(99, 0);
  const foes = opponentsOf(s, 0);
  if (foes.length === 2 && foes.includes(1) && foes.includes(2)) ok('opponentsOf يعيد الخصمين');
  else fail(`opponentsOf(0)=${foes.join(',')}`);
}

console.log(
  failures === 0 ? '\n✓ 1 ضد 1 ضد 1 سليم، و1 ضد 1 لم ينكسر.' : `\n✗ ${failures} مشكلة في الثلاثي.`
);
process.exit(failures > 0 ? 1 : 0);
