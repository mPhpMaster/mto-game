'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

/**
 * عميل Supabase للمتصفّح — يُستعمل لقنوات البثّ في اللعب الجماعي فقط.
 * يعود بـ null إذا لم تُضبط متغيّرات البيئة، فتظهر رسالة واضحة بدل الانهيار.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

export const MULTIPLAYER_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

/** اللعب عبر الأجهزة يحتاج Supabase. تبويبات نفس المتصفّح تعمل بـ BroadcastChannel بلا مفاتيح. */
export const CROSS_DEVICE_READY = MULTIPLAYER_READY;
