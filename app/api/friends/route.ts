import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSupabase } from '@/lib/supabase/auth-server';
import type { FriendEdge, PublicProfile } from '@/lib/social/types';

export const dynamic = 'force-dynamic';

const RequestInput = z.object({ toUserId: z.string().uuid() });

interface Row {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

function toProfile(p: {
  id: string;
  username: string;
  display_name: string;
  level: number;
}): PublicProfile {
  return { id: p.id, username: p.username, displayName: p.display_name, level: p.level };
}

/** قائمة الأصدقاء والطلبات الواردة والصادرة */
export async function GET() {
  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false, edges: [] }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (rows ?? []) as Row[];
  const otherIds = list.map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
  // سياسة profiles تسمح بقراءة ملفّ كل من بينك وبينه علاقة، فنداء واحد يكفي
  const { data: profiles } = otherIds.length
    ? await supabase.from('profiles').select('id, username, display_name, level').in('id', otherIds)
    : { data: [] as never[] };

  const byId = new Map((profiles ?? []).map((p) => [p.id, toProfile(p)]));
  const edges: FriendEdge[] = list
    .map((r) => {
      const outgoing = r.requester_id === user.id;
      const profile = byId.get(outgoing ? r.addressee_id : r.requester_id);
      if (!profile) return null;
      return {
        id: r.id,
        status: r.status,
        direction: outgoing ? ('outgoing' as const) : ('incoming' as const),
        profile,
        createdAt: r.created_at,
      };
    })
    .filter((e): e is FriendEdge => e !== null);

  return NextResponse.json({ configured: true, edges });
}

/**
 * إرسال طلب صداقة. إن كان الطرف الآخر قد أرسل طلباً معلّقاً بالفعل فإن
 * الفهرس الفريد على الزوج يمنع الصفّ الثاني — ونعامل ذلك كقبول متبادل
 * فوري بدل إظهار خطأ لا معنى له للاعب.
 */
export async function POST(request: Request) {
  const parsed = RequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const supabase = await getAuthSupabase();
  if (!supabase) return NextResponse.json({ configured: false }, { status: 202 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { toUserId } = parsed.data;
  if (toUserId === user.id) return NextResponse.json({ error: 'bad_input' }, { status: 400 });

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: toUserId, status: 'pending' });

  if (!error) return NextResponse.json({ status: 'pending' }, { status: 201 });

  // 23505 = تصادم الفهرس الفريد على الزوج
  if (error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${toUserId},addressee_id.eq.${toUserId}`)
    .limit(50);

  const row = (existing ?? []).find(
    (r) =>
      (r.requester_id === user.id && r.addressee_id === toUserId) ||
      (r.requester_id === toUserId && r.addressee_id === user.id)
  );
  if (!row) return NextResponse.json({ error: 'conflict' }, { status: 409 });
  if (row.status === 'accepted') return NextResponse.json({ status: 'accepted' });

  // طلب معاكس معلّق: أنت المُرسَل إليه، فقبولك يجعلها صداقة فورية
  if (row.requester_id === toUserId && row.status === 'pending') {
    const { error: upErr } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', row.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ status: 'accepted' });
  }

  return NextResponse.json({ status: row.status });
}
