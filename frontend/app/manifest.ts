import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chioma',
    short_name: 'Chioma',
    description:
      'Blockchain-powered rental platform with mobile-first workflows for agents, landlords, and tenants.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#1d4ed8',
    categories: ['finance', 'productivity', 'lifestyle'],
    lang: 'en',
    icons: [
      {
        src: '/android_192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android_512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon_48.png',
        sizes: '48x48',
        type: 'image/png',
      },
    ],
  };
}
