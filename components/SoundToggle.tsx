'use client';

import { useSyncExternalStore } from 'react';
import { isSoundOn, playSfx, setSoundOn, subscribeSound } from '@/lib/audio/sfx';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function SoundToggle() {
  const { t } = useLocale();
  const on = useSyncExternalStore(
    subscribeSound,
    isSoundOn,
    () => true // الخادم يفترض التشغيل، ويصحّحه العميل بلا تعارض ترطيب
  );

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setSoundOn(next);
        // تأكيد مسموع بأن الصوت اشتغل — يفتح سياق الصوت أيضاً
        if (next) playSfx('play');
      }}
      aria-pressed={on}
      title={on ? t('soundOn') : t('soundOff')}
      aria-label={on ? t('soundOn') : t('soundOff')}
      className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}
