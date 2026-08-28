'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { isMobileChatSurface, isNativeApp } from '@/lib/chat/platform';
import { openMicrophoneSettings } from '@/lib/chat/micPermission';
import { useMatchChat } from '@/lib/chat/useMatchChat';

export default function MatchChatDock({
  code,
  myName,
  mySeat,
  defaultOpen = false,
}: {
  code: string;
  myName: string;
  mySeat?: number;
  defaultOpen?: boolean;
}) {
  const { t, locale } = useLocale();
  const chat = useMatchChat({ code, myName, mySeat });
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState('');
  const [seenCount, setSeenCount] = useState(0);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const inputId = useId();

  const unread = open ? 0 : Math.max(0, chat.visibleMessages.length - seenCount);

  useEffect(() => {
    if (!open) return;
    setSeenCount(chat.visibleMessages.length);
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, chat.visibleMessages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (chat.sendText(draft)) setDraft('');
  }

  const micBusy = chat.voiceStatus === 'requesting';
  const micOn = chat.voiceEnabled && !chat.micMuted;
  const mobile = isMobileChatSurface();
  const micDeniedHint = isNativeApp() ? t('chatMicDeniedNative') : t('chatMicDenied');
  const timeFmt = (ts: number) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(ts);

  return (
    <div
      className="pointer-events-none fixed end-3 z-[45] flex flex-col items-end gap-2"
      style={{ bottom: mobile ? 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' : '0.75rem' }}
    >
      {open && (
        <section
          className={`pointer-events-auto panel flex flex-col overflow-hidden rounded-2xl shadow-2xl motion-safe:pop-in ${
            mobile
              ? 'max-h-[min(72dvh,34rem)] w-[min(calc(100vw-1.5rem),24rem)]'
              : 'max-h-[min(70vh,32rem)] w-[min(calc(100vw-1.5rem),22rem)]'
          }`}
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="false"
        >
          <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <h2 id={titleId} className="text-sm font-black">
              {t('chatTitle')}
            </h2>
            <span
              className={`ms-auto size-2 rounded-full ${chat.connected ? 'bg-emerald-400' : 'bg-amber-400 motion-safe:animate-pulse'}`}
              title={chat.connected ? t('chatConnected') : t('chatConnecting')}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20"
              aria-label={t('chatClose')}
            >
              {t('close')}
            </button>
          </header>

          <div className="border-b border-white/10 px-2 py-2">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide opacity-60">
              {t('chatRoster')}
            </div>
            <ul className="flex max-h-28 flex-col gap-1 overflow-y-auto thin-scroll">
              <li className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs">
                <span className="min-w-0 flex-1 truncate font-bold">
                  {t('you')} · {myName}
                </span>
                <IconBtn
                  compact={mobile}
                  pressed={micOn}
                  disabled={micBusy || chat.voiceStatus === 'unsupported'}
                  onClick={chat.toggleMic}
                  label={
                    micOn ? t('chatMicOn') : t('chatMicOff')
                  }
                  title={
                    chat.voiceStatus === 'denied'
                      ? micDeniedHint
                      : chat.voiceStatus === 'unsupported'
                        ? t('chatVoiceUnsupported')
                        : micOn
                          ? t('chatMicOn')
                          : t('chatMicOff')
                  }
                >
                  <span className={micOn ? '' : 'opacity-40 line-through'}>🎤</span>
                </IconBtn>
                <IconBtn
                  compact={mobile}
                  pressed={chat.deafened}
                  onClick={chat.toggleDeafen}
                  label={chat.deafened ? t('chatDeafenOn') : t('chatDeafenOff')}
                >
                  {chat.deafened ? '🔇' : '🔈'}
                </IconBtn>
                {chat.voiceEnabled && (
                  <IconBtn compact={mobile} onClick={chat.leaveVoice} label={t('chatLeaveVoice')}>
                    ✕
                  </IconBtn>
                )}
              </li>
              {chat.peers.length === 0 && (
                <li className="px-2 py-1 text-[11px] opacity-50">{t('chatWaitingPeers')}</li>
              )}
              {chat.peers.map((p) => {
                const muted = chat.isPeerMuted(p.peerId);
                return (
                  <li
                    key={p.peerId}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                    {p.voice && (
                      <span className="text-[10px] opacity-60" title={p.micMuted ? t('chatMicOff') : t('chatVoiceOn')}>
                        <span className={p.micMuted ? 'opacity-40 line-through' : ''}>🎤</span>
                      </span>
                    )}
                    <IconBtn
                      compact={mobile}
                      pressed={muted}
                      onClick={() => chat.toggleMutePeer(p.peerId)}
                      label={muted ? t('chatUnmutePeer', { name: p.name }) : t('chatMutePeer', { name: p.name })}
                    >
                      {muted ? '🔇' : '🔈'}
                    </IconBtn>
                  </li>
                );
              })}
            </ul>
            {!chat.voiceEnabled && chat.voiceStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={() => void chat.joinVoice()}
                disabled={micBusy}
                className="mt-2 w-full rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-bold hover:bg-white/18 disabled:opacity-50"
              >
                {micBusy ? t('chatConnecting') : t('chatJoinVoice')}
              </button>
            )}
            {chat.voiceStatus === 'denied' && (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-amber-200">{micDeniedHint}</p>
                {isNativeApp() && (
                  <button
                    type="button"
                    onClick={() => void openMicrophoneSettings()}
                    className="w-full rounded-lg bg-amber-500/20 px-2 py-1.5 text-[11px] font-bold text-amber-100 hover:bg-amber-500/30"
                  >
                    {t('chatOpenMicSettings')}
                  </button>
                )}
              </div>
            )}
            {chat.voiceStatus === 'error' && (
              <p className="mt-1 text-[11px] text-amber-200">{t('chatMicError')}</p>
            )}
            {chat.voiceStatus === 'unsupported' && (
              <p className="mt-1 text-[11px] text-amber-200">{t('chatVoiceUnsupported')}</p>
            )}
            {chat.iceFailed && (
              <p className="mt-1 text-[11px] text-amber-200">{t('chatIceFailed')}</p>
            )}
          </div>

          <div
            ref={logRef}
            className="thin-scroll min-h-[8rem] flex-1 space-y-1 overflow-y-auto px-2 py-2"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {chat.visibleMessages.length === 0 && (
              <p className="px-1 py-6 text-center text-[11px] opacity-50">{t('chatEmpty')}</p>
            )}
            {chat.visibleMessages.map((m) => {
              const mine = m.peerId === chat.myPeerId;
              return (
                <div
                  key={m.id}
                  className={`rounded-lg px-2 py-1 text-xs ${
                    mine ? 'bg-emerald-500/15' : 'bg-white/8'
                  }`}
                >
                  <div className="flex items-baseline gap-2 text-[10px] opacity-60">
                    <span className="font-bold">{mine ? t('you') : m.name}</span>
                    <time dateTime={new Date(m.ts).toISOString()}>{timeFmt(m.ts)}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                </div>
              );
            })}
          </div>

          <form onSubmit={submit} className="flex gap-1 border-t border-white/10 p-2">
            <label htmlFor={inputId} className="sr-only">
              {t('chatPlaceholder')}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, chat.maxLen))}
              maxLength={chat.maxLen}
              placeholder={t('chatPlaceholder')}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg bg-black/40 px-2 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-emerald-400/60"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-black disabled:opacity-40"
            >
              {t('chatSend')}
            </button>
          </form>
          {draft.length > chat.maxLen - 40 && (
            <p className="px-2 pb-2 text-end text-[10px] opacity-50">
              {draft.length}/{chat.maxLen}
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto relative flex items-center justify-center rounded-full bg-emerald-500 font-black text-black shadow-lg hover:bg-emerald-400 ${
          mobile ? 'size-14 text-2xl' : 'size-12 text-xl'
        }`}
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        aria-label={open ? t('chatClose') : unread ? t('chatUnread', { n: unread }) : t('chatOpen')}
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -start-1 grid min-w-[1.25rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  title,
  pressed,
  disabled,
  compact = false,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      className={`grid shrink-0 place-items-center rounded-md text-sm hover:bg-white/15 disabled:opacity-40 ${
        compact ? 'size-9' : 'size-7'
      } ${pressed ? 'bg-white/20' : 'bg-white/8'}`}
    >
      {children}
    </button>
  );
}
