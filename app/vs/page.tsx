import AuthGate from '@/components/auth/AuthGate';
import RoomLobby from '@/components/game/RoomLobby';
import { getCurrentAccount } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'العب مع صديقك — مواجهة الوحوش' };

export default async function VsPage({ searchParams }: PageProps<'/vs'>) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.players) ? sp.players[0] : sp.players;
  const playerCount = raw === '3' ? 3 : 2;
  const account = await getCurrentAccount();
  if (!account) return <AuthGate />;
  return <RoomLobby initialPlayerCount={playerCount} account={account} />;
}
