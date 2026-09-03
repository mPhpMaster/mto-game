import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CHAT_MAX_LEN, sanitizeChatText } from '@/lib/chat/text';
import { getAuthSupabase } from '@/lib/supabase/auth-server';

export const dynamic = 'force-dynamic';

const SendInput = z.object({
  toUserId: z.string().uuid(),
  text: z.string().min(1).max(CHAT_MAX_LEN * 2),
});
const ReadInput = z.object({ peerId: z.string().uuid() });

/** محادثة واحدة: أحدث 50 رسالة بترتيب زمني تصاعدي للعرض */
export async function GET(request: Request) {
  const peer = new URL(request.url).searchParams.get('peer');
  if (!peer) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false, messages: [] }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const lo = user.id < peer ? user.id : peer;
  const hi = user.id < peer ? peer : user.id;

  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .eq('pair_lo', lo)
    .eq('pair_hi', hi)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ configured: true, messages: (data ?? []).reverse() });
}

/**
 * إرسال رسالة. التنقية على العميل أيضاً (نفس `sanitizeChatText` التي
 * تستعملها دردشة المباراة)، وقيد `char_length` في القاعدة سدٌّ خلفي،
 * وسياسة RLS تشترط صداقة مقبولة — فلا رسائل من غرباء.
 */
export async function POST(request: Request) {
  const parsed = SendInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const body = sanitizeChatText(parsed.data.text);
  if (!body) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: user.id, recipient_id: parsed.data.toUserId, body })
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}

/** تعليم محادثة كمقروءة عند فتحها */
export async function PATCH(request: Request) {
  const parsed = ReadInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const { data, error } = await supabase.rpc('mark_conversation_read', {
    p_peer: parsed.data.peerId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ read: data ?? 0 });
}
