'use client';

import { useEffect } from 'react';
import ServiceWorkerRegistration from './ServiceWorkerRegistration';
import InstallPrompt from './InstallPrompt';

export default function MobileEnhancementsProvider() {
  useEffect(() => {
    // Hint the browser for smooth native gestures on touch devices.
    document.documentElement.style.setProperty('touch-action', 'manipulation');
  }, []);

  return (
    <>
      <ServiceWorkerRegistration />
      <InstallPrompt />
    </>
  );
}
