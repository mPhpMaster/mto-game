/**
 * هل البدء أولاً ميزة أم عيب؟ يلعب الطرفان بنفس السياسة تماماً،
 * ويُقاس الفوز بحسب ترتيب اللعب لا بحسب الخانة.
 *   npm run check:order -- 600
 */
import { aiChooseAction } from '../lib/game/ai';
import { applyGameAction, createGame } from '../lib/game/engine';
import type { Difficulty } from '../lib/game/difficulty';
import type { GameState } from '../lib/game/types';

const GAMES = Number(process.argv[2] ?? 600);

function play(seed: number, first: 0 | 1, difficulty: Difficulty) {
  let s: GameState = createGame({
    seed,
    playerName: 'أ',
    opponentName: 'ب',
    opponentIsAI: true,
    difficulty,
    firstPlayer: first,
  });
  s.players[0].isAI = true;

  let actions = 0;
  let guardTurn = -1;
  let guardCount = 0;
  while (s.phase !== 'ended' && actions < 4000) {
    if (s.turn !== guardTurn) { guardTurn = s.turn; guardCount = 0; }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    actions++;
    if (
      s.turn === before.turn &&
      s.log.length === before.log.length &&
      s.players[0].hand.length === before.players[0].hand.length &&
      action.type !== 'END_TURN'
    ) {
      s = applyGameAction(s, { type: 'END_TURN' });
      actions++;
    }
  }
  return s.phase === 'ended' ? s.winner : null;
}

console.log(`${GAMES} مباراة لكل ترتيب — الطرفان بنفس السياسة (صعب)\n`);

let firstWins = 0;
let secondWins = 0;
let unfinished = 0;

for (let g = 0; g < GAMES; g++) {
  // نصف المباريات يبدأ فيها اللاعب 0 والنصف الآخر اللاعب 1،
  // فلا تختلط ميزة الترتيب بميزة الخانة
  const first: 0 | 1 = g % 2 === 0 ? 0 : 1;
  const winner = play(7000 + g, first, 'hard');
  if (winner === null) unfinished++;
  else if (winner === first) firstWins++;
  else secondWins++;
}

const total = firstWins + secondWins;
console.log(`من يبدأ أولاً : ${firstWins} فوزاً (${((firstWins / total) * 100).toFixed(1)}%)`);
console.log(`من يلعب ثانياً: ${secondWins} فوزاً (${((secondWins / total) * 100).toFixed(1)}%)`);
if (unfinished) console.log(`غير منتهية: ${unfinished}`);

const edge = ((firstWins / total) * 100 - 50).toFixed(1);
console.log(
  `\nميزة البدء: ${edge > '0' ? '+' : ''}${edge} نقطة مئوية ` +
    `(التوازن المقبول ±3)`
);
