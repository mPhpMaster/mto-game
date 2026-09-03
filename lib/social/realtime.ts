'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { bumpUnread, reloadFriends, reloadInvites } from './store';

/**
 * قناة واحدة لكل مستخدم مُسجَّل تحمل كل الأحداث الاجتماعية.
 *
 * `postgres_changes` تحترم RLS للمستخدم المُصادَق، فالمرشِّح الخاطئ لا
 * يُسرِّب صفوف غيرك — المرشِّح هنا للكفاءة لا للأمان.
 *
 * **مصيدة**: يجب نداء `realtime.setAuth()` قبل الاشتراك ومع كل تجديد
 * للرمز، وإلا بقي السوكيت على رمز منتهٍ وصمتت الاشتراكات بعد ساعة بلا خطأ.
 */
export function openSocialChannel(userId: string, onDm?: (senderId: string) => void): () => void {
  const supabase = getBrowserSupabase();
  if (!supabase) return () => {};

  let channel: RealtimeChannel | null = null;
  let stopped = false;

  const start = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token ?? null);
    } catch {
      // بلا رمز صالح لن تصل الأحداث — الواجهة تبقى تعمل بالتحديث اليدوي
    }
    if (stopped) return;

    channel = supabase
      .channel(`mto-user-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        () => void reloadFriends()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` },
        () => void reloadFriends()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_user=eq.${userId}` },
        () => void reloadInvites()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const sender = (payload.new as { sender_id?: string } | null)?.sender_id;
          if (!sender) return;
          bumpUnread(sender);
          onDm?.(sender);
        }
      )
      .subscribe();
  };

  void start();

  // تجديد الرمز يعيد تخويل القنوات، وإلا صمتت بعد انتهاء صلاحيته
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
      void supabase.realtime.setAuth(session?.access_token ?? null);
    }
  });

  return () => {
    stopped = true;
    sub?.subscription?.unsubscribe();
    if (channel) void supabase.removeChannel(channel);
  };
}
