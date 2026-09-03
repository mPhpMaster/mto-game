'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_MAX_LEN, isOwnMessage, sanitizeChatText } from '@/lib/chat/text';
import type { ChatMessage } from '@/lib/chat/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchConversation, markConversationRead, sendDirectMessage } from '@/lib/social/api';
import { clearUnread } from '@/lib/social/store';
import type { DirectMessageRow, PublicProfile } from '@/lib/social/types';

/**
 * محادثة مع صديق. تعيد استخدام `sanitizeChatText` و`isOwnMessage` وشكل
 * `ChatMessage` من دردشة المباراة، لكنها لوحة داخل الصفحة لا رصيفاً عائماً
 * — فلا تشترك معها في الهيكل البصري المثبَّت في الزاوية.
 *
 * بخلاف دردشة المباراة (بثّ فقط) هذه محفوظة، فيظهر التاريخ عند الفتح.
 */
function toChatMessage(row: DirectMessageRow, names: Map<string, string>): ChatMessage {
  return {
    id: row.id,
    peerId: row.sender_id,
    name: names.get(row.sender_id) ?? '',
    text: row.body,
    ts: Date.parse(row.created_at),
  };
}

export default function DirectChatPanel({
  me,
  peer,
  /** يرتفع مع كل رسالة واردة من هذا الصديق فتُعاد القراءة */
  incomingTick = 0,
}: {
  me: { id: string; displayName: string };
  peer: PublicProfile;
  incomingTick?: number;
}) {
  const { t, L } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const names = useCallback(
    () => new Map([[me.id, me.displayName], [peer.id, peer.displayName]]),
    [me.id, me.displayName, peer.id, peer.displayName]
  );

  // الجلب داخل المؤثّر مع حارس إلغاء: تبديل المحادثة بسرعة قد يُنهي طلباً
  // قديماً بعد الجديد، فيكتب رسائل صديق في نافذة صديق آخر.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchConversation(peer.id);
      if (cancelled) return;
      setMessages(rows.map((r) => toChatMessage(r, names())));
      await markConversationRead(peer.id);
      if (!cancelled) clearUnread(peer.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [peer.id, names, incomingTick]);

  // آخر رسالة هي المهمّة، فالتمرير يتبع الإضافات
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = sanitizeChatText(draft);
    if (!text || busy) return;
    setBusy(true);
    setDraft('');
    // صدى محلّي فوري: الشبكة لا يجب أن تُشعِر اللاعب بالبطء
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      peerId: me.id,
      name: me.displayName,
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const saved = await sendDirectMessage(peer.id, text);
    setBusy(false);
    if (saved) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? toChatMessage(saved, names()) : m)));
    } else {
      // فشل الإرسال: نزيل الصدى بدل ترك رسالة وهمية تبدو مُرسَلة
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    }
  }

  const timeFmt = (ts: number) =>
    new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="panel flex min-h-[22rem] flex-col rounded-2xl">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
          {peer.level}
        </span>
        <span className="font-black">{peer.displayName}</span>
        <span className="text-[11px] opacity-50">@{peer.username}</span>
      </header>

      <div
        ref={logRef}
        className="thin-scroll min-h-[12rem] flex-1 space-y-1 overflow-y-auto px-2 py-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <p className="px-1 py-8 text-center text-[11px] opacity-50">{t('dmEmpty')}</p>
        )}
        {messages.map((m) => {
          const mine = isOwnMessage(m, me.id);
          return (
            <div
              key={m.id}
              className={`rounded-lg px-2 py-1 text-xs ${mine ? 'bg-emerald-500/15' : 'bg-white/8'}`}
            >
              <div className="flex items-baseline gap-2 text-[10px] opacity-60">
                <span className="font-bold">{mine ? L({ ar: 'أنت', en: 'You' }) : m.name}</span>
                <time dateTime={new Date(m.ts).toISOString()}>{timeFmt(m.ts)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex gap-1 border-t border-white/10 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_LEN))}
          maxLength={CHAT_MAX_LEN}
          placeholder={t('dmPlaceholder')}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg bg-black/40 px-2 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-emerald-400/60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-black disabled:opacity-40"
        >
          {t('dmSend')}
        </button>
      </form>
    </section>
  );
}
