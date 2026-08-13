'use client';

/**
 * مؤثّرات صوتية مُولَّدة بـWeb Audio — بلا ملفّات صوت.
 *
 * لماذا التوليد: صفر بايت في الحزمة، لا مشاكل تراخيص، ولا انتظار تحميل
 * قبل أول صوت — وهذا مهمّ في تطبيق يعمل دون إنترنت.
 *
 * المتصفّحات تمنع تشغيل الصوت قبل تفاعل المستخدم، لذا يُستأنف السياق
 * عند أول لمسة أو ضغطة.
 */

export type SfxName =
  | 'draw'
  | 'play'
  | 'summon'
  | 'attack'
  | 'combo'
  | 'hit'
  | 'death'
  | 'trap'
  | 'fragment'
  | 'titan'
  | 'turn'
  | 'win'
  | 'lose'
  | 'error';

const STORAGE_KEY = 'mto-sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled: boolean | null = null;
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  if (enabled !== null) return enabled;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    enabled = true;
  }
  return enabled;
}

export function isSoundOn(): boolean {
  return typeof window === 'undefined' ? true : readEnabled();
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // التخزين قد يكون معطّلاً — الإعداد يبقى فعّالاً لهذه الجلسة
  }
  if (on) void ensureContext();
  for (const l of listeners) l();
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function ensureContext(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.34;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** يفتح السياق عند أول تفاعل — تطلبه المتصفّحات قبل السماح بالصوت */
export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  const open = () => void ensureContext();
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(ev, open, { once: true, passive: true });
  }
}

interface Tone {
  /** تردّد البداية بالهرتز */
  freq: number;
  /** تردّد النهاية — الانزلاق يعطي الإحساس بالحركة */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** تأخير عن بداية المؤثّر */
  at?: number;
}

interface Sfx {
  tones: Tone[];
  /** ضجيج قصير: للضربات والانفجارات */
  noise?: { dur: number; gain: number; at?: number; hp?: number };
}

const LIBRARY: Record<SfxName, Sfx> = {
  // سحب كارت: حفيف قصير صاعد
  draw: { tones: [{ freq: 520, to: 880, dur: 0.1, type: 'triangle', gain: 0.5 }] },
  // لعب كارت: نقرة دافئة
  play: { tones: [{ freq: 380, to: 300, dur: 0.11, type: 'sine', gain: 0.7 }] },
  // استدعاء وحش: نغمتان صاعدتان
  summon: {
    tones: [
      { freq: 240, to: 360, dur: 0.14, type: 'sawtooth', gain: 0.45 },
      { freq: 480, to: 620, dur: 0.16, type: 'triangle', gain: 0.4, at: 0.07 },
    ],
  },
  // هجوم: هبوط حادّ مع ضجيج
  attack: {
    tones: [{ freq: 700, to: 180, dur: 0.16, type: 'sawtooth', gain: 0.5 }],
    noise: { dur: 0.12, gain: 0.35, hp: 900 },
  },
  // هجوم مشترك: ثلاث ضربات متتابعة
  combo: {
    tones: [
      { freq: 420, to: 220, dur: 0.12, type: 'square', gain: 0.4 },
      { freq: 560, to: 260, dur: 0.12, type: 'square', gain: 0.42, at: 0.08 },
      { freq: 760, to: 200, dur: 0.22, type: 'sawtooth', gain: 0.5, at: 0.17 },
    ],
    noise: { dur: 0.2, gain: 0.4, at: 0.17, hp: 700 },
  },
  hit: { tones: [{ freq: 200, to: 120, dur: 0.1, type: 'square', gain: 0.45 }], noise: { dur: 0.08, gain: 0.3 } },
  // سقوط وحش: هبوط طويل
  death: { tones: [{ freq: 300, to: 70, dur: 0.4, type: 'sawtooth', gain: 0.45 }] },
  // انطلاق فخ: رنّة حادّة مقلقة
  trap: {
    tones: [
      { freq: 900, to: 1200, dur: 0.09, type: 'square', gain: 0.3 },
      { freq: 1200, to: 500, dur: 0.18, type: 'square', gain: 0.32, at: 0.08 },
    ],
  },
  // قطعة وحش: رنين بلّوري
  fragment: {
    tones: [
      { freq: 880, dur: 0.16, type: 'sine', gain: 0.4 },
      { freq: 1320, dur: 0.22, type: 'sine', gain: 0.3, at: 0.06 },
    ],
  },
  // الوحش الأعظم: زئير عميق يتصاعد
  titan: {
    tones: [
      { freq: 60, to: 130, dur: 0.75, type: 'sawtooth', gain: 0.6 },
      { freq: 180, to: 300, dur: 0.6, type: 'square', gain: 0.32, at: 0.12 },
      { freq: 400, to: 900, dur: 0.5, type: 'triangle', gain: 0.28, at: 0.3 },
    ],
    noise: { dur: 0.7, gain: 0.3, hp: 200 },
  },
  /**
   * بداية دورك — أوضح مؤثّر في اللعبة عمداً:
   * ثلاث نغمات صاعدة مع رنين جرسي، أطول وأعلى من بقية الأصوات
   * حتى يُميَّز فوراً وأنت تنظر إلى شاشة أخرى.
   */
  turn: {
    tones: [
      { freq: 523, dur: 0.12, type: 'triangle', gain: 0.5 },
      { freq: 784, dur: 0.12, type: 'triangle', gain: 0.52, at: 0.1 },
      { freq: 1047, dur: 0.3, type: 'triangle', gain: 0.58, at: 0.2 },
      // طبقة جرسية تعطي رنيناً يميّزه عن نقرات الكروت
      { freq: 2093, dur: 0.42, type: 'sine', gain: 0.22, at: 0.2 },
      { freq: 1568, dur: 0.5, type: 'sine', gain: 0.16, at: 0.24 },
    ],
  },
  win: {
    tones: [
      { freq: 523, dur: 0.13, type: 'triangle', gain: 0.45 },
      { freq: 659, dur: 0.13, type: 'triangle', gain: 0.45, at: 0.12 },
      { freq: 784, dur: 0.13, type: 'triangle', gain: 0.45, at: 0.24 },
      { freq: 1047, dur: 0.36, type: 'triangle', gain: 0.5, at: 0.36 },
    ],
  },
  lose: {
    tones: [
      { freq: 400, dur: 0.16, type: 'sine', gain: 0.4 },
      { freq: 330, dur: 0.18, type: 'sine', gain: 0.4, at: 0.15 },
      { freq: 220, to: 140, dur: 0.5, type: 'sine', gain: 0.45, at: 0.32 },
    ],
  },
  // حركة مرفوضة
  error: { tones: [{ freq: 180, to: 140, dur: 0.13, type: 'square', gain: 0.3 }] },
};

function playTone(audio: AudioContext, out: GainNode, tone: Tone, start: number) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const t0 = start + (tone.at ?? 0);
  const peak = tone.gain ?? 0.4;

  osc.type = tone.type ?? 'sine';
  osc.frequency.setValueAtTime(tone.freq, t0);
  if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to), t0 + tone.dur);

  // مغلّف سريع الصعود بطيء الهبوط — يمنع الطقطقة عند البداية والنهاية
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);

  osc.connect(gain).connect(out);
  osc.start(t0);
  osc.stop(t0 + tone.dur + 0.03);
}

function playNoise(audio: AudioContext, out: GainNode, spec: NonNullable<Sfx['noise']>, start: number) {
  const frames = Math.max(1, Math.floor(audio.sampleRate * spec.dur));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const src = audio.createBufferSource();
  src.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = spec.hp ?? 400;

  const gain = audio.createGain();
  const t0 = start + (spec.at ?? 0);
  gain.gain.setValueAtTime(spec.gain, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);

  src.connect(filter).connect(gain).connect(out);
  src.start(t0);
  src.stop(t0 + spec.dur + 0.02);
}

/** يشغّل مؤثّراً. لا يرمي أبداً: الصوت زينة ولا يجوز أن يُعطّل اللعب. */
export function playSfx(name: SfxName): void {
  if (typeof window === 'undefined' || !readEnabled()) return;
  void (async () => {
    try {
      const audio = await ensureContext();
      if (!audio || !master) return;
      const spec = LIBRARY[name];
      const now = audio.currentTime + 0.005;
      for (const tone of spec.tones) playTone(audio, master, tone, now);
      if (spec.noise) playNoise(audio, master, spec.noise, now);
    } catch {
      // جهاز بلا صوت أو سياق مرفوض — تُتجاهل بصمت
    }
  })();
}
