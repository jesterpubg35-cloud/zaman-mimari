/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Pigeon Maps ve Capacitor SSR sorunlarını çöz
  transpilePackages: ['pigeon-maps'],
  
  
  // Image optimization
  images: {
    unoptimized: true,
  },
  
  // Headers - CORS ve caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
