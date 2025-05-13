/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

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
    
    // APIルートファイルの検出
    if (isServer) {
      const apiDir = path.join(process.cwd(), 'app/api');
      try {
        if (fs.existsSync(apiDir)) {
          console.log('=== API Routes Build Info ===');
          console.log(`API directory: ${apiDir}`);
          
          // APIディレクトリを再帰的に走査
          const allApiFiles = walkDirSync(apiDir);
          const routeFiles = allApiFiles.filter(file => 
            file.endsWith('route.ts') || file.endsWith('route.js')
          );
          
          console.log(`Detected ${routeFiles.length} API routes:`);
          routeFiles.forEach(file => {
            const relativePath = path.relative(process.cwd(), file);
            console.log(`  - ${relativePath}`);
          });
          
          console.log('========================');
        }
      } catch (err) {
        console.error('API routes detection error:', err);
      }
    }
    
    return config;
  },
};

// ディレクトリを再帰的に走査するヘルパー関数
function walkDirSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      filelist = walkDirSync(filePath, filelist);
    } else {
      filelist.push(filePath);
    }
  });
  return filelist;
}

module.exports = nextConfig;
