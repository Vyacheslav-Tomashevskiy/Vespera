'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        // Keep app usable even if SW registration fails.
        console.error('Service worker registration failed', error);
      }
    };

    registerWorker();
  }, []);

  return null;
}
