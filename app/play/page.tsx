import GameBoard from '@/components/game/GameBoard';
import { parseDifficulty } from '@/lib/game/difficulty';

export const metadata = { title: 'المباراة — مواجهة الوحوش' };

export default async function PlayPage({ searchParams }: PageProps<'/play'>) {
  const sp = await searchParams;
  const rawSeed = Array.isArray(sp.seed) ? sp.seed[0] : sp.seed;
  const rawLevel = Array.isArray(sp.level) ? sp.level[0] : sp.level;
  const seed = rawSeed && /^\d+$/.test(rawSeed) ? Number(rawSeed) : undefined;
  return <GameBoard seed={seed} difficulty={parseDifficulty(rawLevel)} />;
}
