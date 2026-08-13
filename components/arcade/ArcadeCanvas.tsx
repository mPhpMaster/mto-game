'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { primeAudio } from '@/lib/audio/sfx';
import { ELEMENTS, ELEMENT_ICON, ELEMENT_NAME } from '@/lib/game/cards';
import type { PlayableElement } from '@/lib/game/types';
import { ArcadeEngine, type GameStats } from '@/lib/arcade/engine';
import { AR } from '@/lib/arcade/strings';
import { PALETTE } from '@/lib/arcade/theme';
import type { Upgrade } from '@/lib/arcade/upgrades';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageSwitch from '@/components/LanguageSwitch';
import SoundToggle from '@/components/SoundToggle';

type Screen = 'start' | 'playing' | 'gameover';

export default function ArcadeCanvas() {
  const { L } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [screen, setScreen] = useState<Screen>('start');
  const [element, setElement] = useState<PlayableElement>('fire');
  const [choices, setChoices] = useState<{ up: Upgrade; level: number }[] | null>(null);
  const [over, setOver] = useState<GameStats | null>(null);
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<{ key: string; id: number } | null>(null);

  const showBanner = useCallback((key: string) => {
    setBanner({ key, id: Date.now() + Math.random() });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 1900);
  }, []);

  // إنشاء المحرّك مرّة واحدة
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ArcadeEngine(canvas, {
      onLevelUp: (c) => setChoices(c.map((u) => ({ up: u, level: engine.levelOf(u.id) }))),
      onGameOver: (s) => { setOver(s); setScreen('gameover'); },
      onBanner: (key) => showBanner(key),
    });
    engineRef.current = engine;
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __arcadeEngine?: ArcadeEngine }).__arcadeEngine = engine;
    }
    const top = probeRef.current?.offsetHeight ?? 0;
    engine.setInsets(top + 12);
    engine.resize();
    primeAudio();
    return () => { engine.destroy(); engineRef.current = null; };
  }, [showBanner]);

  const start = useCallback(() => {
    setOver(null);
    setChoices(null);
    setPaused(false);
    setScreen('playing');
    engineRef.current?.start(element);
  }, [element]);

  const pick = useCallback((id: string) => {
    setChoices(null);
    engineRef.current?.chooseUpgrade(id);
  }, []);

  const togglePause = useCallback(() => {
    const e = engineRef.current;
    if (!e || !e.running) return;
    if (e.isPaused()) { e.resume(); setPaused(false); }
    else { e.pause(); setPaused(true); }
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-background select-none"
      style={{ touchAction: 'none' }}
    >
      {/* مقياس المنطقة الآمنة العلوية */}
      <div ref={probeRef} className="pointer-events-none absolute left-0 top-0 w-px" style={{ height: 'env(safe-area-inset-top)' }} />

      <canvas ref={canvasRef} className="block h-full w-full" style={{ touchAction: 'none' }} />

      {/* أزرار علوية أثناء اللعب */}
      {screen === 'playing' && !choices && !paused && (
        <div className="absolute end-3 z-10 flex gap-2" style={{ top: 'calc(env(safe-area-inset-top) + 58px)' }}>
          <button
            onClick={togglePause}
            className="rounded-xl bg-black/45 px-3 py-2 text-sm font-bold backdrop-blur"
            aria-label={L(AR.pause)}
          >⏸</button>
          <SoundToggle />
          <LanguageSwitch />
        </div>
      )}

      {/* لافتة حدث */}
      {banner && (
        <div
          key={banner.id}
          className="pop-in pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: '22%' }}
        >
          <div className="rounded-2xl bg-black/55 px-6 py-3 text-center text-xl font-black text-white shadow-lg backdrop-blur"
            style={{ textShadow: '0 0 20px rgba(120,180,255,0.7)' }}>
            {L(AR[banner.key] ?? AR.title)}
          </div>
        </div>
      )}

      {/* شاشة البداية */}
      {screen === 'start' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-black/70 px-5 py-8 text-center backdrop-blur">
          <div className="absolute end-4 top-4 flex gap-2">
            <SoundToggle />
            <LanguageSwitch />
          </div>
          <Link href="/" className="absolute start-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">
            {L(AR.back)}
          </Link>

          <div>
            <div className="text-5xl">🕹️🐉</div>
            <h1 className="mt-3 bg-gradient-to-l from-sky-300 to-fuchsia-400 bg-clip-text text-4xl font-black text-transparent">
              {L(AR.title)}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-80">{L(AR.tagline)}</p>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-1 text-sm font-black">{L(AR.chooseElement)}</div>
            <div className="mb-3 text-xs opacity-60">{L(AR.elementHint)}</div>
            <div className="grid grid-cols-3 gap-2">
              {ELEMENTS.map((el) => {
                const active = el === element;
                const pal = PALETTE[el];
                return (
                  <button
                    key={el}
                    onClick={() => setElement(el as PlayableElement)}
                    className="rounded-2xl border-2 p-3 transition"
                    style={{
                      borderColor: active ? pal.main : 'transparent',
                      background: active ? `${pal.main}22` : 'rgba(255,255,255,0.05)',
                      boxShadow: active ? `0 0 20px ${pal.main}66` : 'none',
                    }}
                  >
                    <div className="text-2xl">{ELEMENT_ICON[el]}</div>
                    <div className="mt-1 text-xs font-bold" style={{ color: pal.glow }}>
                      {L(ELEMENT_NAME[el])}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={start}
            className="glow-pulse rounded-full px-12 py-4 text-xl font-black text-black"
            style={{ background: `linear-gradient(90deg, ${PALETTE[element].main}, ${PALETTE[element].glow})` }}
          >
            {L(AR.start)}
          </button>

          <div className="space-y-1 text-xs opacity-70">
            <div>👆 {L(AR.howMove)}</div>
            <div>🎯 {L(AR.howShoot)}</div>
            <div>💎 {L(AR.howGems)}</div>
          </div>
        </div>
      )}

      {/* اختيار الترقية */}
      {choices && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 px-5 text-center backdrop-blur">
          <div className="text-3xl font-black text-amber-300" style={{ textShadow: '0 0 24px rgba(255,210,77,0.6)' }}>
            {L(AR.levelUp)}
          </div>
          <div className="text-sm opacity-75">{L(AR.levelUpHint)}</div>
          <div className="grid w-full max-w-md gap-3">
            {choices.map(({ up: u, level: lv }) => {
              const pal = PALETTE[u.element];
              return (
                <button
                  key={u.id}
                  onClick={() => pick(u.id)}
                  className="flex items-center gap-3 rounded-2xl border p-3 text-start transition hover:scale-[1.02]"
                  style={{ borderColor: `${pal.main}88`, background: `${pal.main}18` }}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                    style={{ background: `${pal.main}33` }}>{u.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black" style={{ color: pal.glow }}>{L(u.name)}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold opacity-80">
                        {lv >= u.max ? L(AR.maxed) : `${L(AR.lvPrefix)} ${lv + 1}`}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs opacity-75">{L(u.desc)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* إيقاف مؤقّت */}
      {paused && screen === 'playing' && !choices && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/70 text-center backdrop-blur">
          <div className="text-3xl font-black">{L(AR.paused)}</div>
          <button onClick={togglePause} className="rounded-full bg-emerald-400 px-10 py-3 text-lg font-black text-black">
            {L(AR.resume)}
          </button>
          <Link href="/" className="rounded-full bg-white/10 px-8 py-2.5 text-sm font-bold">
            {L(AR.quit)}
          </Link>
        </div>
      )}

      {/* نهاية اللعبة */}
      {screen === 'gameover' && over && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/78 px-6 text-center backdrop-blur">
          <div className="text-4xl font-black text-rose-300" style={{ textShadow: '0 0 24px rgba(255,120,150,0.6)' }}>
            {L(AR.gameOver)}
          </div>
          <div className="space-y-1">
            <div className="text-lg">{L(AR.survived)}: <b className="text-amber-300">{fmt(over.timeMs)}</b></div>
            <div className="text-sm opacity-80">{L(AR.reached)} <b>{over.level}</b> · ⚔ {over.kills}{over.ascensions > 0 ? ` · ⭐×${over.ascensions}` : ''}</div>
            <div className="text-sm opacity-70">{L(AR.best)}: {fmt(over.best)}</div>
          </div>
          {over.isBest && (
            <div className="rounded-full bg-amber-400/15 px-4 py-1.5 text-sm font-bold text-amber-300">{L(AR.newBest)}</div>
          )}
          <div className="mt-2 flex gap-3">
            <button
              onClick={start}
              className="rounded-full px-9 py-3 text-lg font-black text-black"
              style={{ background: `linear-gradient(90deg, ${PALETTE[element].main}, ${PALETTE[element].glow})` }}
            >
              {L(AR.retry)}
            </button>
            <Link href="/" className="rounded-full bg-white/10 px-7 py-3 text-sm font-bold">
              {L(AR.home)}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
