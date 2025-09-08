import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Matches any domain
      },],
  },
  allowedDevOrigins: ['*', '731b82837da5.ngrok-free.app'], // Add your dev origin here
  reactStrictMode: false,
};

export default nextConfig;