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
    // Use environment variable for backend URL, fallback to localhost for development
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8002';

    return [
      {
        // Proxy backend API calls, but NOT NextAuth routes
        source: '/api/debates/:path*',
        destination: `${backendUrl}/api/debates/:path*`,
      },
      {
        source: '/api/topics/:path*',
        destination: `${backendUrl}/api/topics/:path*`,
      },
      {
        source: '/api/models/:path*',
        destination: `${backendUrl}/api/models/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/api/admin/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
