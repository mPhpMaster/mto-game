import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MATCHES_TABLE, getSupabase } from '@/lib/supabase/server';

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
    return NextResponse.json({ saved: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
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
