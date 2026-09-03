/**
 * ترتيب معرّفَي مستخدمَين كما ترتّبهما قاعدة البيانات.
 *
 * الأعمدة المولَّدة `friendships.user_lo/user_hi` و`direct_messages.pair_lo/pair_hi`
 * تُحسب بـ`least/greatest` على نوع `uuid`، وPostgres يخزّن الـuuid بحروف صغيرة.
 * فمقارنةٌ نصّية على قيمة قادمة من العميل بحروف كبيرة تعطي ترتيباً معاكساً
 * فلا يطابق أي صفّ — والنتيجة محادثةٌ فارغة بلا خطأ يشي بالسبب.
 */
export function sortedPair(a: string, b: string): [string, string] {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? [x, y] : [y, x];
}
