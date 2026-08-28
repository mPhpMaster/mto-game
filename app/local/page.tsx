import HotseatGame from '@/components/game/HotseatGame';

export const metadata = { title: 'لاعبان على جهاز واحد — مواجهة الوحوش' };

export default async function LocalPage({ searchParams }: PageProps<'/local'>) {
  const sp = await searchParams;
  const rawClock = Array.isArray(sp.clock) ? sp.clock[0] : sp.clock;
  const clock = rawClock && /^\d+$/.test(rawClock) ? Number(rawClock) : undefined;
  const turnSeconds =
    clock !== undefined && clock >= 5 ? Math.min(600, Math.round(clock)) : undefined;
  return <HotseatGame turnSeconds={turnSeconds} />;
}
