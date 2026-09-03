/**
 * يحرس سلسلة حلّ متغيّرات البيئة في lib/supabase/server.ts.
 *
 * الحارس الذي يهمّ هو الأخير: `getServiceSupabase` **لا يرتدّ** إلى المفتاح
 * المجهول. لو ارتدّ لبدا التسجيل مُعَدّاً وهو ليس كذلك، ثم فشل
 * `auth.admin.createUser` بخطأ صلاحيات غامض بدل الـ202 الذي يسمّي الناقص.
 *
 * لا يحتاج شبكة: getSupabase يبني عميلاً بلا اتّصال، ووجودُه من عدمه هو كل
 * ما نقيسه.
 *   npm run check:config
 */
const KEYS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const;

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

const URL_A = 'https://a.supabase.co';
const URL_B = 'https://b.supabase.co';

function withEnv<T>(env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => T): T {
  const saved = KEYS.map((k) => [k, process.env[k]] as const);
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  try {
    return fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function main() {
  console.log('إعداد Supabase:\n');
  // الاستيراد بعد تعريف withEnv فقط؛ الوحدة تقرأ process.env عند النداء لا الاستيراد
  const { getSupabase, getServiceSupabase } = await import('../lib/supabase/server');

  // ---------- بلا إعداد: كلاهما null، واللعبة تعمل بلا قاعدة ----------
  withEnv({}, () => {
    if (getSupabase() === null && getServiceSupabase() === null)
      ok('بلا متغيّرات: كلاهما null ولا يرمي — اللعبة تقلع بلا Supabase');
    else bad('بلا متغيّرات: توقّعنا null من كليهما');
  });

  // ---------- العنوان: SUPABASE_URL يسبق NEXT_PUBLIC ----------
  withEnv({ SUPABASE_URL: URL_A, NEXT_PUBLIC_SUPABASE_URL: URL_B, SUPABASE_SERVICE_ROLE_KEY: 'k' }, () => {
    if (getServiceSupabase()) ok('SUPABASE_URL وحده يكفي العميل الخدميّ');
    else bad('SUPABASE_URL لم يُقبل');
  });
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_B, SUPABASE_SERVICE_ROLE_KEY: 'k' }, () => {
    if (getServiceSupabase()) ok('NEXT_PUBLIC_SUPABASE_URL يُقبل حين يغيب الأوّل');
    else bad('الارتداد إلى NEXT_PUBLIC_SUPABASE_URL لا يعمل');
  });

  // ---------- المفتاح العام: أربعة أسماء مقبولة ----------
  for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const) {
    withEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_A, [k]: 'k' }, () => {
      if (getSupabase()) ok(`getSupabase يقبل ${k}`);
      else bad(`getSupabase رفض ${k}`);
    });
  }

  // ---------- الحارس الأهمّ: لا ارتداد إلى المفتاح المجهول ----------
  for (const k of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const) {
    withEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_A, [k]: 'k' }, () => {
      if (getServiceSupabase() === null) ok(`getServiceSupabase لا يرتدّ إلى ${k}`);
      else bad(`getServiceSupabase قبل ${k} — التسجيل سيبدو مُعَدّاً وهو ليس كذلك`);
    });
  }

  // ---------- عنوان بلا مفتاح، ومفتاح بلا عنوان ----------
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_A }, () => {
    if (getSupabase() === null && getServiceSupabase() === null) ok('عنوان بلا مفتاح: null');
    else bad('عنوان بلا مفتاح أعطى عميلاً');
  });
  withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k' }, () => {
    if (getServiceSupabase() === null) ok('مفتاح بلا عنوان: null');
    else bad('مفتاح بلا عنوان أعطى عميلاً');
  });

  console.log(
    failures === 0
      ? '\n✓ سلسلة الحلّ سليمة، ومفتاح الخدمة بلا ارتداد إلى المفتاح المجهول.'
      : `\n✗ ${failures} مشكلة في حلّ الإعداد.`
  );
  process.exit(failures > 0 ? 1 : 0);
}

void main();
