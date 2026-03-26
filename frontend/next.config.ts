import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Using webpack for better compatibility
  turbopack: {
    root: process.cwd(), // Fix workspace root warning
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 375, 414, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
