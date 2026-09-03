import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSupabase } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

const PatchInput = z.object({ status: z.enum(['accepted', 'declined', 'cancelled']) });

/**
 * قبول الدعوة أو رفضها أو إلغاؤها. القبول لا يحجز مقعداً: لو قبل صديقان
 * دعوتين لمقعد واحد فإن `claimSeat` عند المضيف يردّ الثاني بـ`roomFull`
 * وتعرض `OnlineGame` رسالتها القائمة — فلا حاجة لحجز على الخادم.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const accepting = parsed.data.status === 'accepted';
  const base = supabase.from('game_invites').update({ status: parsed.data.status }).eq('id', id);
  // شرط الصلاحية داخل الـupdate نفسه فتضمنه قاعدة البيانات: كان الصفّ يُقلَب
  // إلى accepted أوّلاً ثم يُفحَص الوقت في JavaScript، فتُستهلك الدعوة المنتهية
  // فعلاً قبل أن يُعاد 410. والرفض والإلغاء يبقيان مسموحين بعد الانتهاء.
  const { data, error } = await (accepting ? base.gt('expires_at', new Date().toISOString()) : base)
    .select('id, room_code, player_count, turn_seconds, status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    // لا صفّ: إمّا انتهت الصلاحية وإمّا لست طرفاً فيها. القراءة تحكمها
    // invites_select_mine، فرجوعُ صفّ هنا يعني أن الحقّ ثابت والمانع هو الوقت.
    if (accepting) {
      const { data: exists } = await supabase
        .from('game_invites')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (exists) return NextResponse.json({ error: 'expired' }, { status: 410 });
    }
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 });
  }

  return NextResponse.json({
    roomCode: data.room_code,
    playerCount: data.player_count,
    turnSeconds: data.turn_seconds,
    status: data.status,
  });
}
