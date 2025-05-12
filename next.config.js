/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // SWCによるミニファイを無効化
  // SSR運用のためoutput: 'standalone' のみを指定
  output: 'standalone',
  experimental: {
    forceSwcTransforms: false // SWC変換を強制しない
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1時間キャッシュ
    pagesBufferLength: 10,
  },
  // ビルド時の詳細なエラー出力
  webpack: (config, { isServer, buildId, dev }) => {
    if (!config.infrastructureLogging) config.infrastructureLogging = {};
    config.infrastructureLogging.level = 'verbose';
    // ビルド時の情報をDefinePluginで埋め込む
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_PHASE': JSON.stringify(process.env.NEXT_PHASE || 'build'),
        'process.env.BUILD_ID': JSON.stringify(buildId),
        'process.env.BUILD_IS_SERVER': JSON.stringify(isServer),
        'process.env.BUILD_IS_DEV': JSON.stringify(dev),
      })
    );
    // ビルド時のカスタムメッセージを出力
    // console.log('=== Next.js Build Start ===');
    // console.log('isServer:', isServer);
    // console.log('buildId:', buildId);
    // console.log('dev:', dev);
    // console.log('NODE_ENV:', process.env.NODE_ENV);
    // console.log('NEXT_PHASE:', process.env.NEXT_PHASE);
    return config;
  },
};

module.exports = nextConfig;
