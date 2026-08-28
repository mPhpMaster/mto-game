import { Capacitor } from '@capacitor/core';

/** Capacitor Android/iOS shell (not mobile browser tab). */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/** Narrow phone/tablet viewport — includes mobile browsers and the native WebView. */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/** True when voice UI should use compact, thumb-friendly layout. */
export function isMobileChatSurface(): boolean {
  return isNativeApp() || isMobileViewport();
}
