/**
 * يبني حزمة أندرويد (APK) وينسخها إلى public/download/.
 *   npm run android:apk            (debug — قابلة للتثبيت والمشاركة)
 *   npm run android:apk -- release (تحتاج توقيعاً، انظر README)
 *
 * لماذا java.io.tmpdir قصير: منتقي NIO على ويندوز ينشئ أنبوباً عبر مقبس
 * AF_UNIX داخل مجلّد المؤقّت، وحدّ مسار المقبس ~108 بايت. إن كان مسار TEMP
 * طويلاً يفشل البناء برسالة مُضلّلة: «Unable to establish loopback connection».
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const variant = process.argv[2] === 'release' ? 'release' : 'debug';
const task = variant === 'release' ? 'assembleRelease' : 'assembleDebug';

const TMP = 'C:\\Temp\\gradle-tmp';
mkdirSync(TMP, { recursive: true });

const androidDir = join(process.cwd(), 'android');
if (!existsSync(androidDir)) {
  console.error('✗ مجلّد android غير موجود. شغّل:  npx cap add android');
  process.exit(1);
}

// على ويندوز يمنع Node تشغيل ملفات .bat دون صدفة، لذا نمرّر الأمر كنصّ
// المجلّد الحالي ليس ضمن مسارات البحث في cmd، فلا بدّ من بادئة صريحة
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const jvmArgs = `-Xmx2048m -Djava.io.tmpdir=${TMP}`;

console.log(`▶ بناء ${variant}…`);
execSync(`"${gradlew}" ${task} --no-daemon "-Dorg.gradle.jvmargs=${jvmArgs}"`, {
  cwd: androidDir,
  stdio: 'inherit',
  env: { ...process.env, TMP, TEMP: TMP, TMPDIR: TMP },
});

const built = join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  variant,
  `app-${variant}.apk`
);
if (!existsSync(built)) {
  console.error(`✗ لم يُعثر على الحزمة في ${built}`);
  process.exit(1);
}

const outDir = join(process.cwd(), 'public', 'download');
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, 'mto-game.apk');
copyFileSync(built, dest);

console.log(`\n✓ ${built}`);
console.log(`✓ نُسخت إلى public/download/mto-game.apk`);
