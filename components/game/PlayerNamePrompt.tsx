'use client';

import { useState } from 'react';
import {
  PLAYER_NAME_MAX,
  playerNameErrorKey,
  writePlayerName,
} from '@/lib/player/name';
import { usePlayerName } from '@/lib/player/usePlayerName';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function PlayerNamePrompt({
  initialName = '',
  onConfirm,
}: {
  initialName?: string;
  onConfirm: (name: string) => void;
}) {
  const { t } = useLocale();
  const stored = usePlayerName();
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? (initialName || stored);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = playerNameErrorKey(name);
    if (key) {
      setError(t(key));
      return;
    }
    const saved = writePlayerName(name);
    onConfirm(saved);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="panel rounded-2xl p-6">
        <h1 className="mb-2 text-2xl font-black">{t('namePromptTitle')}</h1>
        <p className="mb-4 text-sm opacity-75">{t('namePromptBody')}</p>
        <form onSubmit={submit}>
          <label className="block">
            <span className="mb-1 block text-xs opacity-70">{t('yourName')}</span>
            <input
              value={name}
              maxLength={PLAYER_NAME_MAX}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              autoFocus
              placeholder={t('yourNamePlaceholder')}
              className="w-full rounded-lg bg-black/40 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-emerald-400"
            />
          </label>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-black hover:bg-emerald-400"
          >
            {t('continueOnline')}
          </button>
        </form>
      </div>
    </div>
  );
}
