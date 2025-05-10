/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // SWCによるミニファイを無効化
  output: 'standalone', 
  experimental: {
    forceSwcTransforms: false // SWC変換を強制しない
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1時間キャッシュ
    pagesBufferLength: 10,
  },
  // ビルド時の詳細なエラー出力
  webpack: (config, { isServer }) => {
    if (!config.infrastructureLogging) config.infrastructureLogging = {};
    config.infrastructureLogging.level = 'verbose';
    return config;
  },
};

module.exports = nextConfig;
