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

  const { data, error } = await supabase
    .from('game_invites')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('id, room_code, player_count, turn_seconds, expires_at, status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_allowed' }, { status: 403 });

  // الصلاحية تُفحص عند القراءة لا بمهمّة دورية
  if (parsed.data.status === 'accepted' && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  return NextResponse.json({
    roomCode: data.room_code,
    playerCount: data.player_count,
    turnSeconds: data.turn_seconds,
    status: data.status,
  });
}
