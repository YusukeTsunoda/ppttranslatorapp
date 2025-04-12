/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // SWCによるミニファイを無効化
  experimental: {
    forceSwcTransforms: false // SWC変換を強制しない
  },
};

module.exports = nextConfig;
