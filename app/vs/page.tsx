import RoomLobby from '@/components/game/RoomLobby';

export const metadata = { title: 'العب مع صديقك — مواجهة الوحوش' };

export default async function VsPage({ searchParams }: PageProps<'/vs'>) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.players) ? sp.players[0] : sp.players;
  const playerCount = raw === '3' ? 3 : 2;
  return <RoomLobby initialPlayerCount={playerCount} />;
}
