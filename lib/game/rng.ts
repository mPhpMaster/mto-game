/** مولّد أرقام عشوائية حتمي (mulberry32) — يسمح بإعادة تشغيل المباراة من نفس البذرة */
export function nextRandom(state: number): [value: number, nextState: number] {
  const a = (state + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a];
}

export function randomInt(state: number, max: number): [value: number, nextState: number] {
  const [v, s] = nextRandom(state);
  return [Math.floor(v * max), s];
}

/** خلط Fisher–Yates حتمي */
export function shuffle<T>(items: T[], state: number): [shuffled: T[], nextState: number] {
  const arr = items.slice();
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const [j, ns] = randomInt(s, i + 1);
    s = ns;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [arr, s];
}

export function makeSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}

/**
 * خلط بمنحنى: يخلط أولاً خلطاً كاملاً، ثم يرتّب بمفتاح = وزن الكارت + ضوضاء.
 *
 * الغرض أن تظهر الكروت الرخيصة قرب أعلى السطح والغالية قرب أسفله، فتوافق
 * الطاقةَ المتصاعدة، مع إبقاء `spread` من العشوائية حتى لا يصبح الترتيب
 * متوقّعاً. الخلط الكامل أولاً يضمن ألا يتسرّب ترتيب الكتالوج إلى النتيجة.
 *
 * spread = 0 ترتيب صارم بالتكلفة، وspread كبير يقترب من الخلط العشوائي.
 */
export function curveShuffle<T>(
  items: T[],
  weightOf: (item: T) => number,
  spread: number,
  state: number
): [shuffled: T[], nextState: number] {
  const [base, afterShuffle] = shuffle(items, state);
  let s = afterShuffle;

  const keyed = base.map((item) => {
    const [r, ns] = nextRandom(s);
    s = ns;
    return { item, key: weightOf(item) + (r - 0.5) * spread };
  });

  keyed.sort((a, b) => a.key - b.key);
  return [keyed.map((k) => k.item), s];
}
