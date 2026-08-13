'use client';

import Link from 'next/link';
import { GUIDE } from '@/lib/i18n/guide';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from './LanguageSwitch';

/** يحوّل **نص** إلى خطّ عريض دون إدخال HTML خام */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <b key={i} className="text-white">
            {part.slice(2, -2)}
          </b>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function GuideScreen() {
  const { t, L } = useLocale();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('guideTitle')}</h1>
          <p className="mt-1 text-xs opacity-60">{t('guideSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link href="/" className="panel rounded-lg px-4 py-2 text-sm font-bold">
            {t('menu')}
          </Link>
        </div>
      </div>

      {/* فهرس سريع */}
      <nav className="panel mb-5 flex flex-wrap gap-2 rounded-xl p-3 text-xs">
        {GUIDE.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-lg bg-white/8 px-3 py-1.5 font-bold hover:bg-white/18"
          >
            {s.icon} {L(s.title)}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        {GUIDE.map((s) => (
          <section key={s.id} id={s.id} className="panel scroll-mt-4 rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
              <span className="text-2xl">{s.icon}</span>
              {L(s.title)}
            </h2>

            {s.body.map((p, i) => (
              <p key={i} className="mb-3 text-[13.5px] leading-relaxed opacity-80">
                <Rich text={L(p)} />
              </p>
            ))}

            {s.points && (
              <ul className="mb-3 space-y-1.5">
                {s.points.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg bg-white/5 p-2 text-[12.5px] leading-relaxed opacity-85"
                  >
                    <span className="text-emerald-300">▸</span>
                    <span>
                      <Rich text={L(p)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {s.secret && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
                <div className="mb-1 text-xs font-black text-amber-200">🔑 {t('secretLabel')}</div>
                <p className="text-[13px] leading-relaxed text-amber-50/90">
                  <Rich text={L(s.secret)} />
                </p>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/tutorial"
          className="rounded-xl bg-amber-400 px-6 py-3 font-black text-black hover:bg-amber-300"
        >
          {t('learnFirst')}
        </Link>
        <Link
          href="/play"
          className="rounded-xl bg-emerald-500 px-6 py-3 font-black text-black hover:bg-emerald-400"
        >
          {t('startMatch')}
        </Link>
      </div>
    </div>
  );
}
