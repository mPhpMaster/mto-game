/**
 * يقيس صعوبة كل مستوى: «لاعب» يلعب بسياسة صعبة ثابتة ضد خصم بإعدادات المستوى.
 * الرقم المهم هو نسبة فوز اللاعب — كلما زادت كان المستوى أسهل.
 *   npm run balance          (300 مباراة لكل مستوى)
 *   npm run balance -- 800
 */
import { aiChooseAction } from '../lib/game/ai';
import { applyGameAction, createGame } from '../lib/game/engine';
import { DIFFICULTIES, type Difficulty } from '../lib/game/difficulty';
import type { GameState } from '../lib/game/types';

const GAMES = Number(process.argv[2] ?? 300);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

console.log(`${GAMES} مباراة لكل مستوى — «اللاعب» يلعب بسياسة صعبة ثابتة\n`);

for (const lvl of LEVELS) {
  let playerWins = 0;
  let stalled = 0;
  let turns = 0;
  let titanLosses = 0;

  for (let g = 0; g < GAMES; g++) {
    let s: GameState = createGame({
      seed: 5000 + g,
      playerName: 'لاعب',
      opponentName: 'خصم',
      opponentIsAI: true,
      difficulty: lvl,
    });
    s.players[0].isAI = true;

    let actions = 0;
    let guardTurn = -1;
    let guardCount = 0;

    while (s.phase !== 'ended' && actions < 4000) {
      if (s.turn !== guardTurn) { guardTurn = s.turn; guardCount = 0; }
      guardCount++;
      // اللاعب يفكّر دائماً بمستوى «صعب» مهما كان مستوى الخصم
      const view: GameState = s.current === 0 ? { ...s, difficulty: 'hard' } : s;
      const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(view);
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

    if (s.phase !== 'ended') stalled++;
    else if (s.winner === 0) playerWins++;
    else if (s.winReason?.key === 'reason_titan') titanLosses++;
    turns += s.turn;
  }

  const pct = ((playerWins / GAMES) * 100).toFixed(1);
  const cfg = DIFFICULTIES[lvl];
  console.log(
    `${cfg.short} ${cfg.label.ar.padEnd(7)} — فوز اللاعب ${pct}% ` +
      `· متوسط الأدوار ${(turns / GAMES).toFixed(1)} ` +
      `· خسارة بالوحش الأعظم ${titanLosses}` +
      (stalled ? ` · متعثّرة ${stalled}` : '')
  );
  console.log(
    `   حياة الخصم ${cfg.aiHp} · سقف طاقته ${cfg.aiMaxEnergyCap} · خطأ ${Math.round(cfg.mistakeChance * 100)}%` +
      ` · تعطيل ${Math.round(cfg.denialWeight * 100)}% · دمج ${cfg.combo ? 'نعم' : 'لا'}`
  );
}
