/**
 * يتأكّد أن ترتيب اليد يضع القابل للعب أولاً، ثم داخل كل مجموعة يرتّب حسب
 * النوع (وحوش ثم أفخاخ ثم البقية)، وأن المعيار ثابت لا يتغيّر بتغيّر صاحب
 * الدور (وإلا قفزت الكروت في يد اللاعب كل دور).
 *   npm run check:hand
 */
import { HAND_KIND_ORDER, def } from '../lib/game/cards';
import { canPlayCard, createGame } from '../lib/game/engine';
import type { GameState } from '../lib/game/types';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};

const kindRank = (defId: string) => HAND_KIND_ORDER[def(defId).kind] ?? 99;

function order(s: GameState, side: 0 | 1): string[] {
  const rank = (uid: string) => (canPlayCard(s, side, uid, true).ok ? 0 : 1);
  return s.players[side].hand
    .map((c, i) => ({ c, i, r: rank(c.uid), k: kindRank(c.defId), cost: def(c.defId).cost }))
    .sort((a, b) => a.r - b.r || a.k - b.k || a.cost - b.cost || a.i - b.i)
    .map((x) => x.c.uid);
}

let mixedSeen = 0;

for (let g = 0; g < 60; g++) {
  const s = createGame({ seed: 3000 + g, opponentIsAI: true, difficulty: 'hard' });

  for (const side of [0, 1] as const) {
    const sorted = order(s, side);
    const flags = sorted.map((uid) => canPlayCard(s, side, uid, true).ok);

    // 1) لا يظهر قابلٌ للعب بعد غير قابل
    const firstBad = flags.indexOf(false);
    if (firstBad >= 0 && flags.slice(firstBad).some(Boolean)) {
      fail(`بذرة ${3000 + g} خانة ${side}: كارت قابل للعب جاء بعد غير قابل.`);
    }
    if (flags.some(Boolean) && flags.some((f) => !f)) mixedSeen++;

    // 1ب) داخل كل مجموعة قابلية: النوع لا يتناقص، وداخل النوع الواحد التكلفة
    // لا تتناقص (الأرخص أوّلاً)
    const defOf = new Map(s.players[side].hand.map((c) => [c.uid, c.defId]));
    const costOf = (uid: string) => def(defOf.get(uid)!).cost;
    for (let i = 1; i < sorted.length; i++) {
      if (flags[i] !== flags[i - 1]) continue; // حدّ مجموعة جديدة
      const kPrev = kindRank(defOf.get(sorted[i - 1])!);
      const kCur = kindRank(defOf.get(sorted[i])!);
      if (kCur < kPrev) {
        fail(`بذرة ${3000 + g} خانة ${side}: النوع خارج الترتيب داخل المجموعة.`);
        break;
      }
      if (kCur === kPrev && costOf(sorted[i]) < costOf(sorted[i - 1])) {
        fail(`بذرة ${3000 + g} خانة ${side}: التكلفة خارج الترتيب داخل النوع.`);
        break;
      }
    }

    // 2) الترتيب لا يعتمد على من عليه الدور
    const flipped: GameState = { ...s, current: side === 0 ? 1 : 0 };
    if (order(flipped, side).join(',') !== sorted.join(',')) {
      fail(`بذرة ${3000 + g} خانة ${side}: الترتيب تغيّر بتغيّر صاحب الدور.`);
    }

    // 3) اليد نفسها لم تُفقد ولم تتكرّر
    if (new Set(sorted).size !== s.players[side].hand.length) {
      fail(`بذرة ${3000 + g} خانة ${side}: الترتيب غيّر محتوى اليد.`);
    }
  }
}

if (mixedSeen < 10) fail(`عيّنة ضعيفة: ${mixedSeen} حالة مختلطة فقط.`);

console.log(
  failures === 0
    ? `✓ ترتيب اليد سليم (${mixedSeen} حالة مختلطة فُحصت).`
    : `✗ ${failures} مشكلة في الترتيب.`
);
process.exit(failures > 0 ? 1 : 0);
