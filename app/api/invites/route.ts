import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSupabase } from '@/lib/supabase/auth-server';
import type { GameInvite } from '@/lib/social/types';

export const dynamic = 'force-dynamic';

const CreateInput = z.object({
  toUserId: z.string().uuid(),
  // أبجدية lib/multiplayer/code.ts — بلا I ولا O ولا 0 ولا 1
  roomCode: z.string().regex(/^[A-HJ-NP-Z2-9]{5}$/),
  playerCount: z.union([z.literal(2), z.literal(3)]).default(2),
  turnSeconds: z.number().int().min(15).max(600).default(60),
  seatsTaken: z.number().int().min(1).max(3).default(1),
});

/** الدعوات المعلّقة الواردة التي لم تنتهِ صلاحيتها */
export async function GET() {
  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false, invites: [] }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('game_invites')
    .select('id, from_user, to_user, room_code, player_count, turn_seconds, seats_taken, status, created_at, expires_at')
    .eq('to_user', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const senders = [...new Set(rows.map((r) => r.from_user))];
  const { data: profiles } = senders.length
    ? await supabase.from('profiles').select('id, display_name').in('id', senders)
    : { data: [] as never[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const invites: GameInvite[] = rows.map((r) => ({
    id: r.id,
    fromUser: r.from_user,
    toUser: r.to_user,
    roomCode: r.room_code,
    playerCount: r.player_count as 2 | 3,
    turnSeconds: r.turn_seconds,
    seatsTaken: r.seats_taken,
    status: r.status,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    fromName: nameById.get(r.from_user),
  }));

  return NextResponse.json({ configured: true, invites });
}

/**
 * إنشاء دعوة. الصفّ **هو** نقطة الالتقاء: الغرف نفسها بلا تخزين على الخادم،
 * فالدعوة تحمل الرمز وحده ثم يسلك الطرفان مسار الغرفة القائم بلا تغيير.
 *
 * الرمز قد يكون لغرفة جديدة أو لغرفة مفتوحة فيها مقعد شاغر — الفرق في
 * الواجهة لا هنا، ولذلك لا فهرس فريد: المضيف يدعو عدّة أصدقاء لغرفة واحدة.
 */
export async function POST(request: Request) {
  const parsed = CreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { toUserId, roomCode, playerCount, turnSeconds, seatsTaken } = parsed.data;

  // دعوة قديمة معلّقة بين الطرفين تُلغى أوّلاً حتى لا تتراكم إشعارات ميتة
  await supabase
    .from('game_invites')
    .delete()
    .eq('from_user', user.id)
    .eq('to_user', toUserId)
    .eq('status', 'pending');

  const { data, error } = await supabase
    .from('game_invites')
    .insert({
      from_user: user.id,
      to_user: toUserId,
      room_code: roomCode,
      player_count: playerCount,
      turn_seconds: turnSeconds,
      seats_taken: seatsTaken,
    })
    .select('id, expires_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id, expiresAt: data?.expires_at }, { status: 201 });
}
