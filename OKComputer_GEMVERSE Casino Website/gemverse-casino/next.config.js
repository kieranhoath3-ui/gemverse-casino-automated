/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['socket.io']
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig