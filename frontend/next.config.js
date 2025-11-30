/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy backend API calls, but NOT NextAuth routes
        source: '/api/debates/:path*',
        destination: 'http://localhost:8002/api/debates/:path*',
      },
      {
        source: '/api/topics/:path*',
        destination: 'http://localhost:8002/api/topics/:path*',
      },
      {
        source: '/api/models/:path*',
        destination: 'http://localhost:8002/api/models/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:8002/api/admin/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
