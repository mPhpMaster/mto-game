'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import LanguageSwitch from '@/components/LanguageSwitch';
import { primeAuth, refreshAuth } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/useSession';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { MULTIPLAYER_READY } from '@/lib/supabase/client';
import type { Account } from '@/lib/social/types';

/**
 * بوّابة اللعب الجماعي. تُركَّب في `OnlineGame` و`RoomLobby` وصفحات `/vs`
 * **لا في `GameBoard`** — فاللوح نفسه يخدم `/play` و`/local` و`/tutorial`
 * وهي أوضاع تعمل بلا حساب ودون إنترنت، ووضع البوّابة فيه يكسر ذلك الوعد.
 *
 * لا تُحوّل المسار: الضيف الذي يفتح دعوة `/vs/CODE` وهو غير مسجَّل يجب أن
 * يبقى على رمزه بعد الدخول لا أن يُقذف إلى الجذر.
 */
function GateSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="panel animate-pulse rounded-2xl p-6">
        <div className="mb-3 h-5 w-1/2 rounded bg-white/10" />
        <div className="mb-2 h-9 rounded bg-white/5" />
        <div className="h-9 rounded bg-white/5" />
      </div>
    </div>
  );
}

export default function AuthGate({
  initialAccount = null,
  children,
}: {
  initialAccount?: Account | null;
  /** المحتوى المحميّ. تُستعمل البوّابة أيضاً وحدها في صفحات الخادم المُبوَّبة. */
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const { status } = useSession();
  const router = useRouter();
  const refreshedRef = useRef(false);

  // اللقطة من الخادم تملأ المخزن قبل أول رسم، ثم يتأكّد العميل بنفسه
  useEffect(() => {
    primeAuth(initialAccount);
    if (!initialAccount) void refreshAuth();
  }, [initialAccount]);

  /**
   * بوّابةٌ بلا أبناء تعني أن مكوّن الخادم رأى «ضيف» فعاد مبكراً قبل أن يُرسم
   * محتواه أصلاً (`if (!account) return <AuthGate />`). والدخول يجري في
   * المتصفّح: يكتب كوكي الجلسة لكنه **لا يُعيد تشغيل مكوّن الخادم**، فتنقلب
   * الحالة إلى signedIn ولا يوجد ما يُرسَم — وهذه هي الصفحة البيضاء.
   *
   * `router.refresh()` يُعيد جلب حمولة الخادم، وقد صارت الكوكي معه، فيرسم
   * المحتوى الحقيقي مكان البوّابة. مرّة واحدة بحارس: التحديث يُعيد تركيب
   * الشجرة، ولولا الحارس لدار.
   */
  useEffect(() => {
    if (children || status !== 'signedIn' || refreshedRef.current) return;
    refreshedRef.current = true;
    router.refresh();
  }, [children, status, router]);

  // انتظارُ التحديث يعرض الهيكل لا فراغاً — الفراغ هو ما كان يبدو عطلاً
  if (status === 'signedIn') return <>{children ?? <GateSkeleton />}</>;

  // حالة الانتظار: هيكل محايد لا زرّ «دخول»، وإلا ومض للمسجَّلين في كل صفحة
  if (status === 'loading') return <GateSkeleton />;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-4 flex justify-end">
        <LanguageSwitch />
      </div>

      <div className="panel rounded-2xl p-6">
        <h1 className="mb-1 text-xl font-black">{t('accountNeededOnline')}</h1>
        <p className="mb-5 text-[12px] leading-relaxed opacity-70">{t('accountNeededOnlineBody')}</p>

        {MULTIPLAYER_READY ? (
          <AuthForm />
        ) : (
          <p className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-200">{t('authUnavailable')}</p>
        )}
      </div>

      {/* وعد «اللعب بلا حساب» يجب أن يبقى ظاهراً لا مذكوراً في نصّ فقط */}
      <div className="mt-4 grid gap-2">
        <Link
          href="/local"
          className="rounded-xl bg-white/8 p-3 text-center text-sm font-bold transition hover:bg-white/15"
        >
          {t('continueAsGuestSolo')}
        </Link>
        <Link href="/" className="rounded-xl px-3 py-2 text-center text-xs opacity-60 hover:opacity-100">
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
