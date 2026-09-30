/**
 * يثبت قاعدة الانسحاب: من غاب ولم يعد في مهلته يُقصى — **ولا تنتهي**
 * المباراة بذلك إن بقي لاعبان.
 *
 * وهذا الفرق هو موضع الخطأ المتوقّع: أسهلُ تنفيذٍ للانسحاب أن يُنهي
 * المباراة ويعلن الفائز، وذلك يصحّ في 1 ضد 1 ويكسر الثلاثي — إذ يخرج
 * واحدٌ فيُحسم لمن لم يكمل بعد. ولذلك يُقاس الاثنان.
 *
 * والوقت الحقيقي لا يُقاس هنا: المهلة تعيش في الغرفة لا في المحرّك،
 * والمحرّك لا يرى إلا الحركة. فهذا يفحص الحركة.
 *   npm run check:forfeit
 */
import { applyGameAction, createGame, livingSeats } from '../lib/game/engine';
import type { GameState, Seat } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail = '') => console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};
const eq = (name: string, got: unknown, want: unknown, detail = '') =>
  got === want
    ? ok(name, detail || String(got))
    : bad(name, `${detail ? detail + ' — ' : ''}توقّعت ${String(want)} فجاء ${String(got)}`);

const duel = (): GameState =>
  createGame({ seed: 5150, opponentIsAI: false, firstPlayer: 0, difficulty: 'hard' });

const trio = (): GameState =>
  createGame({
    seed: 5150,
    playerCount: 3,
    firstPlayer: 0,
    opponentIsAI: true,
    roster: [
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
      { name: 'C', isAI: false },
    ],
    difficulty: 'hard',
  });

console.log('الانسحاب:\n');

// ---------- 1 ضد 1: ينسحب الخصم فيفوز الباقي ----------
{
  const s = applyGameAction(duel(), { type: 'FORFEIT', seat: 1 });
  eq('انتهت المباراة', s.phase, 'ended');
  eq('وفاز الباقي', s.winner, 0);
  eq('والسبب انسحاب', s.winReason?.key, 'reason_disconnect');
  eq('والمنسحب مُقصى', s.players[1].eliminated, true);
}

// ---------- الثلاثي: خروج واحدٍ لا ينهي المباراة ----------
{
  const s = applyGameAction(trio(), { type: 'FORFEIT', seat: 1 });
  eq('الثلاثي لم ينتهِ', s.phase, 'main', 'وهذا موضع الخطأ المتوقّع');
  eq('والمنسحب مُقصى', s.players[1].eliminated, true);
  eq('وبقي اثنان', livingSeats(s).length, 2);
  eq('ولا فائز بعد', s.winner, null);
}

// ---------- الثلاثي: انسحاب الثاني يحسمها لآخر واقف ----------
{
  let s = applyGameAction(trio(), { type: 'FORFEIT', seat: 1 });
  s = applyGameAction(s, { type: 'FORFEIT', seat: 2 });
  eq('انتهت بانسحاب الثاني', s.phase, 'ended');
  eq('وفاز آخر واقف', s.winner, 0);
  eq('والسبب انسحاب', s.winReason?.key, 'reason_disconnect');
}

// ---------- ينسحب صاحب الدور فلا يبقى الدور معلّقاً ----------
{
  const before = trio();
  eq('الدور لصاحب الخانة 0', before.current, 0 as Seat);
  const s = applyGameAction(before, { type: 'FORFEIT', seat: 0 });
  eq('انتقل الدور', s.current === 0, false, `صار ${s.current}`);
  eq('وإلى خانةٍ حيّة', livingSeats(s).includes(s.current), true);
  eq('والمباراة مستمرّة', s.phase, 'main');
}

// ---------- انسحابٌ مكرّر لا يفعل شيئاً ----------
{
  const once = applyGameAction(trio(), { type: 'FORFEIT', seat: 1 });
  const twice = applyGameAction(once, { type: 'FORFEIT', seat: 1 });
  eq('لا يُقصى المُقصى مرّتين', livingSeats(twice).length, livingSeats(once).length);
  eq('ولا تنتهي المباراة به', twice.phase, 'main');
}

// ---------- الحركة لا تعدّل الحالة الممرّرة ----------
{
  const before = duel();
  const snapshot = JSON.stringify(before);
  applyGameAction(before, { type: 'FORFEIT', seat: 1 });
  eq('الحالة الأصلية لم تُمَسّ', JSON.stringify(before), snapshot, 'المحرّك ينسخ قبل التعديل');
}

console.log(
  failures === 0
    ? '\n✓ الانسحاب يُقصي صاحبه، ويحسم المباراة حين لا يبقى إلا واحد.'
    : `\n✗ ${failures} فحصاً فشل.`
);
process.exit(failures > 0 ? 1 : 0);
