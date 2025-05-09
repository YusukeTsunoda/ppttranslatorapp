/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  reactStrictMode: true,
  images: {
    domains: ['localhost', process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')].filter(Boolean),
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3003',
        pathname: '/api/slides/**',
      },
    ],
    unoptimized: true, // 画像最適化を無効化
  },
  // APIルートを動的に処理するためserverを使用
  output: process.env.NEXT_PUBLIC_EXPORT === 'true' ? 'export' : 'standalone',

  // SWCコンパイラを有効化（テスト環境以外）
  swcMinify: process.env.NODE_ENV !== 'test',
  compiler: {
    // SWCコンパイラの設定（テスト環境以外で使用）
    styledComponents: true,
    // SWCのReactの設定
    react: {
      runtime: 'automatic',
    },
  },

  // ESLintの設定を修正
  eslint: {
    ignoreDuringBuilds: false, // ビルド時にESLintを実行する
    dirs: ['app', 'components', 'lib', 'pages'], // ESLintを実行するディレクトリ
  },

  experimental: {
    // テスト環境ではSWC強制変換を無効化、それ以外では有効化
    forceSwcTransforms: process.env.NODE_ENV !== 'test',
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  // 動的ルートの警告を抑制
  onDemandEntries: {
    // ビルド時に動的エントリを生成するための設定
    maxInactiveAge: 60 * 60 * 1000, // 1時間
    pagesBufferLength: 5,
  },

  // 動的ルートの静的生成エラーを解決
  staticPageGenerationTimeout: 120, // 2分
  generateBuildId: async () => {
    // 一貫したビルドIDを生成（キャッシュ効率向上）
    return 'build-' + new Date().toISOString().replace(/[-:.TZ]/g, '');
  },
  poweredByHeader: false, // X-Powered-Byヘッダーを無効化

  // 開発サーバーの設定
  async rewrites() {
    return [
      {
        source: '/api/slides/:path*',
        destination: '/api/slides/:path*',
      },
      // 動的APIルートのリライト
      {
        source: '/api/activity',
        destination: '/api/activity',
      },
      {
        source: '/api/user/role',
        destination: '/api/user/role',
      },
      {
        source: '/api/history',
        destination: '/api/history',
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 開発環境でのクライアントサイドキャッシュを無効化
      config.cache = false;
    }

    // テスト環境ではwebpackの設定を変更しない
    if (process.env.NODE_ENV === 'test') {
      return config;
    }

    return config;
  },

  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/signin',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/signin',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/auth/signin',
        destination: '/signin',
        permanent: true,
      },
      {
        source: '/auth/signup',
        destination: '/signup',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
