import LeaderboardScreen from '@/components/LeaderboardScreen';
import type { MatchRow } from '@/components/MatchList';
import { MATCHES_TABLE, getSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'السجل — مواجهة الوحوش' };
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = getSupabase();

  let matches: MatchRow[] = [];
  let configured = Boolean(supabase);
  let errorMessage: string | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .select('id, seed, turns, winner, reason, player_hp, opponent_hp, difficulty, created_at')
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) {
      errorMessage = error.message;
      configured = false;
    } else {
      matches = (data ?? []) as MatchRow[];
    }
  }

  return (
    <LeaderboardScreen matches={matches} configured={configured} errorMessage={errorMessage} />
  );
}
