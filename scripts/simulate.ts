/**
 * محاكاة مباريات آلي-ضد-آلي للتأكد من سلامة المحرّك:
 *   npm run simulate            (200 مباراة)
 *   npm run simulate -- 1000
 */
import { aiChooseAction } from '../lib/game/ai';
import { CATALOG_BREAKDOWN, TOTAL_CARDS } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import { renderMessage } from '../lib/i18n/messages';
import type { GameState } from '../lib/game/types';

const GAMES = Number(process.argv[2] ?? 200);
const MAX_ACTIONS = 4000;

console.log(`السطح: ${TOTAL_CARDS} كارتاً`, CATALOG_BREAKDOWN);
if (TOTAL_CARDS !== 200) {
  console.error(`✗ عدد الكروت ${TOTAL_CARDS} — المتوقّع 200`);
  process.exit(1);
}

/** كل كارت يجب أن يكون في مكان واحد فقط، والمجموع ثابت عند 200 */
function auditCards(s: GameState): { total: number; dupes: string[] } {
  const seen = new Map<string, number>();
  const bump = (uid: string) => seen.set(uid, (seen.get(uid) ?? 0) + 1);
  for (const c of s.deck) bump(c.uid);
  for (const c of s.discard) bump(c.uid);
  for (const p of s.players) {
    for (const c of p.hand) bump(c.uid);
    for (const m of p.field) bump(m.uid);
    for (const t of p.traps) bump(t.uid);
  }
  const claimed = s.players[0].fragments.length + s.players[1].fragments.length;
  return {
    total: seen.size + claimed,
    dupes: [...seen.entries()].filter(([, n]) => n > 1).map(([u, n]) => `${u}×${n}`),
  };
}

const wins = [0, 0];
let auditFailures = 0;
let totalTurns = 0;
let totalActions = 0;
let stalled = 0;
const reasons = new Map<string, number>();

for (let g = 0; g < GAMES; g++) {
  // «صعب» = المحرّك بكامل قوّته، وبدايةٌ ثابتة ليبقى هذا الفحص مقارَناً عبر التعديلات
  let s: GameState = createGame({
    seed: 1000 + g,
    playerName: 'آلي أ',
    opponentName: 'آلي ب',
    opponentIsAI: true,
    difficulty: 'hard',
    firstPlayer: 0,
  });
  s.players[0].isAI = true;

  let actions = 0;
  let guardTurn = -1;
  let guardCount = 0;

  while (s.phase !== 'ended' && actions < MAX_ACTIONS) {
    if (s.turn !== guardTurn) {
      guardTurn = s.turn;
      guardCount = 0;
    }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    actions++;
    if (
      s.turn === before.turn &&
      s.log.length === before.log.length &&
      s.players[0].hand.length === before.players[0].hand.length &&
      s.players[1].hand.length === before.players[1].hand.length &&
      action.type !== 'END_TURN'
    ) {
      // حركة مرفوضة لم تغيّر شيئاً — أنهِ الدور لتفادي الدوران
      s = applyGameAction(s, { type: 'END_TURN' });
      actions++;
    }
  }

  const audit = auditCards(s);
  if (audit.total !== TOTAL_CARDS || audit.dupes.length) {
    auditFailures++;
    console.error(
      `✗ جرد المباراة ${g} (بذرة ${1000 + g}): المجموع ${audit.total}/${TOTAL_CARDS}` +
        (audit.dupes.length ? ` · مكرّرة: ${audit.dupes.slice(0, 5).join(', ')}` : '')
    );
  }

  if (s.phase !== 'ended') {
    stalled++;
    console.error(`✗ المباراة ${g} (بذرة ${1000 + g}) لم تنتهِ بعد ${actions} حركة (الدور ${s.turn})`);
    console.error(
      `   hp=${s.players[0].hp}/${s.players[1].hp} hands=${s.players[0].hand.length}/${s.players[1].hand.length}` +
        ` fields=${s.players[0].field.length}/${s.players[1].field.length} deck=${s.deck.length} discard=${s.discard.length}`
    );
    for (const l of s.log.slice(-12)) console.error('   |', renderMessage(l.key, l.params, 'ar'));
  } else {
    wins[s.winner!]++;
    const r = s.winReason ? renderMessage(s.winReason.key, s.winReason.params, 'ar') : '?';
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  totalTurns += s.turn;
  totalActions += actions;
}

console.log('\n=== النتائج ===');
console.log(`مباريات: ${GAMES} · متعثّرة: ${stalled} · جرد فاشل: ${auditFailures}`);
console.log(`فوز اللاعب الأول: ${wins[0]} · الثاني: ${wins[1]}`);
console.log(`متوسط الأدوار: ${(totalTurns / GAMES).toFixed(1)}`);
console.log(`متوسط الحركات: ${(totalActions / GAMES).toFixed(1)}`);
console.log('\nأسباب الفوز:');
for (const [r, n] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(4)} × ${r}`);
}

process.exit(stalled > 0 || auditFailures > 0 ? 1 : 0);
