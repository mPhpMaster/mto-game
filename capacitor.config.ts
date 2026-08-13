import type { CapacitorConfig } from '@capacitor/cli';

/**
 * غلاف أندرويد الأصلي.
 *
 * التطبيق يحمّل النسخة المنشورة على Vercel بدل تضمين بناء ثابت، لأن اللعبة
 * تعتمد على مسارات خادم (حفظ النتائج) وعلى Supabase Realtime للّعب الجماعي،
 * وهذا يبقي التطبيق محدَّثاً دون إعادة تثبيت. عامل الخدمة يخزّن الأصول محلياً
 * فتبقى المباريات ضد الخصم الآلي والتعليم واللعب على جهاز واحد متاحة دون إنترنت.
 *
 * webDir مطلوب من Capacitor حتى مع server.url، ويُستعمل كنسخة احتياطية.
 */
const config: CapacitorConfig = {
  appId: 'com.mto.monsterclash',
  appName: 'مواجهة الوحوش',
  webDir: 'android-shell',
  server: {
    url: 'https://mto-game.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#070912',
    allowMixedContent: false,
  },
};

export default config;
