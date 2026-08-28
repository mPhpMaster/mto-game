/**
 * يزامن package.json مع أندرويد وملف PWA.
 *   npm run version:sync
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const [major = 0, minor = 0, patch = 0] = version.split('.').map((n) => parseInt(n, 10) || 0);
const versionCode = major * 10_000 + minor * 100 + patch;

// --- Android build.gradle ---
const gradlePath = join(root, 'android', 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle, 'utf8');
console.log(`✓ android/app/build.gradle → versionName ${version}, versionCode ${versionCode}`);

// --- PWA manifest ---
const manifestPath = join(root, 'public', 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`✓ public/manifest.webmanifest → version ${version}`);
