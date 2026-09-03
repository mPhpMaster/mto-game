/**
 * اسم المستخدم وكلمة المرور — بلا بريد إلكتروني.
 *
 * Supabase Auth يتطلّب بريداً، فنشتقّ بريداً صورياً معمّى من اسم المستخدم:
 * التعمية تعني أن الدخول لا يحتاج بحثاً مسبقاً في جدول (فلا ينشأ مسار
 * يُحصي المستخدمين)، وأن النطاق الداخلي لا يظهر للاعب أبداً.
 *
 * بلا `'use client'`: يعمل على الخادم وفي المتصفّح وتحت tsx في سكربتات الفحص.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // حدّ bcrypt في GoTrue

/** نطاق داخلي لا يستقبل بريداً ولا يُعرض في أي نصّ واجهة */
const EMAIL_DOMAIN = 'users.mto-game.vercel.app';

const TASHKEEL = /[ً-ْـ]/g; // حركات وتطويل
const ALEF = /[أإآ]/g; // أ إ آ
/** ما يُسمح به بعد التطبيع: عربي ولاتيني وأرقام وشرطة سفلية ونقطة */
const ALLOWED = /^[ء-يa-z0-9_.]+$/;

/**
 * التطبيع **نهائي ولا يجوز تغييره لاحقاً**: البريد المُركّب مشتقّ منه،
 * فأي تعديل يقطع دخول كل الحسابات القائمة. يحرسه scripts/auth-check.ts
 * بجدول مدخلات ثابت.
 */
export function normalizeUsername(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(TASHKEEL, '')
    .replace(ALEF, 'ا')
    .replace(/ى/g, 'ي') // ى ← ي
    .replace(/ة/g, 'ه') // ة ← ه
    .replace(/\s+/g, '_')
    .slice(0, USERNAME_MAX);
}

export type UsernameErrorKey =
  | 'usernameRequired'
  | 'usernameTooShort'
  | 'usernameTooLong'
  | 'usernameCharset';

/** مفتاح i18n للخطأ، أو null حين يكون الاسم صالحاً — نفس عقد playerNameErrorKey */
export function usernameErrorKey(raw: string): UsernameErrorKey | null {
  const n = normalizeUsername(raw);
  if (!n) return 'usernameRequired';
  if (n.length < USERNAME_MIN) return 'usernameTooShort';
  // الطول يُقصّ في التطبيع، فالمدخل الأطول من الحدّ يُرفض صراحةً لا يُبتر بصمت
  if (raw.trim().length > USERNAME_MAX) return 'usernameTooLong';
  if (!ALLOWED.test(n)) return 'usernameCharset';
  return null;
}

export function isValidUsername(raw: string): boolean {
  return usernameErrorKey(raw) === null;
}

export type PasswordErrorKey = 'passwordTooShort' | 'passwordTooLong';

export function passwordErrorKey(raw: string): PasswordErrorKey | null {
  if (raw.length < PASSWORD_MIN) return 'passwordTooShort';
  if (raw.length > PASSWORD_MAX) return 'passwordTooLong';
  return null;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * بريد صوريّ ثابت مشتقّ من اسم المستخدم. WebCrypto متاح في المتصفّح
 * وفي Node 20+ على السواء، فلا تتفرّع نسختان.
 */
export async function syntheticEmail(username: string): Promise<string> {
  const norm = normalizeUsername(username);
  const bytes = new TextEncoder().encode(`mto:v1:${norm}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `u${toHex(digest).slice(0, 32)}@${EMAIL_DOMAIN}`;
}
