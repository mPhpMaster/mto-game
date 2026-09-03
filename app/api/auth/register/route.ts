import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  PASSWORD_MAX,
  USERNAME_MAX,
  normalizeUsername,
  passwordErrorKey,
  syntheticEmail,
  usernameErrorKey,
} from '@/lib/auth/username';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * zod يفحص الشكل فقط (نصّ موجود)، والطول والمحارف يفحصها المُتحقّقان أدناه.
 * لو فرضنا الحدود هنا لسبق رفضُ zod المُتحقّقَين وأعاد مفتاح خطأ عن حقل آخر:
 * كلمة مرور قصيرة كانت تُظهر «أدخل اسم مستخدم».
 */
const RegisterInput = z.object({
  username: z.string().max(USERNAME_MAX + 10),
  password: z.string().max(PASSWORD_MAX * 4),
  displayName: z.string().max(40).optional(),
});

/**
 * إنشاء الحساب — الموضع الوحيد الذي يحتاج مفتاح الخدمة.
 *
 * `email_confirm: true` يعني ألا نعتمد على مفتاح «تأكيد البريد» في لوحة
 * Supabase: البريد صوريّ ولا أحد يستطيع تأكيده أصلاً.
 *
 * تفرّد الاسم يفرضه فهرس فريد على profiles يبلغه مُشغّل auth.users داخل
 * المعاملة نفسها، فتصادمه يُرجع مستخدم المصادقة ولا يبقى صفّ يتيم.
 * الدخول يتمّ من المتصفّح بعد ذلك، فلا تُسلَّم كوكي جلسة من هنا.
 */
export async function POST(request: Request) {
  const parsed = RegisterInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errorKey: 'usernameRequired' }, { status: 400 });
  }

  const { username, password, displayName } = parsed.data;
  const bad = usernameErrorKey(username) ?? passwordErrorKey(password);
  if (bad) return NextResponse.json({ errorKey: bad }, { status: 400 });

  const supabase = getServiceSupabase();
  if (!supabase) {
    // نفس عقد /api/matches: اللعبة تعمل بلا قاعدة بيانات.
    // السبب يسمّي المتغيّر الناقص بالضبط: الرسالة العامة «غير مهيّأة» تظهر في
    // الواجهة، أما من يفتح أدوات المطوّر فيحتاج أن يعرف ما الذي يضبطه.
    const hasUrl = Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
    return NextResponse.json(
      {
        ok: false,
        reason: hasUrl ? 'missing_service_role_key' : 'supabase_not_configured',
        missing: hasUrl
          ? ['SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)']
          : ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)'],
        hint: 'Set it on Vercel, then redeploy - env changes do not apply to an existing deployment.',
      },
      { status: 202 }
    );
  }

  const norm = normalizeUsername(username);
  const display = (displayName ?? '').trim().slice(0, 20);

  const { error } = await supabase.auth.admin.createUser({
    email: await syntheticEmail(norm),
    password,
    email_confirm: true,
    user_metadata: {
      username: norm,
      display_name: display.length >= 2 ? display : norm,
    },
  });

  if (error) {
    const msg = `${error.message} ${(error as { code?: string }).code ?? ''}`.toLowerCase();
    // البريد المشتقّ يصطدم أوّلاً، والفهرس الفريد ثانياً — كلاهما «الاسم مأخوذ»
    const taken =
      msg.includes('already') ||
      msg.includes('exists') ||
      msg.includes('duplicate') ||
      msg.includes('23505') ||
      msg.includes('database error creating new user');
    return NextResponse.json(
      { errorKey: taken ? 'usernameTaken' : 'authFailed' },
      { status: taken ? 409 : 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
