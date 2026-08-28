import GameBoard from '@/components/game/GameBoard';
import { parseDifficulty } from '@/lib/game/difficulty';

export const metadata = { title: 'المباراة — مواجهة الوحوش' };

export default async function PlayPage({ searchParams }: PageProps<'/play'>) {
  const sp = await searchParams;
  const rawSeed = Array.isArray(sp.seed) ? sp.seed[0] : sp.seed;
  const rawLevel = Array.isArray(sp.level) ? sp.level[0] : sp.level;
  const rawClock = Array.isArray(sp.clock) ? sp.clock[0] : sp.clock;
  const seed = rawSeed && /^\d+$/.test(rawSeed) ? Number(rawSeed) : undefined;
  const clock = rawClock && /^\d+$/.test(rawClock) ? Number(rawClock) : undefined;
  const turnSeconds =
    clock !== undefined && clock >= 5 ? Math.min(600, Math.round(clock)) : undefined;
  return (
    <GameBoard seed={seed} difficulty={parseDifficulty(rawLevel)} turnSeconds={turnSeconds} />
  );
}
