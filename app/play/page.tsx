import GameBoard from '@/components/game/GameBoard';
import { parseDifficulty } from '@/lib/game/difficulty';
import { makeSeed } from '@/lib/game/rng';

export const metadata = { title: 'المباراة — مواجهة الوحوش' };

export default async function PlayPage({ searchParams }: PageProps<'/play'>) {
  const sp = await searchParams;
  const rawSeed = Array.isArray(sp.seed) ? sp.seed[0] : sp.seed;
  const rawLevel = Array.isArray(sp.level) ? sp.level[0] : sp.level;
  const rawClock = Array.isArray(sp.clock) ? sp.clock[0] : sp.clock;
  const rawPlayers = Array.isArray(sp.players) ? sp.players[0] : sp.players;
  /*
   * البذرة تُولَّد هنا لا تُترك فارغة. بتركها يستدعي `createGame` دالّة
   * `makeSeed` في الطرفين، فيبني الخادم مباراةً ويبني المتصفّح غيرها: يدٌ
   * في الشجرة المرسَلة ويدٌ أخرى في شجرة الترطيب، فتنهار المطابقة
   * («React error #418» في الإنتاج). وتوليدها بعد `await searchParams`
   * يبقيها داخل الجزء الديناميكي من الصفحة، فلا تُخزَّن بذرةٌ واحدة
   * يتقاسمها كل الزوّار.
   */
  const seed = rawSeed && /^\d+$/.test(rawSeed) ? Number(rawSeed) : makeSeed();
  const clock = rawClock && /^\d+$/.test(rawClock) ? Number(rawClock) : undefined;
  const turnSeconds =
    clock !== undefined && clock >= 5 ? Math.min(600, Math.round(clock)) : undefined;
  const playerCount = rawPlayers === '3' ? 3 : 2;
  return (
    <GameBoard
      seed={seed}
      difficulty={parseDifficulty(rawLevel)}
      turnSeconds={turnSeconds}
      playerCount={playerCount}
    />
  );
}
