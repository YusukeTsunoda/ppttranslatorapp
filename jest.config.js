// jest.config.js
// このファイルはJest設定を行います
process.env.NODE_ENV = 'test';

const nextJest = require('next/jest');

// next/jestが次のNextとJestの設定が正しく作動するようにします
const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/', '/coverage/', '/__tests__/', '/test/', '/tests/', '/dist/'],
  coverageThreshold: null,
  verbose: true,
  testTimeout: 10000,
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        outputPath: 'reports/jest-report.html',
        pageTitle: 'Test Report',
        includeFailureMsg: true,
      },
    ],
  ],
};

// createJestConfigは、次の処理のためにこのcustomConfigを使用します
// https://nextjs.org/docs/testing#setting-up-jest-with-the-rust-compiler
module.exports = createJestConfig(config);
