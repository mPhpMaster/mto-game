/**
 * يتحقّق من منطق الطبقة الاجتماعية الذي **لا يحتاج قاعدة بيانات**:
 * اشتقاق معرّف المباراة المشترك، وتنقية الإحصاءات قبل إرسالها.
 *
 * ما لا يغطّيه هذا الفحص (يحتاج مشروع Supabase حيّاً): سياسات RLS،
 * ومُشغّل إنشاء الملف الشخصي، ودالة record_match نفسها.
 *   npm run check:social
 */
import { CARD_BY_ID } from '../lib/game/cards';
import { deriveMatchId, sanitizeCards } from '../lib/social/record';
import { normalizeUsername } from '../lib/auth/username';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

console.log('الطبقة الاجتماعية:\n');

// ---------- معرّف المباراة يجمع المقاعد ويفرّق المباريات ----------
{
  const a = deriveMatchId('ABC12', 999);
  const b = deriveMatchId('ABC12', 999);
  if (a === b) ok('نفس (الرمز، البذرة) يعطي المعرّف نفسه — فتلتقي مقاعد المباراة');
  else bad(`المعرّف غير حتمي: ${a} ≠ ${b}`);

  if (deriveMatchId('ABC12', 1000) !== a) ok('بذرة أخرى تعطي معرّفاً آخر — إعادة المباراة سجلّ جديد');
  else bad('إعادة المباراة في الغرفة نفسها ستُدمج مع السابقة');

  if (deriveMatchId('XYZ99', 999) !== a) ok('غرفة أخرى بالبذرة نفسها تعطي معرّفاً آخر');
  else bad('غرفتان مختلفتان تتشاركان معرّف مباراة');

  // القاعدة تشترط uuid صالحاً
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (UUID.test(a)) ok(`الصيغة uuid صالحة (${a})`);
  else bad(`ليست uuid: ${a}`);

  // لا تصادم على مدى واسع
  const seen = new Set<string>();
  for (let s = 0; s < 4000; s++) seen.add(deriveMatchId('ABC12', s));
  if (seen.size === 4000) ok('4000 بذرة أعطت 4000 معرّفاً بلا تصادم');
  else bad(`تصادم: ${4000 - seen.size} معرّفاً مكرّراً`);
}

// ---------- تنقية الإحصاءات: القاعدة لا تعرف الكروت، فهذا موضع الحراسة ----------
{
  const real = Object.keys(CARD_BY_ID).find((id) => CARD_BY_ID[id].kind === 'monster')!;
  const out = sanitizeCards({
    cards: {
      [real]: { element: 'wild', plays: 3 },
      not_a_card_at_all: { element: 'fire', plays: 99 },
      "'; drop table profiles; --": { element: 'dark', plays: 5 },
    },
    titans: 0,
    trapsSet: 0,
  });

  if (!out.not_a_card_at_all && !out["'; drop table profiles; --"])
    ok('المعرّفات غير الموجودة في الكتالوج تُسقَط');
  else bad(`تسرّب معرّف مجهول: ${JSON.stringify(Object.keys(out))}`);

  if (out[real]?.plays === 3) ok('الكارت الحقيقي يُحتسب');
  else bad(`الكارت الحقيقي لم يُحتسب: ${JSON.stringify(out)}`);

  // العنصر يُؤخَذ من الكتالوج لا من العميل، وإلا زوّر اللاعب إحصاء عناصره
  if (out[real]?.element === CARD_BY_ID[real].element)
    ok('العنصر يُؤخَذ من الكتالوج لا من حمولة العميل');
  else bad(`العنصر جاء من العميل: ${out[real]?.element}`);
}

{
  const real = Object.keys(CARD_BY_ID)[0];
  const zero = sanitizeCards({ cards: { [real]: { element: 'fire', plays: 0 } }, titans: 0, trapsSet: 0 });
  if (Object.keys(zero).length === 0) ok('الكروت بصفر لعبة لا تُرسَل');
  else bad('كارت بصفر لعبة أُرسل');

  const empty = sanitizeCards({ cards: {}, titans: 0, trapsSet: 0 });
  if (Object.keys(empty).length === 0) ok('الحمولة الفارغة لا ترمي');
  else bad('الحمولة الفارغة أنتجت شيئاً');
}

// ---------- تطبيع الاسم في البحث يطابق تطبيع التسجيل ----------
{
  // مسار البحث يطبّع قبل النداء، فمن كتب «أحمد» يجد من سجّل بـ«احمد»
  const pairs: [string, string][] = [
    ['أحمد', 'احمد'],
    ['مصطفى', 'مصطفي'],
    ['  AHMAD ', 'ahmad'],
    ['فاطمة', 'فاطمه'],
  ];
  let mismatched = 0;
  for (const [typed, registered] of pairs) {
    if (normalizeUsername(typed) !== normalizeUsername(registered)) mismatched++;
  }
  if (mismatched === 0) ok('البحث يجد الاسم مهما اختلفت صورته الإملائية');
  else bad(`${mismatched} صورة لا تصل إلى صاحبها في البحث`);
}

console.log(
  failures === 0
    ? '\n✓ معرّف المباراة حتميّ، والإحصاءات تُنقّى مقابل الكتالوج.'
    : `\n✗ ${failures} مشكلة في الطبقة الاجتماعية.`
);
process.exit(failures > 0 ? 1 : 0);
