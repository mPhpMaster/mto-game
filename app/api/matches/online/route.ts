import { NextResponse } from 'next/server';
import { z } from 'zod';
import { StatsInput, deriveMatchId, recordMatch } from '@/lib/social/record';
import { getAuthSupabase } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

const OnlineMatchInput = z.object({
  roomCode: z.string().regex(/^[A-HJ-NP-Z2-9]{5}$/),
  seed: z.number().int().nonnegative(),
  seat: z.number().int().min(0).max(2),
  playerCount: z.number().int().min(2).max(3),
  result: z.enum(['win', 'loss']),
  turns: z.number().int().min(0).max(500),
  hpLeft: z.number().int().min(0).max(999),
  reason: z.string().max(60).nullable().optional(),
  opponents: z.array(z.string().max(20)).max(2).default([]),
  stats: StatsInput,
});

/**
 * تسجيل مباراة جماعية — **كل عميل يُبلّغ عن صفّه هو فقط**.
 *
 * تفويض المضيف بالإبلاغ عن الجميع ينقل الثقة بلا مقابل: العميل يستطيع
 * الكذب على سجلّ نفسه في الحالتين، لكن RLS تمنعه من الكتابة في سجلّ غيره.
 * الصفوف تُربط بمعرّف مشتقّ على الخادم من (الرمز، البذرة)، والفهرس الفريد
 * `(match_id, user_id)` يجعل إعادة الإرسال بلا أثر.
 */
export async function POST(request: Request) {
  const parsed = OnlineMatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ saved: false, error: 'bad_input' }, { status: 400 });
  }

  const supabase = await getAuthSupabase();
  if (!supabase) {
    return NextResponse.json({ saved: false, reason: 'supabase_not_configured' }, { status: 202 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // ضيف في غرفة: لا حساب يُنسَب إليه شيء — ليس خطأً
  if (!user) return NextResponse.json({ saved: false, reason: 'guest' }, { status: 202 });

  const m = parsed.data;
  const { error } = await recordMatch(supabase, {
    matchId: deriveMatchId(m.roomCode, m.seed),
    mode: 'online',
    seat: m.seat,
    playerCount: m.playerCount,
    result: m.result,
    turns: m.turns,
    hpLeft: m.hpLeft,
    reason: m.reason ?? null,
    difficulty: null,
    roomCode: m.roomCode,
    seed: m.seed,
    opponents: m.opponents,
    stats: m.stats,
  });

  if (error) return NextResponse.json({ saved: false, error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}
