/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/ws-yatra/:path*',
        destination: 'http://localhost:8080/ws-yatra/:path*',
      },
    ]
  },
}

export default nextConfig

