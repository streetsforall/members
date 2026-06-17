/** @type {import('next').NextConfig} */

const nextConfig = {
  async headers() {
    return [
      {
        // Matching all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' }, // replace this your actual origin
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT',
          },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ];
  },
  // Required for server side logger
  serverExternalPackages: ['pino', 'pino-pretty'],
};

export default nextConfig;
