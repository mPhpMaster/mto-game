/** Production host loaded by the Capacitor shell (see capacitor.config.ts). */
export const APP_HOST = 'mto-game.vercel.app';

/** Android applicationId from android/app/build.gradle. */
export const APP_PACKAGE = 'com.mto.monsterclash';

/** Custom URL scheme fallback for older Android builds. */
export const CUSTOM_SCHEME = 'mto-game';

export function appOrigin(): string {
  return `https://${APP_HOST}`;
}

/** Normalize a path (with leading slash) for deep-link targets. */
export function normalizeAppPath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Build a canonical https URL on the production host. */
export function toAppUrl(path: string): string {
  return `${appOrigin()}${normalizeAppPath(path)}`;
}

/**
 * Android intent URL — opens the native app when installed, otherwise falls back to https
 * via S.browser_fallback_url (Chrome and most Android browsers).
 */
export function buildAndroidIntentUrl(path: string): string {
  const normalized = normalizeAppPath(path);
  const httpsUrl = toAppUrl(normalized);
  const fallback = encodeURIComponent(httpsUrl);
  return `intent://${APP_HOST}${normalized}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

/** True on Android mobile browsers (not the Capacitor WebView). */
export function isAndroidMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Try to open the native app on Android; desktop and iOS keep the https URL.
 * Safe to call from click handlers on mobile web share / invite UI.
 */
export function openInNativeApp(path: string): void {
  const httpsUrl = toAppUrl(path);
  if (isAndroidMobileBrowser()) {
    window.location.href = buildAndroidIntentUrl(path);
    return;
  }
  window.location.href = httpsUrl;
}

/**
 * Parse an incoming deep-link URL (https app link or custom scheme) into an in-app path.
 * Returns null when the URL is not for this app.
 */
export function pathFromDeepLink(rawUrl: string): string | null {
  try {
    if (rawUrl.startsWith(`${CUSTOM_SCHEME}://`)) {
      const rest = rawUrl.slice(`${CUSTOM_SCHEME}://`.length);
      const path = rest.startsWith('/') ? rest : `/${rest}`;
      return path.split('?')[0].split('#')[0] || '/';
    }

    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname !== APP_HOST) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
