'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { parseRoomJoinUrl } from '@/lib/multiplayer/joinUrl';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (result: { code: string; name?: string }) => void;
};

export default function QrScannerModal({ open, onClose, onScan }: Props) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const finish = useCallback(
    (raw: string) => {
      const parsed = parseRoomJoinUrl(raw);
      if (!parsed) {
        setError(t('qrInvalid'));
        return;
      }
      onScan(parsed);
      onClose();
    },
    [onClose, onScan, t]
  );

  useEffect(() => {
    if (!open) return;

    setError(null);
    setManual('');
    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    async function start() {
      if (!videoRef.current) return;
      try {
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1200,
        });
        readerRef.current = reader;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (cancelled) return;
          if (result) finish(result.getText());
          if (err && !(err as { name?: string }).name?.includes('NotFound')) {
            /* ignore frame misses */
          }
        });
      } catch {
        if (!cancelled) setError(t('qrCameraUnavailable'));
      }
    }

    void start();

    return () => {
      cancelled = true;
      controls?.stop();
      readerRef.current = null;
    };
  }, [open, finish, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <div className="panel w-full max-w-md rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">{t('scanQr')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold"
          >
            {t('close')}
          </button>
        </div>

        <div className="relative mb-3 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-emerald-400/70" />
        </div>

        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

        <p className="mb-2 text-xs opacity-60">{t('qrPasteHint')}</p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => {
              setManual(e.target.value);
              setError(null);
            }}
            placeholder={t('qrPastePlaceholder')}
            dir="ltr"
            className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-emerald-400"
          />
          <button
            type="button"
            onClick={() => finish(manual)}
            className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-black"
          >
            {t('join')}
          </button>
        </div>
      </div>
    </div>
  );
}
