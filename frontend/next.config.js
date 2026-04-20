// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'ipfs.io'],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig