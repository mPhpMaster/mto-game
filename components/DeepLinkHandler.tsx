'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isNativeApp } from '@/lib/chat/platform';
import { pathFromDeepLink } from '@/lib/deep-link';

/** Navigate the Capacitor WebView when the app is opened via an App Link or custom scheme. */
export default function DeepLinkHandler() {
  useEffect(() => {
    if (!isNativeApp()) return;

    const navigate = (rawUrl: string) => {
      const path = pathFromDeepLink(rawUrl);
      if (!path) return;
      const target = path.startsWith('/') ? path : `/${path}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) {
        return;
      }
      window.location.assign(target);
    };

    void App.getLaunchUrl().then((result) => {
      if (result?.url) navigate(result.url);
    });

    const sub = App.addListener('appUrlOpen', (event) => {
      navigate(event.url);
    });

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
