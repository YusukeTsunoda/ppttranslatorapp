// jest.config.js
process.env.NODE_ENV = 'test';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
<<<<<<< HEAD
=======
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
>>>>>>> c58ec68 (実装途中)
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
<<<<<<< HEAD
    '^.+\\.(ts|tsx)$': ['@swc/jest'],
  },
  // パフォーマンス最適化のための設定
  maxWorkers: '50%', // CPUコアの半分を使用
  bail: false, // すべてのテストを実行
  verbose: true,
  collectCoverage: true,
=======
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest'],
  },
>>>>>>> c58ec68 (実装途中)
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
<<<<<<< HEAD
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
=======
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@prisma/client)/)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
>>>>>>> c58ec68 (実装途中)
};

module.exports = config;
