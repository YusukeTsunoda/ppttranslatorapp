// jest.config.js
process.env.NODE_ENV = 'test';

/** @type {import('jest').Config} */
const config = {
  // UIコンポーネントのテストのためにjsdomを使用
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // パスエイリアスの設定 - 順序が重要なので、より具体的なパターンを先に配置
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/constants/(.*)$': '<rootDir>/constants/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
    '^@/public/(.*)$': '<rootDir>/public/$1',
    '^@/mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    // スタイルとアセットのモック
    '\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
    '\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/mocks/fileMock.js',
    // 一般的なパスエイリアスは最後に配置
    '^@/(.*)$': '<rootDir>/$1'
  },
  // ESMモジュールの問題を解決するための設定
  transformIgnorePatterns: [
    // node_modulesの中でも、以下のパッケージは変換対象に含める
    '/node_modules/(?!(openid-client|jose|uuid|@panva|oidc-token-hash|next-auth|@auth|preact|cookie|@babel|@swc|@next|next|nanoid|postcss|tailwindcss|@headlessui|@heroicons|superjson|@stripe|stripe|@prisma|@trpc|zod|swr|react-dom|react-hook-form|react-hot-toast))/',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
          dynamicImport: true, // 動的インポートのサポート
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
          // TypeScript v5の新機能サポート
          useDefineForClassFields: true,
          legacyDecorator: false,
        },
        target: 'es2022', // Node.js v20をターゲットに
      },
    }],
  },
  // パフォーマンス最適化のための設定
  maxWorkers: '50%', // CPUコアの半分を使用
  bail: false, // すべてのテストを実行
  verbose: true,
  // テスト実行中はカバレッジ計測を無効化（必要に応じて有効化）
  collectCoverage: false,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/cypress/**',
    '!**/*.config.{js,ts}',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  // キャッシュ設定
  cache: true,
  cacheDirectory: '.jest-cache',
  // タイムアウト設定（非同期テストのために増加）
  testTimeout: 15000,
  // 並列実行の最適化
  maxConcurrency: 5,
  // スナップショットの設定
  snapshotSerializers: [],
  // モジュールのパスエイリアス
  moduleDirectories: ['node_modules', '<rootDir>'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    // Node.js v20の機能を有効化
    customExportConditions: ['node', 'node-addons'],
  },
  // 重複する設定を削除（上部で既に定義済み）
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'jest-junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  // テスト実行の安定性向上のための設定
  testSequencer: '<rootDir>/jest.sequencer.js',
  // フラッキーテスト検出のための設定
  detectOpenHandles: true,
};

module.exports = config;
