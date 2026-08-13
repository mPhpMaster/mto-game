import { aiChooseAction } from '../lib/game/ai';
import { def } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import { renderMessage } from '../lib/i18n/messages';
import type { GameState } from '../lib/game/types';

const seed = Number(process.argv[2] ?? 1078);
let s: GameState = createGame({ seed, playerName: 'أ', opponentName: 'ب', opponentIsAI: true });
s.players[0].isAI = true;

let actions = 0;
let guardTurn = -1;
let guardCount = 0;
const actionCounts = new Map<string, number>();

while (s.phase !== 'ended' && actions < 4000) {
  if (s.turn !== guardTurn) {
    guardTurn = s.turn;
    guardCount = 0;
  }
  guardCount++;
  const a = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
  if (actions > 3900) {
    const p = s.players[s.current];
    console.log(
      `t${s.turn} p${s.current} phase=${s.phase} hp=${s.players[0].hp}/${s.players[1].hp}`,
      `hand=${p.hand.length} field=${p.field.length} deck=${s.deck.length} disc=${s.discard.length}`,
      `flow=${s.flow.element}/${s.flow.number}`,
      `-> ${a.type}${a.type === 'PLAY' ? ':' + def(p.hand.find((c) => c.uid === a.uid)!.defId).name : ''}`
    );
  }
  actionCounts.set(a.type, (actionCounts.get(a.type) ?? 0) + 1);
  s = applyGameAction(s, a);
  actions++;
}

console.log('\nphase:', s.phase, 'turn:', s.turn, 'actions:', actions);
console.log('hp:', s.players[0].hp, s.players[1].hp);
console.log('hands:', s.players[0].hand.length, s.players[1].hand.length);
console.log('fields:', s.players[0].field.length, s.players[1].field.length);
console.log('deck/discard:', s.deck.length, s.discard.length);
console.log('actions:', Object.fromEntries(actionCounts));
console.log('\nlast log:');
for (const l of s.log.slice(-25)) console.log(' ', renderMessage(l.key, l.params, 'ar'));
