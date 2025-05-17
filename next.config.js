/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // SWCによるミニファイを有効化
  // SSR運用のためoutput: 'standalone' のみを指定
  output: 'standalone',
  experimental: {
    forceSwcTransforms: false // SWC変換を強制しない
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1時間キャッシュ
    pagesBufferLength: 10,
  },
  // 一時ディレクトリを除外
  eslint: {
    ignoreDuringBuilds: true, // ビルド時のESLintチェックを無効化
  },
  typescript: {
    // TypeScriptエラーをビルド時に無視する
    ignoreBuildErrors: true,
    // 特定のディレクトリを型チェックから除外
    tsconfigPath: 'tsconfig.json',
  },
  // ビルドから除外するディレクトリやファイル
  transpilePackages: [],
  // サーバーレス関数のサイズを削減するための設定
  outputFileTracing: {
    // バンドルから除外するパス
    ignoredModules: [
      'sharp', // 使っていない場合は不要
      // 他のJavaScriptビルドに含まれない大きなライブラリなど
    ],
    // バンドルから除外するファイルパスパターン
    ignoredModuleFiles: [
      '**/.next/cache/**',
      // Prismaエンジンバイナリを除外せず、必要なものを含める
      // '**/node_modules/.prisma/client/libquery_engine-*',
      // '!**/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node',
      '**/node_modules/sharp/**/*.node', // 使っていない場合は不要
    ],
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
    
    // 一時ディレクトリとscripts/tempディレクトリを除外
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/temp/**', 
        '**/scripts/temp/**', 
        '**/.next/cache/**',
        ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : [])
      ],
    };
    
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
