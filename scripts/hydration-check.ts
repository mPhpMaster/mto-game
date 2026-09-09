/**
 * يحرس أن المباراة **دالّةٌ في بذرتها وحدها**: بذرةٌ واحدة ⇐ حالةٌ متطابقة
 * حرفاً بحرف، في أي عملية وبأي ترتيب استدعاء.
 *
 * أُضيف بعد عطل حقيقي: عدّاد معرّفات النسخ كان يعيش في الوحدة، فيتراكم في
 * الخادم عبر الطلبات ويبدأ من الصفر في المتصفّح. فيرسم الخادم
 * `data-uid="c590"` ويرسم العميل `data-uid="c46"` للكارت نفسه، وينهار
 * الترطيب على `/tutorial` بلا أن يظهر في أي فحص — الأرقام كلّها صحيحة،
 * والفرق في المعرّفات وحدها.
 *
 * ولهذا لا يقارن هذا الفحص لقطةً محفوظة: يبني مباراتين في العملية نفسها
 * بينهما مباراةٌ ثالثة تحرّك أي عدّاد عالميّ، ثم يطلب تطابقهما. المقارنة
 * على الحالة كلّها لا على السطح وحده، فتشمل اليد والساحة والسجل.
 *   npm run check:hydration
 */
import { applyGameAction, createGame } from '../lib/game/engine';
import { TUTORIAL_SCRIPT } from '../lib/game/tutorial';
import type { GameState } from '../lib/game/types';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

/** أوّل موضع يختلف فيه النصّان — الرسالة بلا موضعٍ لا تدلّ على شيء */
function firstDiff(a: string, b: string): string {
  const i = [...a].findIndex((ch, k) => ch !== b[k]);
  if (i < 0) return `الطول مختلف: ${a.length} مقابل ${b.length}`;
  return `عند المحرف ${i}: «${a.slice(Math.max(0, i - 40), i + 40)}» مقابل «${b.slice(Math.max(0, i - 40), i + 40)}»`;
}

function sameTwice(label: string, build: () => GameState) {
  const first = JSON.stringify(build());
  // مباراةٌ دخيلة بينهما: تحرّك كل عدّاد عالميّ، فتكشف ما يعتمد عليه
  createGame({ seed: 999999 });
  const second = JSON.stringify(build());
  if (first === second) ok(label);
  else bad(`${label} — ${firstDiff(first, second)}`);
}

console.log('حتميّة المباراة (شرطُ سلامة الترطيب):\n');

sameTwice('مباراة عادية ببذرة ثابتة', () =>
  createGame({ seed: 20260909, firstPlayer: 0 })
);

sameTwice('مباراة الدليل التعليمي', () =>
  createGame({ seed: 20260806, firstPlayer: 0, script: TUTORIAL_SCRIPT })
);

sameTwice('مباراة ثلاثية', () =>
  createGame({ seed: 4242, firstPlayer: 0, playerCount: 3 })
);

// الحتميّة يجب أن تصمد بعد اللعب لا عند التوزيع فقط
sameTwice('بعد إنهاء دورين', () => {
  let s = createGame({ seed: 777, firstPlayer: 0 });
  s = applyGameAction(s, { type: 'END_TURN' });
  s = applyGameAction(s, { type: 'END_TURN' });
  return s;
});

// ---------- المعرّفات فريدة رغم اشتقاقها من الترتيب ----------
{
  const s = createGame({ seed: 55, firstPlayer: 0 });
  const all = [
    ...s.deck,
    ...s.discard,
    ...s.players.flatMap((p) => [...p.hand, ...p.traps, ...p.field]),
  ].map((c) => c.uid);
  const unique = new Set(all);
  if (unique.size === all.length) ok(`المعرّفات فريدة (${all.length} نسخة)`);
  else bad(`تكرار في المعرّفات: ${all.length} نسخة و${unique.size} معرّفاً`);
}

// ---------- بذرتان مختلفتان تعطيان مباراتين مختلفتين ----------
{
  const a = JSON.stringify(createGame({ seed: 1, firstPlayer: 0 }).deck.map((c) => c.defId));
  const b = JSON.stringify(createGame({ seed: 2, firstPlayer: 0 }).deck.map((c) => c.defId));
  if (a !== b) ok('بذرتان مختلفتان ⇐ ترتيبان مختلفان');
  else bad('البذرة لا تؤثّر في ترتيب السطح — الخلط معطّل');
}

console.log(
  failures === 0
    ? '\n✓ المباراة دالّةٌ في بذرتها: الخادم والمتصفّح يبنيان الشجرة نفسها.'
    : `\n✗ ${failures} مصدر لا حتميّة — الترطيب سينهار.`
);
process.exit(failures > 0 ? 1 : 0);
