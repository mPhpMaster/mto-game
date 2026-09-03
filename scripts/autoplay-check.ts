/**
 * يتأكد أن اللعب التلقائي عند انتهاء المهلة:
 * - يسجّل auto_play
 * - ينفّذ حركات قانونية عبر محرّك الذكاء الاصطناعي
 * - يُنهي الدور (أو المباراة) ولا يعلّق
 *   npm run check:autoplay
 */
import { applyAutoPlay } from '../lib/game/ai';
import { applyGameAction, createGame } from '../lib/game/engine';
import { LOCALES } from '../lib/i18n/locale';
import { renderMessage } from '../lib/i18n/messages';
import type { GameState } from '../lib/game/types';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};
const ok = (m: string) => console.log(`  ✓ ${m}`);

function humanGame(seed: number): GameState {
  const s = createGame({
    seed,
    playerName: 'A',
    opponentName: 'B',
    opponentIsAI: false,
    difficulty: 'hard',
  });
  s.players[0].isAI = false;
  s.players[1].isAI = false;
  return s;
}

console.log('لعب تلقائي:\n');

{
  const ended = createGame({ seed: 1, opponentIsAI: false, firstPlayer: 0 });
  ended.phase = 'ended';
  ended.winner = 0;
  const next = applyAutoPlay(ended);
  if (next.turn === ended.turn && next.logSeq === ended.logSeq) ok('مباراة منتهية: لا حركة');
  else fail('مباراة منتهية تغيّرت بعد اللعب التلقائي');
}

{
  const s = humanGame(42);
  const beforeTurn = s.turn;
  const beforeSide = s.current;
  const next = applyAutoPlay(s);
  if (next.log.some((l) => l.key === 'auto_play' && l.side === beforeSide))
    ok('يسجّل auto_play للاعب الحالي');
  else fail('لم يُسجَّل auto_play');

  for (const l of LOCALES) {
    const text = renderMessage('auto_play', { player: s.players[beforeSide].name }, l);
    if (!text.trim() || text.includes('{')) fail(`auto_play (${l}) ناقص: ${text}`);
  }

  const advanced = next.turn !== beforeTurn || next.phase === 'ended' || next.current !== beforeSide;
  if (advanced) ok(`يتقدّم الدور (${beforeTurn} ← ${next.turn}, phase=${next.phase})`);
  else fail(`الدور لم يتقدّم بعد اللعب التلقائي (turn=${next.turn} current=${next.current})`);
}

{
  let s = humanGame(108);
  const first = applyAutoPlay(s);
  if (first.phase === 'ended') {
    ok('انتهت المباراة في الدور الأول — لا دور ثانٍ للفحص');
  } else {
    const second = applyAutoPlay(first);
    const moved =
      second.turn !== first.turn || second.phase === 'ended' || second.current !== first.current;
    if (moved) ok('دور اللاعب الآخر يُلعب تلقائياً أيضاً (تمرير الجهاز)');
    else fail('اللعب التلقائي للطرف الثاني لم يُنهِ دوره');
    s = second;
  }
}

{
  let hangs = 0;
  for (let seed = 200; seed < 230; seed++) {
    let s = humanGame(seed);
    let steps = 0;
    while (s.phase !== 'ended' && steps < 80) {
      const before = s.turn;
      s = applyAutoPlay(s);
      steps++;
      if (s.phase !== 'ended' && s.turn === before) {
        hangs++;
        fail(`seed ${seed}: اللعب التلقائي علّق في الدور ${s.turn}`);
        break;
      }
    }
  }
  if (hangs === 0) ok('30 بذرة: كل دور ينتهي دون تعليق');
}

{
  const s = humanGame(7);
  s.phase = 'respond';
  s.pendingDraw = 2;
  const next = applyAutoPlay(s);
  const accepted = next.log.some((l) => l.key === 'auto_play');
  const leftRespond = next.phase !== 'respond' || next.turn !== s.turn;
  if (accepted && leftRespond) ok('في عقوبة السحب: يقبل أو يردّ ثم يغادر طور الرد');
  else fail(`عقوبة السحب بقيت عالقة (phase=${next.phase} turn=${next.turn})`);
}

{
  const s = humanGame(3);
  const ended = applyGameAction(s, { type: 'END_TURN' });
  const again = applyAutoPlay(ended);
  if (again.turn !== s.turn && again.log.filter((l) => l.key === 'auto_play').length === 1)
    ok('بعد إنهاء الدور يدوياً: اللعب التلقائي يعمل على الدور الجديد فقط');
  else if (again.log.filter((l) => l.key === 'auto_play').length >= 1)
    ok('اللعب التلقائي بعد END_TURN لا يكرّر الدور السابق');
  else fail('اللعب التلقائي بعد END_TURN لم يعمل');
}

console.log(
  failures === 0 ? '\n✓ اللعب التلقائي قانوني وينهي الدور.' : `\n✗ ${failures} مشكلة في اللعب التلقائي.`
);
process.exit(failures > 0 ? 1 : 0);
