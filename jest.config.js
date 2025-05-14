// jest.config.js
process.env.NODE_ENV = 'test';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^next/router$': '<rootDir>/node_modules/next/router.js',
    '^next/navigation$': '<rootDir>/node_modules/next/navigation.js',
    '^next/link$': '<rootDir>/node_modules/next/link.js',
    '^next/image$': '<rootDir>/node_modules/next/image.js',
    '^next/dynamic$': '<rootDir>/node_modules/next/dynamic.js',
    '^next/script$': '<rootDir>/node_modules/next/script.js',
    '^next/head$': '<rootDir>/node_modules/next/head.js',
    '^next/headers$': '<rootDir>/node_modules/next/headers.js',
    '^next/server$': '<rootDir>/node_modules/next/server.js'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testRegex: '(/__tests__|/tests/)(.*)(test|spec)\\.[jt]sx?$',
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
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};

module.exports = config;
