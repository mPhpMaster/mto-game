import { notFound } from 'next/navigation';
import OnlineGame from '@/components/game/OnlineGame';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/multiplayer/code';
import { parseTurnSeconds } from '@/lib/multiplayer/turnClock';

export const metadata = { title: 'غرفة — مواجهة الوحوش' };

export default async function RoomPage({ params, searchParams }: PageProps<'/vs/[code]'>) {
  const { code: raw } = await params;
  const sp = await searchParams;

  const code = normalizeRoomCode(raw);
  if (!isValidRoomCode(code)) notFound();

  const isHost = (Array.isArray(sp.host) ? sp.host[0] : sp.host) === '1';
  const rawName = Array.isArray(sp.name) ? sp.name[0] : sp.name;
  const myName = (rawName ?? '').trim().slice(0, 20);

  const rawSecs = Array.isArray(sp.secs) ? sp.secs[0] : sp.secs;
  const rawPlayers = Array.isArray(sp.players) ? sp.players[0] : sp.players;
  const playerCount = rawPlayers === '3' ? 3 : 2;

  return (
    <OnlineGame
      code={code}
      role={isHost ? 'host' : 'guest'}
      myName={myName}
      turnSeconds={parseTurnSeconds(rawSecs)}
      playerCount={playerCount}
    />
  );
}
