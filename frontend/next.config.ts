import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Matches any domain
      },],
  },
  allowedDevOrigins: ['*', 'https://arrange-nav-situation-ist.trycloudflare.com'], // Add your dev origin here
  reactStrictMode: false,
};

export default nextConfig;