/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
  },
  // Add environment variables that should be available to the client
  env: {
    MODEL_NAME: process.env.MODEL_NAME || 'gpt-4o',
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
