/**
 * يتأكّد أن كل رسالة تُعرض فعلاً في اللغتين دون انهيار ودون معاملات ناقصة.
 *
 * أُضيف بعد عطل حقيقي: رسالة الفوز تحمل معامل `reason` يشير إلى رسالة أخرى،
 * وكان يُمرَّر إلى النداء الداخلي كما هو فيرى `reason` من جديد ويستدعي نفسه
 * بلا نهاية — ينفد المكدّس فتنهار صفحة اللعبة عند انتهاء كل مباراة.
 *   npm run check:messages
 */
import { aiChooseAction } from '../lib/game/ai';
import { applyGameAction, createGame } from '../lib/game/engine';
import { LOCALES } from '../lib/i18n/locale';
import { LOG_MESSAGES, renderMessage } from '../lib/i18n/messages';
import { REASONS, UI } from '../lib/i18n/ui';
import type { GameState, LogEntry } from '../lib/game/types';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};

// 1) كل قاموس مكتمل في اللغتين
for (const [name, dict] of Object.entries({ UI, LOG_MESSAGES, REASONS })) {
  for (const [key, value] of Object.entries(dict as Record<string, { ar: string; en: string }>)) {
    for (const l of LOCALES) {
      const text = value[l];
      if (!text || !text.trim()) fail(`${name}.${key}: نصّ ${l} فارغ.`);
    }
  }
}

// 2) رسالة الفوز — الحالة التي انهارت سابقاً
for (const l of LOCALES) {
  for (const reasonKey of ['reason_hp', 'reason_titan', 'reason_empty_hand']) {
    let out: string;
    try {
      out = renderMessage('win', { winner: 'A', loser: 'B', titan: 'titan', reason: reasonKey }, l);
    } catch (e) {
      fail(`رسالة الفوز (${reasonKey}/${l}) رمت: ${(e as Error).message}`);
      continue;
    }
    if (out.includes('{')) fail(`رسالة الفوز (${reasonKey}/${l}) بقي فيها معامل غير محلول: ${out}`);
    if (out.includes(reasonKey)) fail(`رسالة الفوز (${reasonKey}/${l}) لم تُترجم السبب: ${out}`);
  }
}

// 3) مباريات كاملة: كل سطر سجل يُعرض في اللغتين بلا معامل ناقص
const seenKeys = new Set<string>();
for (let g = 0; g < 40; g++) {
  let s: GameState = createGame({ seed: 4000 + g, opponentIsAI: true, difficulty: 'hard' });
  s.players[0].isAI = true;

  let steps = 0;
  let guardTurn = -1;
  let guardCount = 0;
  while (s.phase !== 'ended' && steps < 600) {
    if (s.turn !== guardTurn) { guardTurn = s.turn; guardCount = 0; }
    guardCount++;
    const action = guardCount > 40 ? ({ type: 'END_TURN' } as const) : aiChooseAction(s);
    const before = s;
    s = applyGameAction(s, action);
    steps++;
    if (s.turn === before.turn && s.log.length === before.log.length && action.type !== 'END_TURN') {
      s = applyGameAction(s, { type: 'END_TURN' });
      steps++;
    }
  }

  const check = (entry: LogEntry) => {
    seenKeys.add(entry.key);
    for (const l of LOCALES) {
      let text: string;
      try {
        text = renderMessage(entry.key, entry.params, l);
      } catch (e) {
        fail(`«${entry.key}» (${l}) رمت: ${(e as Error).message}`);
        return;
      }
      if (!LOG_MESSAGES[entry.key]) fail(`مفتاح غير معرّف: «${entry.key}».`);
      if (text.includes('{')) fail(`«${entry.key}» (${l}) بقي فيها معامل: ${text}`);
    }
  };
  for (const entry of s.log) check(entry);
}

// 4) كل مفتاح معرّف يجب أن يظهر فعلاً (وإلا فهو ميت أو غير مختبَر)
const unused = Object.keys(LOG_MESSAGES).filter(
  (k) => !seenKeys.has(k) && !k.startsWith('reason_')
);
if (unused.length) console.log(`ℹ لم تظهر في العيّنة: ${unused.join('، ')}`);

console.log(
  failures === 0
    ? `✓ كل الرسائل تُعرض في اللغتين (${seenKeys.size} مفتاحاً ظهر فعلاً).`
    : `✗ ${failures} مشكلة في الرسائل.`
);
process.exit(failures > 0 ? 1 : 0);
