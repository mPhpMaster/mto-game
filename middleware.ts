import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * مهمّة الوسيط **تجديد كوكي الجلسة فقط، لا التخويل**.
 *
 * التبويب يقع في الصفحات نفسها لأن التحويل من هنا يبتلع رابط `/vs/CODE`
 * العميق: الضيف الذي يفتح دعوة صديقه وهو غير مسجَّل يجب أن يرى شاشة الدخول
 * ثم يعود إلى غرفته، لا أن يُقذف إلى الجذر ويفقد الرمز.
 *
 * `matcher` محصور عمداً: `/` و`/play` و`/tutorial` و`/local` و`/arcade*`
 * و`/cards` و`/guide` لا تمرّ من هنا أبداً، فتبقى ساكنة وتعمل دون إنترنت.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';
  // اللعبة تعمل بلا Supabase — لا جلسة تُجدَّد ولا خطأ يُرفع
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const c of list) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // تعذّر التجديد (الشبكة مثلاً) — الجلسة الحالية تبقى كما هي
  }

  return response;
}

export const config = {
  matcher: [
    '/vs/:path*',
    '/friends/:path*',
    '/account/:path*',
    '/leaderboard',
    '/api/:path*',
  ],
};
