import AccountScreen from '@/components/account/AccountScreen';
import AuthGate from '@/components/auth/AuthGate';
import { getAuthSupabase, getCurrentAccount } from '@/lib/supabase/auth-server';
import type { Element } from '@/lib/game/types';
import type { MatchRecordRow, TopCard, TopElement } from '@/lib/social/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حسابي — مواجهة الوحوش' };

export default async function AccountPage() {
  const account = await getCurrentAccount();
  if (!account) return <AuthGate />;

  const supabase = await getAuthSupabase();

  // القراءات الثلاث مستقلّة، فتُنفَّذ معاً بدل انتظار كلٍّ منها
  const [cardsRes, elementsRes, matchesRes] = await Promise.all([
    supabase?.rpc('top_cards', { p_user: account.id, p_limit: 6 }) ?? Promise.resolve({ data: null }),
    supabase?.rpc('top_elements', { p_user: account.id }) ?? Promise.resolve({ data: null }),
    supabase
      ?.from('match_records')
      .select('id, match_id, mode, seat, player_count, result, turns, hp_left, reason, difficulty, opponents, created_at')
      .eq('user_id', account.id)
      .order('created_at', { ascending: false })
      .limit(20) ?? Promise.resolve({ data: null }),
  ]);

  const topCards: TopCard[] = ((cardsRes.data ?? []) as { card_def_id: string; element: string; plays: number }[]).map(
    (r) => ({ cardDefId: r.card_def_id, element: r.element as Element, plays: r.plays })
  );
  const topElements: TopElement[] = ((elementsRes.data ?? []) as { element: string; plays: number }[]).map(
    (r) => ({ element: r.element as Element, plays: Number(r.plays) })
  );
  const matches = (matchesRes.data ?? []) as MatchRecordRow[];

  return (
    <AccountScreen
      initialAccount={account}
      topCards={topCards}
      topElements={topElements}
      matches={matches}
    />
  );
}
