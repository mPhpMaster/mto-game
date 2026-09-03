/**
 * يتأكّد أن ما يُرسَل إلى الخصم في اللعب الجماعي لا يحمل أي معلومة سرّية:
 * يد الخصم، ترتيب السطح، وهوية الفخاخ المقلوبة.
 *   npm run check:redact
 */
import { aiChooseAction } from '../lib/game/ai';
import { HIDDEN_CARD_ID, def } from '../lib/game/cards';
import { applyGameAction, createGame } from '../lib/game/engine';
import { redactFor } from '../lib/game/redact';
import type { GameState } from '../lib/game/types';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};

function auditView(full: GameState, viewer: 0 | 1, label: string) {
  const view = redactFor(full, viewer);
  const other: 0 | 1 = viewer === 0 ? 1 : 0;

  // 1) لا تسريب: كل كارت في السطح ويد الخصم يجب أن يكون مخفياً
  const leakedDeck = view.deck.filter((c) => c.defId !== HIDDEN_CARD_ID);
  if (leakedDeck.length) fail(`${label}: تسرّب ${leakedDeck.length} كارتاً من السطح.`);

  const leakedHand = view.players[other].hand.filter((c) => c.defId !== HIDDEN_CARD_ID);
  if (leakedHand.length)
    fail(`${label}: تسرّب ${leakedHand.length} كارتاً من يد الخصم (${leakedHand.map((c) => def(c.defId).name).join('، ')}).`);

  const leakedTraps = view.players[other].traps.filter((t) => t.defId !== HIDDEN_CARD_ID);
  if (leakedTraps.length) fail(`${label}: انكشفت هوية ${leakedTraps.length} فخّاً مقلوباً.`);

  // 2) لا تسريب عبر المعرّفات: uid الحقيقي قد يُطابق بين النسخ
  const secretUids = new Set([
    ...full.deck.map((c) => c.uid),
    ...full.players[other].hand.map((c) => c.uid),
    ...full.players[other].traps.map((t) => t.uid),
  ]);
  const viewUids = [
    ...view.deck.map((c) => c.uid),
    ...view.players[other].hand.map((c) => c.uid),
    ...view.players[other].traps.map((t) => t.uid),
  ];
  const leakedUid = viewUids.filter((u) => secretUids.has(u));
  if (leakedUid.length) fail(`${label}: تسرّب ${leakedUid.length} معرّفاً حقيقياً.`);

  // 3) الأعداد تبقى صحيحة لأن الواجهة تعرضها
  if (view.deck.length !== full.deck.length) fail(`${label}: حجم السطح تغيّر.`);
  if (view.players[other].hand.length !== full.players[other].hand.length)
    fail(`${label}: عدد كروت يد الخصم تغيّر.`);
  if (view.players[other].traps.length !== full.players[other].traps.length)
    fail(`${label}: عدد فخاخ الخصم تغيّر.`);

  // 4) ما يخصّ المشاهد يصله كاملاً
  const ownHidden = view.players[viewer].hand.filter((c) => c.defId === HIDDEN_CARD_ID);
  if (ownHidden.length) fail(`${label}: يد المشاهد نفسه أُخفيت عنه.`);
  const ownTrapsHidden = view.players[viewer].traps.filter((t) => t.defId === HIDDEN_CARD_ID);
  if (ownTrapsHidden.length) fail(`${label}: فخاخ المشاهد أُخفيت عنه.`);
  if (JSON.stringify(view.players[viewer].hand) !== JSON.stringify(full.players[viewer].hand))
    fail(`${label}: يد المشاهد تغيّرت.`);

  // 5) الساحة والحياة والطاقة مرئية للطرفين (اللعبة تعتمد عليها)
  if (JSON.stringify(view.players[other].field) !== JSON.stringify(full.players[other].field))
    fail(`${label}: ساحة الخصم يجب أن تبقى مرئية.`);
  if (view.players[other].hp !== full.players[other].hp) fail(`${label}: حياة الخصم تغيّرت.`);

  // 6) كشف كارت البحث لا يصل إلا لصاحبه
  if (full.reveal && full.reveal.side !== viewer && view.reveal)
    fail(`${label}: تسرّب كشف «بحث» الخاص بالخصم.`);
}

// نلعب مباريات كاملة ونفحص كل حالة وسيطة من منظور الطرفين
for (let g = 0; g < 40; g++) {
  let s: GameState = createGame({ seed: 9000 + g, opponentIsAI: true, difficulty: 'hard' });
  s.players[0].isAI = true;

  let steps = 0;
  let guardTurn = -1;
  let guardCount = 0;
  while (s.phase !== 'ended' && steps < 400) {
    auditView(s, 0, `مباراة ${g} دور ${s.turn} (المضيف)`);
    auditView(s, 1, `مباراة ${g} دور ${s.turn} (الضيف)`);
    if (failures > 8) break;

    if (s.turn !== guardTurn) { guardTurn = s.turn; guardCount = 0; }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    steps++;
    if (s.turn === before.turn && s.logSeq === before.logSeq && action.type !== 'END_TURN') {
      s = applyGameAction(s, { type: 'END_TURN' });
      steps++;
    }
  }
  if (failures > 8) break;
}

console.log(
  failures === 0
    ? '✓ لا تسريب: الضيف لا يرى يد المضيف ولا السطح ولا هوية الفخاخ، والأعداد سليمة.'
    : `✗ ${failures} تسريباً.`
);
process.exit(failures > 0 ? 1 : 0);
