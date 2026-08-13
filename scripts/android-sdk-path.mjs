// يكتب android/local.properties بمسار Android SDK بصيغة يفهمها Gradle
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
  process.env.HOME ? join(process.env.HOME, 'AppData', 'Local', 'Android', 'Sdk') : null,
].filter(Boolean);

const sdk = candidates.find((p) => existsSync(p));
if (!sdk) {
  console.error('✗ لم يُعثر على Android SDK. ثبّته أو اضبط ANDROID_HOME.');
  process.exit(1);
}

// Gradle يقرأ الملف كـ .properties فتُهرَّب الشرطات المائلة العكسية
writeFileSync('android/local.properties', `sdk.dir=${sdk.split('\\').join('\\\\')}\n`, 'utf8');
console.log(`✓ sdk.dir=${sdk}`);
