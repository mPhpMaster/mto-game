import HotseatGame from '@/components/game/HotseatGame';

export const metadata = { title: 'على جهاز واحد — مواجهة الوحوش' };

export default async function LocalPage({ searchParams }: PageProps<'/local'>) {
  const sp = await searchParams;
  const rawClock = Array.isArray(sp.clock) ? sp.clock[0] : sp.clock;
  const rawPlayers = Array.isArray(sp.players) ? sp.players[0] : sp.players;
  const clock = rawClock && /^\d+$/.test(rawClock) ? Number(rawClock) : undefined;
  const turnSeconds =
    clock !== undefined && clock >= 5 ? Math.min(600, Math.round(clock)) : undefined;
  const playerCount = rawPlayers === '3' ? 3 : 2;
  return <HotseatGame playerCount={playerCount} turnSeconds={turnSeconds} />;
}
