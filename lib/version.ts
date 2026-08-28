import pkg from '../package.json';

/** رقم الإصدار الموحّد للموقع وتطبيق أندرويد — يُحدَّث عبر `npm run version:bump`. */
export const APP_VERSION = pkg.version;

/** رقم بناء أندرويد (versionCode) — يُشتق من الإصدار في sync-version. */
export function androidVersionCode(version = APP_VERSION): number {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((n) => parseInt(n, 10) || 0);
  return major * 10_000 + minor * 100 + patch;
}
