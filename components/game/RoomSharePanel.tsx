'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { buildRoomShareUrl } from '@/lib/multiplayer/joinUrl';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function RoomSharePanel({
  code,
  roomPath,
  compact = false,
}: {
  code: string;
  /** In-app path e.g. /vs/ABC12 — used for OpenInApp handoff elsewhere */
  roomPath?: string;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const shareUrl = buildRoomShareUrl(code);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function shareLink() {
    const text = t('inviteShareText', { code, url: shareUrl });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('inviteShareTitle'), text, url: shareUrl });
        return;
      } catch {
        /* user cancelled or share failed */
      }
    }
    await copyLink();
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex justify-center rounded-xl bg-white p-3">
        <QRCode value={shareUrl} size={compact ? 128 : 160} level="M" />
      </div>
      <p className="text-center text-[11px] leading-relaxed opacity-55" dir="ltr">
        {shareUrl}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg bg-white/12 px-3 py-2 text-sm font-bold hover:bg-white/20"
        >
          {copied ? t('copied') : t('copyLink')}
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-black text-black hover:bg-emerald-400"
        >
          {t('shareRoom')}
        </button>
      </div>
      {roomPath ? <span className="sr-only">{roomPath}</span> : null}
    </div>
  );
}
