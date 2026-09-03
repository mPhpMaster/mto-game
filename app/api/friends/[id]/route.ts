import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSupabase } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

const PatchInput = z.object({ status: z.enum(['accepted', 'blocked']) });

/**
 * القبول (أو الحظر). الحراسة الفعلية في RLS: السياسة تشترط أن يكون
 * المُنادي هو المُرسَل إليه وأن تكون الحالة «معلّقة»، وصلاحية العمود
 * تمنع إعادة كتابة طرفَي العلاقة.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: parsed.data.status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // لا صفّ تغيّر: إمّا لست المُرسَل إليه أو الطلب لم يعد معلّقاً
  if (!data) return NextResponse.json({ error: 'not_allowed' }, { status: 403 });

  return NextResponse.json({ status: data.status });
}

/** الرفض والحذف والإلغاء كلّها محو الصفّ نفسه — فلا حالة declined تُكنَس */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
