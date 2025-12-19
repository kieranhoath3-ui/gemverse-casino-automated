/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['socket.io']
  },
  images: {
    domains: ['localhost'],
  },
  output: 'standalone',
}

module.exports = nextConfig