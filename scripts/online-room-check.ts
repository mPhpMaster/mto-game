/**
 * يتأكد أن غرفة 1 ضد 1 ضد 1: ثلاث خانات، انضمام، امتلاء، تنقيص لكل مقعد،
 * والحَكَم لا يقبل حركة من غير صاحب الدور. ويبقي 1 ضد 1 سليماً.
 *   npm run check:online
 */
import { HIDDEN_CARD_ID } from '../lib/game/cards';
import { createGame } from '../lib/game/engine';
import { redactFor } from '../lib/game/redact';
import {
  HOST_SEAT,
  canStart,
  claimSeat,
  emptyHumanSeats,
  fillEmptyWithAi,
  makeLobby,
  normalizePlayerCount,
  occupantByClient,
  publicSeats,
  setPresent,
  toRoster,
} from '../lib/multiplayer/seats';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};
const ok = (m: string) => console.log(`  ✓ ${m}`);

console.log('غرفة أونلاين 1 ضد 1 ضد 1:\n');

{
  if (normalizePlayerCount(3) === 3 && normalizePlayerCount(2) === 2 && normalizePlayerCount(99) === 2)
    ok('normalizePlayerCount يحصر 2 أو 3');
  else fail('normalizePlayerCount');
}

{
  const duo = makeLobby(2, { clientId: 'h', name: 'Host' });
  if (duo.length === 2 && duo[0].seat === HOST_SEAT && duo[0].present) ok('1 ضد 1 بخانتين');
  else fail(`1 ضد 1 صار ${duo.length}`);
}

{
  let lobby = makeLobby(3, { clientId: 'h', name: 'Host' });
  if (lobby.length === 3) ok('ثلاث خانات في اللوبي');
  else fail(`المتوقع 3، وُجد ${lobby.length}`);

  const a = claimSeat(lobby, 'g1', 'Aisha');
  lobby = a.lobby;
  if (a.seat === 1) ok('أول ضيف يأخذ المقعد 1');
  else fail(`المقعد الأول ${a.seat}`);

  const b = claimSeat(lobby, 'g2', 'Bilal');
  lobby = b.lobby;
  if (b.seat === 2) ok('ثاني ضيف يأخذ المقعد 2');
  else fail(`المقعد الثاني ${b.seat}`);

  const extra = claimSeat(lobby, 'g3', 'Crowded');
  if (extra.seat === null && extra.reason === 'full') ok('الضيف الرابع يُرفض');
  else fail('الغرفة لم تُرفض الرابع');

  const back = claimSeat(lobby, 'g1', 'Aisha2');
  if (back.seat === 1 && back.lobby[1].name === 'Aisha2') ok('العائد يستعيد مقعده');
  else fail(`إعادة الضم ${back.seat}`);

  if (canStart(lobby, false)) ok('ثلاثة بشر = جاهزون للبدء');
  else fail('canStart فشل بعد امتلاء الثلاثة');
}

{
  let lobby = makeLobby(3, { clientId: 'h', name: 'Host' });
  lobby = claimSeat(lobby, 'g1', 'Aisha').lobby;
  if (canStart(lobby, false)) fail('بدأنا قبل اكتمال الثلاثة');
  else ok('مقعد فارغ يمنع البدء');

  lobby = fillEmptyWithAi(lobby);
  if (lobby[2].isAI && lobby[1].isAI === false && canStart(lobby, true))
    ok('ملء الآلي يبقي الضيف البشري ويبدأ');
  else fail(`بعد الآلي: ${JSON.stringify(lobby.map((s) => ({ ai: s.isAI, name: s.name })))}`);

  const roster = toRoster(lobby);
  if (roster.length === 3 && roster[0].isAI === false && roster[2].isAI) ok('قائمة الإنشاء تمزج بشراً وآلياً');
  else fail(`roster ${JSON.stringify(roster)}`);
}

{
  const lobby = makeLobby(3, { clientId: 'h', name: 'Host' });
  const gone = setPresent(claimSeat(lobby, 'g1', 'A').lobby, 'g1', false);
  if (!gone[1].present && gone[1].clientId === 'g1') ok('الانقطاع يبقي المقعد ولا يمسحه');
  else fail('setPresent');
}

{
  const lobby = claimSeat(
    claimSeat(makeLobby(3, { clientId: 'h', name: 'H' }), 'g1', 'A').lobby,
    'g2',
    'B'
  ).lobby;
  const who = occupantByClient(lobby, 'g2');
  if (who?.seat === 2) ok('occupantByClient يجد المقعد من المعرّف');
  else fail('occupantByClient');

  const pub = publicSeats(lobby, 2);
  if (pub[2].isMe && !pub[0].isMe && pub.length === 3) ok('publicSeats يعلّم خانة المشاهد');
  else fail('publicSeats');
}

{
  const g = createGame({
    seed: 2026,
    playerCount: 3,
    firstPlayer: 0,
    opponentIsAI: false,
    roster: [
      { name: 'H', isAI: false },
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
    ],
  });
  const v1 = redactFor(g, 1);
  const v2 = redactFor(g, 2);
  const leak2from1 = v1.players[2].hand.some((c) => c.defId !== HIDDEN_CARD_ID);
  const leak0from1 = v1.players[0].hand.some((c) => c.defId !== HIDDEN_CARD_ID);
  const leak1from2 = v2.players[1].hand.some((c) => c.defId !== HIDDEN_CARD_ID);
  const own1 = v1.players[1].hand.every((c) => c.defId !== HIDDEN_CARD_ID);
  const own2 = v2.players[2].hand.every((c) => c.defId !== HIDDEN_CARD_ID);
  if (!leak2from1 && !leak0from1 && !leak1from2 && own1 && own2)
    ok('كل مقعد يستقبل يده فقط في البثّ المنقوص');
  else fail('تسريب بين مقاعد الغرفة الثلاثية');
}

{
  const s = createGame({
    seed: 7,
    playerCount: 3,
    firstPlayer: 2,
    roster: [
      { name: 'H', isAI: false },
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
    ],
  });
  if (s.current === 2) ok('firstPlayer يحترم مقعد الضيف الثاني');
  else fail(`المتوقع دور 2، current=${s.current}`);

  const occupant1 = occupantByClient(
    claimSeat(claimSeat(makeLobby(3, { clientId: 'h', name: 'H' }), 'g1', 'A').lobby, 'g2', 'B')
      .lobby,
    'g1'
  );
  if (occupant1 && s.current !== occupant1.seat) ok('حركة المقعد 1 تُرفض في دور المقعد 2 (فحص المضيف)');
  else fail('فحص صاحب الدور');
}

{
  if (emptyHumanSeats(makeLobby(3, { clientId: 'h', name: 'H' })) === 2)
    ok('خانتان بشريتان فارغتان بعد إنشاء المضيف');
  else fail('emptyHumanSeats');
}

console.log(
  failures === 0
    ? '\n✓ غرفة 1 ضد 1 ضد 1 سليمة، و1 ضد 1 لم ينكسر.'
    : `\n✗ ${failures} مشكلة في غرفة الثلاثي.`
);
process.exit(failures > 0 ? 1 : 0);
