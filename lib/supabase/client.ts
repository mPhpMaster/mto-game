'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

/**
 * عميل Supabase للمتصفّح — قنوات البثّ في اللعب الجماعي، وجلسة الحساب.
 * يعود بـ null إذا لم تُضبط متغيّرات البيئة، فتظهر رسالة واضحة بدل الانهيار.
 *
 * `createBrowserClient` من @supabase/ssr يحفظ الجلسة في كوكيز يقرأها الخادم
 * أيضاً — وهذا ما يتيح لمكوّنات الخادم ومسارات /api معرفة صاحب الطلب.
 * عميل واحد لكل تبويب، فيتقاسم اللعبُ الجماعي والدردشةُ والاجتماعياتُ سوكيتاً واحداً.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  cached = url && key ? createBrowserClient(url, key) : null;
  return cached;
}

export const MULTIPLAYER_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

/** اللعب عبر الأجهزة يحتاج Supabase. تبويبات نفس المتصفّح تعمل بـ BroadcastChannel بلا مفاتيح. */
export const CROSS_DEVICE_READY = MULTIPLAYER_READY;
