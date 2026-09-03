import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * عميل Supabase للخادم. يعود بـ null إذا لم تُضبط متغيرات البيئة،
 * حتى تعمل اللعبة محلياً ودون قاعدة بيانات.
 */
export function getSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '';

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * عميل بصلاحية الخدمة — لإنشاء الحسابات وحده (`auth.admin`).
 * `getSupabase` أعلاه يتراجع إلى المفتاح المجهول عند غياب مفتاح الخدمة،
 * والمفتاح المجهول لا يستطيع نداء auth.admin، فيلزم عميل لا يقبل هذا التراجع.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const MATCHES_TABLE = 'matches';
