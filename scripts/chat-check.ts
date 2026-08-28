/**
 * يتحقق من تنظيف الرسائل وكتم النص بلا تشغيل متصفّح.
 *   npx tsx scripts/chat-check.ts
 */
import { CHAT_MAX_LEN, filterMutedText, sanitizeChatText } from '../lib/chat/text';
import { isMobileChatSurface, isNativeApp } from '../lib/chat/platform';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error(`✗ ${m}`);
};
const ok = (m: string) => console.log(`  ✓ ${m}`);

const cleaned = sanitizeChatText('  hello\n\tworld  ');
if (cleaned !== 'hello world') fail(`المسافات: حصلنا على «${cleaned}»`);
else ok('طيّ المسافات');

if (sanitizeChatText('   ') !== null) fail('النص الفارغ يجب أن يُرفض');
else ok('رفض الفارغ');

if (sanitizeChatText('<hi>') !== '<hi>') fail('لا نفكّ HTML — نعرضه نصاً');
else ok('النص يبقى نصاً');

const long = 'x'.repeat(CHAT_MAX_LEN + 40);
const cut = sanitizeChatText(long);
if (!cut || cut.length !== CHAT_MAX_LEN) fail(`القصّ: الطول ${cut?.length}`);
else ok(`الحد ${CHAT_MAX_LEN} حرفاً`);

if (sanitizeChatText('a\u0000b') !== 'ab') fail('محارف التحكّم لم تُحذف');
else ok('حذف محارف التحكّم');

const msgs = [
  { peerId: 'me', text: 'a' },
  { peerId: 'foe', text: 'b' },
  { peerId: 'ally', text: 'c' },
];
const shown = filterMutedText(msgs, new Set(['foe']), 'me');
if (shown.map((m) => m.peerId).join(',') !== 'me,ally') fail(`الكتم: ${shown.map((m) => m.peerId)}`);
else ok('كتم نص الخصم يُخفي رسائله ويبقي رسائلك');

const keepOwn = filterMutedText(msgs, new Set(['me']), 'me');
if (keepOwn.length !== 3) fail('كتم نفسك لا يجب أن يخفي رسائلك في السجل');
else ok('رسائلك تظهر حتى لو الكتم يشمل معرّفك بالخطأ');

if (isNativeApp()) fail('isNativeApp يجب أن يكون false خارج المتصفّح');
else ok('كشف التطبيق الأصلي آمن على الخادم');

if (isMobileChatSurface()) fail('isMobileChatSurface يجب أن يكون false خارج المتصفّح');
else ok('كشف واجهة الجوال آمن على الخادم');

console.log(failures === 0 ? '✓ دردشة الغرفة: التنظيف والكتم.' : `✗ ${failures} مشكلة في الدردشة.`);
process.exit(failures > 0 ? 1 : 0);
