/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // `domains` is deprecated. remotePatterns has to be set before next/image
    // is used, or any product whose image_url points at an external host
    // fails outright rather than degrading.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig