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
  output: 'standalone',
  // SWCコンパイラを明示的に有効化
  swcMinify: true,
  compiler: {
    // SWCコンパイラの設定
    styledComponents: true,
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  // 開発サーバーの設定
  async rewrites() {
    return [
      {
        source: '/api/slides/:path*',
        destination: '/api/slides/:path*',
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 開発環境でのクライアントサイドキャッシュを無効化
      config.cache = false;
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
      }
    ]
  }
};

module.exports = nextConfig; 