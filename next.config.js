/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/((?!api|_next|.*\\..*).*)',
        destination: '/index.html',
      },
    ];
  },
};

module.exports = nextConfig;
