import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MATCHES_TABLE, getSupabase } from '@/lib/supabase/server';
import { getAuthSupabase } from '@/lib/supabase/auth-server';
import { randomUUID } from 'node:crypto';
import { StatsInput, recordMatch } from '@/lib/social/record';

export const dynamic = 'force-dynamic';

const MatchInput = z.object({
  seed: z.number().int().nonnegative(),
  turns: z.number().int().min(0).max(500),
  winner: z.enum(['player', 'ai']),
  reason: z.string().max(200).nullable().optional(),
  playerHp: z.number().int().min(0).max(999),
  opponentHp: z.number().int().min(0).max(999),
  playerName: z.string().min(1).max(40).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  stats: StatsInput.optional(),
});

export async function POST(request: Request) {
  const parsed = MatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // قاعدة البيانات غير مهيّأة — اللعبة تعمل بدونها
    return NextResponse.json({ saved: false, reason: 'supabase_not_configured' }, { status: 202 });
  }

  const m = parsed.data;

  // سجلّ الحساب مستقلّ عن السجلّ العام المجهول: الأوّل يحتاج جلسة والثاني لا.
  // فشل أحدهما لا يمنع الآخر.
  const authed = await getAuthSupabase();
  const { data: { user } = { user: null } } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  let profileError: string | null = null;
  if (authed && user) {
    const { error: rpcError } = await recordMatch(authed, {
      // مباراة الآلي مقعد واحد فلا صفوف تُضَمّ، ومعرّف عشوائي هو الصحيح:
      // الاشتقاق من البذرة كان سيجعل إعادة لعب البذرة نفسها «تقريراً مكرّراً».
      matchId: randomUUID(),
      mode: 'ai',
      seat: 0,
      playerCount: 2,
      result: m.winner === 'player' ? 'win' : 'loss',
      turns: m.turns,
      hpLeft: m.playerHp,
      reason: m.reason ?? null,
      difficulty: m.difficulty ?? 'easy',
      roomCode: null,
      seed: m.seed,
      opponents: [],
      stats: m.stats ?? { cards: {}, titans: 0, trapsSet: 0 },
    });
    // لا يُفشِل الطلب — السجلّ العام يُكتب على أي حال — لكن الصمت التامّ كان
    // يجعل فشل السياسات والصلاحيات يظهر نجاحاً، فلا يبقى شيء يُختبَر به.
    if (rpcError) profileError = rpcError.message;
  }

  const { error } = await supabase.from(MATCHES_TABLE).insert({
    seed: m.seed,
    turns: m.turns,
    winner: m.winner,
    reason: m.reason ?? null,
    player_hp: m.playerHp,
    opponent_hp: m.opponentHp,
    player_name: m.playerName ?? 'أنت',
    difficulty: m.difficulty ?? 'easy',
  });

  if (error) {
    return NextResponse.json({ saved: false, error: error.message, profileError }, { status: 500 });
  }
  return NextResponse.json({ saved: true, profileError });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false, matches: [], stats: null });
  }

  const [{ data: matches, error }, { data: stats }] = await Promise.all([
    supabase
      .from(MATCHES_TABLE)
      .select('id, seed, turns, winner, reason, player_hp, opponent_hp, difficulty, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase.from('match_stats').select('*').maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ configured: true, error: error.message, matches: [] }, { status: 500 });
  }

  return NextResponse.json({ configured: true, matches: matches ?? [], stats: stats ?? null });
}
