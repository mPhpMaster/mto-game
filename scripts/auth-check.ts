/**
 * يحرس العقد الذي لا يجوز كسره في المصادقة.
 *
 * البريد الصوريّ مشتقّ من `normalizeUsername`، فأي تغيير في التطبيع يقطع
 * دخول كل الحسابات القائمة. الجدول أدناه مثبَّت عمداً: إن فشل، فالسؤال ليس
 * «كيف أُصلح الاختبار» بل «هل أنا على وشك حبس المستخدمين خارج حساباتهم».
 *   npm run check:auth
 */
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  isValidUsername,
  normalizeUsername,
  passwordErrorKey,
  syntheticEmail,
  usernameErrorKey,
} from '../lib/auth/username';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

// ملفوف في دالة: تحويل tsx إلى cjs لا يدعم await في المستوى الأعلى
async function main() {
console.log('المصادقة باسم مستخدم:\n');

// ---------- التطبيع ثابت ومُتقارِب ----------
const NORMALIZE: [string, string][] = [
  ['Ahmad', 'ahmad'],
  ['  Ahmad  ', 'ahmad'],
  ['AHMAD', 'ahmad'],
  ['أحمد', 'احمد'],
  ['إحمد', 'احمد'],
  ['آحمد', 'احمد'],
  ['أَحْمَد', 'احمد'],
  ['احمـــد', 'احمد'],
  ['مصطفى', 'مصطفي'],
  ['فاطمة', 'فاطمه'],
  ['ابو علي', 'ابو_علي'],
  ['abu  ali', 'abu_ali'],
  ['player_1', 'player_1'],
  ['لاعب.2', 'لاعب.2'],
  ['مُواجَهة', 'مواجهه'],
];

for (const [input, expected] of NORMALIZE) {
  const got = normalizeUsername(input);
  if (got === expected) ok(`«${input}» ← «${got}»`);
  else bad(`«${input}» ← «${got}» والمتوقّع «${expected}»`);
}

// ---------- التطبيع مُتساوي القوى: تطبيع المُطبَّع لا يغيّره ----------
{
  let drifted = 0;
  for (const [input] of NORMALIZE) {
    const once = normalizeUsername(input);
    if (normalizeUsername(once) !== once) drifted++;
  }
  if (drifted === 0) ok('التطبيع مُتساوي القوى (تطبيق مرّتين = مرّة)');
  else bad(`${drifted} مدخلاً يتغيّر عند التطبيع مرّتين`);
}

// ---------- البريد الصوريّ ثابت ومتوافق مع التطبيع ----------
{
  const same = ['أحمد', 'احمد', 'اَحْمَد', 'آحمد'];
  const mails = await Promise.all(same.map(syntheticEmail));
  if (new Set(mails).size === 1) ok(`كل صور «أحمد» تعطي بريداً واحداً (${mails[0]})`);
  else bad(`صور «أحمد» أعطت ${new Set(mails).size} بريداً مختلفاً`);

  const a = await syntheticEmail('ahmad');
  const b = await syntheticEmail('ahmed');
  if (a !== b) ok('اسمان مختلفان يعطيان بريدين مختلفين');
  else bad('اسمان مختلفان أعطيا البريد نفسه');

  // القيمة مثبَّتة: تغيّرها يعني أن كل حساب قائم لن يستطيع الدخول
  const pinned = await syntheticEmail('mto_player');
  const EXPECTED = 'ua947fc27081cbd9f47102d7ce8b26cf7@users.mto-game.vercel.app';
  if (pinned === EXPECTED) ok('البريد المثبَّت لم يتغيّر');
  else
    bad(
      `تغيّر اشتقاق البريد!\n      المُنتَج: ${pinned}\n      المثبَّت: ${EXPECTED}\n` +
        '      إن كان التغيير مقصوداً فهو يقطع دخول كل الحسابات القائمة.'
    );

  if (!/@users\./.test(a) || a.includes(' ')) bad('صيغة البريد غير سليمة');
  else ok('صيغة البريد سليمة');
}

// ---------- التحقّق يرفض ما يجب ----------
const INVALID: [string, string][] = [
  ['', 'usernameRequired'],
  ['   ', 'usernameRequired'],
  ['ab', 'usernameTooShort'],
  ['ا', 'usernameTooShort'],
  ['x'.repeat(USERNAME_MAX + 1), 'usernameTooLong'],
  ['bad name!', 'usernameCharset'],
  ['a@b', 'usernameCharset'],
  ['<script>', 'usernameCharset'],
  ['اسم/مستخدم', 'usernameCharset'],
];
for (const [input, expected] of INVALID) {
  const got = usernameErrorKey(input);
  if (got === expected) ok(`«${input.slice(0, 24)}» مرفوض بـ${expected}`);
  else bad(`«${input.slice(0, 24)}» أعطى ${got} والمتوقّع ${expected}`);
}

// الفراغات بكل صورها تنهار إلى شرطة سفلية، فهي مقبولة لا مرفوضة
for (const good of ['ahmad', 'احمد', 'player_1', 'لاعب.2', 'abu ali', 'tab\tname']) {
  if (isValidUsername(good)) ok(`«${good}» مقبول`);
  else bad(`«${good}» رُفض بـ${usernameErrorKey(good)}`);
}

// ---------- كلمة المرور ----------
if (passwordErrorKey('x'.repeat(PASSWORD_MIN - 1)) === 'passwordTooShort')
  ok(`كلمة المرور أقصر من ${PASSWORD_MIN} مرفوضة`);
else bad('كلمة المرور القصيرة لم تُرفض');

if (passwordErrorKey('x'.repeat(PASSWORD_MIN)) === null) ok('كلمة المرور بالحدّ الأدنى مقبولة');
else bad('كلمة المرور بالحدّ الأدنى رُفضت');

if (passwordErrorKey('x'.repeat(200)) === 'passwordTooLong') ok('كلمة المرور الأطول من حدّ bcrypt مرفوضة');
else bad('كلمة المرور المفرطة الطول لم تُرفض');

// ---------- حدّ الطول متّسق مع قيد قاعدة البيانات ----------
if (USERNAME_MIN === 3 && USERNAME_MAX === 20) ok('الحدود توافق قيد profiles_username_len');
else bad(`الحدود ${USERNAME_MIN}-${USERNAME_MAX} لا توافق قيد قاعدة البيانات (3-20)`);

console.log(
  failures === 0
    ? '\n✓ التطبيع والبريد المشتقّ ثابتان، والتحقّق يرفض ما يجب.'
    : `\n✗ ${failures} مشكلة في المصادقة.`
);
process.exit(failures > 0 ? 1 : 0);
}

void main();
