import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeUsername } from '@/lib/auth/username';
import { getAuthSupabase } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

const SearchInput = z.object({ username: z.string().min(1).max(40) });

/**
 * بحث بالاسم الكامل فقط. لا بحث ببادئة ولا سرد: التطبيق يعمل بمفتاح مجهول
 * مكشوف في المتصفّح، ودليل مستخدمين قابل للسرد يُحصَد في دقائق.
 *
 * المسار يمرّ بالخادم لا بنداء RPC مباشر من المتصفّح، ليبقى `normalizeUsername`
 * مصدراً واحداً للحقيقة (فيجد الباحثُ «أحمد» من كتب «احمد»).
 */
export async function POST(request: Request) {
  const parsed = SearchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ found: false }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ found: false, configured: false }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase.rpc('find_profile_by_username', {
    p_username: normalizeUsername(parsed.data.username),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    profile: {
      id: hit.id,
      username: hit.username,
      displayName: hit.display_name,
      level: hit.level,
    },
  });
}
