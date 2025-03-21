// jest.setup.js
// テスト環境のグローバル設定

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// テスト用のグローバルオブジェクトを設定
global.Request = class {};
global.Headers = class {};
global.Response = class {};

// テスト用のモック関数を設定
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn().mockImplementation((body, init) => {
        return {
          status: init?.status || 200,
          json: async () => body,
        };
      }),
    },
  };
});

// fs/promises のモックを設定
jest.mock('fs/promises', () => {
  return {
    readdir: jest.fn().mockImplementation(() => Promise.resolve([])),
    mkdir: jest.fn().mockImplementation(() => Promise.resolve()),
    unlink: jest.fn().mockImplementation(() => Promise.resolve()),
    stat: jest.fn().mockImplementation(() => Promise.resolve({ isDirectory: () => false })),
    copyFile: jest.fn().mockImplementation(() => Promise.resolve()),
    writeFile: jest.fn().mockImplementation(() => Promise.resolve()),
    readFile: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('test'))),
    access: jest.fn().mockImplementation(() => Promise.resolve()),
  };
});

// fs のモックを設定
jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockImplementation(() => true),
    createReadStream: jest.fn().mockImplementation(() => ({
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function(event, handler) {
        if (event === 'end') handler();
        return this;
      }),
    })),
    createWriteStream: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockImplementation(function(event, handler) {
        if (event === 'finish') handler();
        return this;
      }),
      end: jest.fn(),
    })),
  };
});

// SWRのモックを設定
jest.mock('swr', () => {
  const originalModule = jest.requireActual('swr');
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn().mockImplementation((key, fetcher, config) => {
      return {
        data: undefined,
        error: null,
        mutate: jest.fn().mockImplementation(async () => {}),
        isValidating: false,
        isLoading: false,
      };
    }),
  };
});

// ファイルモックのためのユーティリティ関数を追加
global.__mockReaddir = (files) => {
  const { readdir } = require('fs/promises');
  readdir.mockResolvedValue(files);
};

global.__mockExistsSync = (exists) => {
  const { existsSync } = require('fs');
  existsSync.mockReturnValue(exists);
};

global.__mockMkdir = (implementationFn) => {
  const { mkdir } = require('fs/promises');
  if (implementationFn) {
    mkdir.mockImplementation(implementationFn);
  } else {
    mkdir.mockResolvedValue(undefined);
  }
};

// コンソールエラーを抑制する設定
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// テスト用のユーティリティ関数
global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0)); 