/** يتأكد أن قرعة البداية متكافئة ولا تُفضّل خانة على أخرى */
import { createGame } from '../lib/game/engine';

const N = Number(process.argv[2] ?? 1000);
const first = [0, 0];
for (let i = 0; i < N; i++) {
  const g = createGame({ seed: 100000 + i });
  first[g.current]++;
}
const pct = (n: number) => ((n / N) * 100).toFixed(1) + '%';
console.log(`قرعة البداية على ${N} مباراة:`);
console.log(`  يبدأ اللاعب (خانة 0): ${first[0]} = ${pct(first[0])}`);
console.log(`  يبدأ الخصم  (خانة 1): ${first[1]} = ${pct(first[1])}`);
const skew = Math.abs(first[0] / N - 0.5) * 100;
console.log(skew <= 4 ? `\n✓ متكافئة (انحراف ${skew.toFixed(1)} نقطة)` : `\n✗ منحازة بـ${skew.toFixed(1)} نقطة`);
process.exit(skew <= 4 ? 0 : 1);
