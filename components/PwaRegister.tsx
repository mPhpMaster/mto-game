'use client';

import { useEffect } from 'react';

/** يسجّل عامل الخدمة بعد اكتمال التحميل حتى لا يزاحم أول رسم للصفحة */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // التسجيل قد يفشل في سياق غير آمن — اللعبة تعمل بدونه
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
