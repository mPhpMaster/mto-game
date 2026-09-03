import AuthGate from '@/components/auth/AuthGate';
import FriendsScreen from '@/components/social/FriendsScreen';
import { getCurrentAccount } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الأصدقاء — مواجهة الوحوش' };

export default async function FriendsPage({ searchParams }: PageProps<'/friends'>) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.with) ? sp.with[0] : sp.with;
  const account = await getCurrentAccount();

  // البوّابة تُعرض في مكان المحتوى ولا تُحوّل المسار، فلا يضيع ?with=
  if (!account) return <AuthGate />;

  return <FriendsScreen initialAccount={account} initialPeer={raw || undefined} />;
}
