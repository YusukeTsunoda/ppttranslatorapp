// jest.config.js
process.env.NODE_ENV = 'test';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest'],
  },
  // パフォーマンス最適化のための設定
  maxWorkers: '50%', // CPUコアの半分を使用
  bail: false, // すべてのテストを実行
  verbose: true,
  collectCoverage: true,
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
    '!**/mocks/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // キャッシュ設定
  cache: true,
  cacheDirectory: '.jest-cache',
  // タイムアウト設定
  testTimeout: 10000,
  // 並列実行の最適化
  maxConcurrency: 5,
  // スナップショットの設定
  snapshotSerializers: [],
  // モジュールのパスエイリアス
  moduleDirectories: ['node_modules', '<rootDir>'],
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
};

module.exports = config;
