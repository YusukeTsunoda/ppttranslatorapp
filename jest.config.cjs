// jest.config.cjs
// このファイルはJest設定を行います
process.env.NODE_ENV = 'test';

const nextJest = require('next/jest');

// next/jestが次のNextとJestの設定が正しく作動するようにします
const createJestConfig = nextJest({
  dir: './',
});

// 任意のJest設定
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'cobertura'],
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
  transformIgnorePatterns: ['/node_modules/(?!(openid-client|jose)/).*/', '^.+\\.module\\.(css|sass|scss)$'],
  // テスト対象の最小カバレッジを設定
  coverageThreshold: {
    global: {
      statements: 10,
      branches: 5,
      functions: 10,
      lines: 10,
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
  // Babelの代わりにトランスフォームを使用
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { configFile: './babel.config.cjs' }],
  },
};

// createJestConfigは、次の処理のためにこのcustomConfigを使用します
// https://nextjs.org/docs/testing#setting-up-jest-with-the-rust-compiler
module.exports = createJestConfig(customJestConfig);
