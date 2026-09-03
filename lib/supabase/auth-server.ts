import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account } from '@/lib/social/types';

/**
 * عميل Supabase على الخادم بجلسة الكوكيز — لمكوّنات الخادم ومسارات /api.
 * يعود بـ null إذا لم تُضبط المفاتيح: نفس عقد `lib/supabase/server.ts`
 * فتبقى اللعبة تعمل بلا قاعدة بيانات.
 *
 * تنبيه: لا يُنادى من `app/layout.tsx` — نداء `cookies()` هناك يجعل كل
 * صفحة ديناميكية ويكسر اللعب دون إنترنت.
 */
export async function getAuthSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';
  if (!url || !key) return null;

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          // مكوّن خادم لا يملك الكتابة — الوسيط (middleware) يجدّد الجلسة
        }
      },
    },
  });
}

/**
 * الحساب الحالي أو null. لا يرمي أبداً: غياب الإعدادات أو الجلسة أو الملف
 * الشخصي كلها حالات «ضيف» عادية لا أخطاء.
 *
 * لا ينسخ `email` إلى `Account` — فالبريد الصوريّ لا يظهر في أي واجهة.
 */
export async function getCurrentAccount(): Promise<Account | null> {
  const supabase = await getAuthSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, wins, losses, matches_played, titan_summons, traps_set, level, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    wins: data.wins,
    losses: data.losses,
    matchesPlayed: data.matches_played,
    titanSummons: data.titan_summons,
    trapsSet: data.traps_set,
    level: data.level,
    createdAt: data.created_at,
  };
}
