// jest.config.js
// このファイルはJest設定を行います
process.env.NODE_ENV = 'test';

const nextJest = require('next/jest');

// next/jestが次のNextとJestの設定が正しく作動するようにします
const createJestConfig = nextJest({
  dir: './',
});

// 任意のJest設定
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/app/\\(dashboard\\)/(.*)$': '<rootDir>/app/(dashboard)/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  coverageProvider: 'babel',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/public/**',
    '!**/tests/**',
    '!**/jest.config.js',
    '!**/next.config.js',
    '!**/tailwind.config.js',
    '!**/postcss.config.js',
    '!**/prettier.config.js',
  ],
  // パスの中に以下の文字列を含むモジュールはトランスフォームしない
  transformIgnorePatterns: [
    '/node_modules/(?!(openid-client|jose)/).*/',
    '^.+\\.module\\.(css|sass|scss)$'
  ],
  // テスト対象の最小カバレッジを設定
  coverageThreshold: {
    global: {
      statements: 1,
      branches: 0,
      functions: 1,
      lines: 1,
    },
    './lib/hooks/': {
      statements: 40,
      branches: 30,
      functions: 20,
      lines: 40,
    },
  },
  // テスト結果をHTMLで出力
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: './reports/jest-report.html',
      },
    ],
  ],
  // トランスフォーム設定の更新
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
};

// createJestConfigは、次の処理のためにこのcustomConfigを使用します
// https://nextjs.org/docs/testing#setting-up-jest-with-the-rust-compiler
module.exports = createJestConfig(customJestConfig);
