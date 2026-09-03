import { createHash } from 'node:crypto';
import { z } from 'zod';
import { CARD_BY_ID } from '@/lib/game/cards';
import type { SupabaseClient } from '@supabase/supabase-js';

/** حمولة الإحصاءات كما يرسلها العميل */
export const StatsInput = z
  .object({
    cards: z
      .record(
        z.string().max(60),
        z.object({
          element: z.enum(['fire', 'water', 'grass', 'electric', 'psychic', 'dark', 'wild']),
          plays: z.number().int().min(0).max(60),
        })
      )
      .default({}),
    titans: z.number().int().min(0).max(3).default(0),
    trapsSet: z.number().int().min(0).max(60).default(0),
  })
  .default({ cards: {}, titans: 0, trapsSet: 0 });

export type Stats = z.infer<typeof StatsInput>;

/**
 * معرّفات الكروت تُتحقَّق مقابل الكتالوج هنا: لا جدول كروت في القاعدة،
 * فهذا الموضع هو الوحيد الذي يعرف ما هو كارت حقيقي. المجهول يُسقَط بصمت
 * بدل رفض التقرير كلّه — نتيجة المباراة أهمّ من إحصاء كارت واحد.
 */
export function sanitizeCards(stats: Stats): Record<string, { element: string; plays: number }> {
  const out: Record<string, { element: string; plays: number }> = {};
  for (const [id, v] of Object.entries(stats.cards ?? {})) {
    const def = CARD_BY_ID[id];
    if (!def || v.plays <= 0) continue;
    out[id] = { element: def.element, plays: v.plays };
  }
  return out;
}

/**
 * معرّف مباراة مشترك بين مقاعدها، مشتقّ على الخادم من (رمز الغرفة، البذرة)
 * فلا يختلف عليه العملاء ولا يستطيع أحدهم تلفيقه ليُفسد سجلّ غيره.
 * إعادة المباراة في الغرفة نفسها تولّد بذرة جديدة فيختلف المعرّف.
 */
export function deriveMatchId(roomCode: string, seed: number): string {
  const h = createHash('md5').update(`${roomCode}:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface RecordArgs {
  matchId: string;
  mode: 'ai' | 'online';
  seat: number;
  playerCount: number;
  result: 'win' | 'loss';
  turns: number;
  hpLeft: number;
  reason: string | null;
  difficulty: string | null;
  roomCode: string | null;
  seed: number;
  opponents: string[];
  stats: Stats;
}

/**
 * يكتب صفّ المباراة والإحصاءات والعدّادات في نداء واحد ومعاملة واحدة.
 * الهوية من `auth.uid()` داخل الدالة، فلا يُمرَّر معرّف المستخدم إطلاقاً.
 */
export async function recordMatch(supabase: SupabaseClient, a: RecordArgs) {
  return supabase.rpc('record_match', {
    p_match_id: a.matchId,
    p_mode: a.mode,
    p_seat: a.seat,
    p_player_count: a.playerCount,
    p_result: a.result,
    p_turns: a.turns,
    p_hp_left: a.hpLeft,
    p_reason: a.reason,
    p_difficulty: a.difficulty,
    p_room_code: a.roomCode,
    p_seed: a.seed,
    p_opponents: a.opponents.slice(0, 2).map((n) => n.slice(0, 20)),
    p_cards: sanitizeCards(a.stats),
    p_titans: a.stats.titans,
    p_traps: a.stats.trapsSet,
  });
}
