/*
 * عامل الخدمة — يجعل اللعبة تعمل دون إنترنت بعد أول فتح.
 * الاستراتيجية: الأصول الثابتة من الذاكرة أولاً، والصفحات من الشبكة أولاً
 * مع الرجوع إلى الذاكرة عند الانقطاع. نداءات /api لا تُخزَّن إطلاقاً.
 */
const VERSION = 'mto-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline';

const PRECACHE = ['/', '/play', '/tutorial', '/local', '/cards', OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // الفشل في تخزين صفحة واحدة يجب ألا يُفشل التثبيت كلّه
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/cards/') ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // حفظ النتائج واللعب الجماعي يحتاجان الشبكة، ولا معنى لتخزينهما
  if (url.pathname.startsWith('/api/')) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) (await caches.open(STATIC_CACHE)).put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) (await caches.open(PAGE_CACHE)).put(request, res.clone());
          return res;
        } catch {
          return (
            (await caches.match(request)) ??
            (await caches.match(OFFLINE_URL)) ??
            new Response('غير متصل', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })
          );
        }
      })()
    );
  }
});
