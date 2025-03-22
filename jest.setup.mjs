// jest.setup.js
// テスト環境のグローバル設定

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// テスト用のグローバルオブジェクトを設定
globalThis.Request = class {};
globalThis.Headers = class {};
globalThis.Response = class {};

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
jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockImplementation(() => Promise.resolve([])),
  mkdir: jest.fn().mockImplementation(() => Promise.resolve()),
  unlink: jest.fn().mockImplementation(() => Promise.resolve()),
  stat: jest.fn().mockImplementation(() => Promise.resolve({ isDirectory: () => false })),
  copyFile: jest.fn().mockImplementation(() => Promise.resolve()),
  writeFile: jest.fn().mockImplementation(() => Promise.resolve()),
  readFile: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('test'))),
  access: jest.fn().mockImplementation(() => Promise.resolve()),
}));

// fs のモックを設定
jest.mock('fs', () => ({
  existsSync: jest.fn().mockImplementation(() => true),
  createReadStream: jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function (event, handler) {
      if (event === 'end') handler();
      return this;
    }),
  })),
  createWriteStream: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation(function (event, handler) {
      if (event === 'finish') handler();
      return this;
    }),
    end: jest.fn(),
  })),
}));

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
globalThis.__mockReaddir = (files) => {
  const fsPromises = jest.requireMock('fs/promises');
  fsPromises.readdir.mockResolvedValue(files);
};

globalThis.__mockExistsSync = (exists) => {
  const fs = jest.requireMock('fs');
  fs.existsSync.mockReturnValue(exists);
};

globalThis.__mockMkdir = (implementationFn) => {
  const fsPromises = jest.requireMock('fs/promises');
  if (implementationFn) {
    fsPromises.mkdir.mockImplementation(implementationFn);
  } else {
    fsPromises.mkdir.mockResolvedValue(undefined);
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
globalThis.waitForNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));
