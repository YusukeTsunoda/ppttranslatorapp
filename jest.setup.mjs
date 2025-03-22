// jest.setup.mjs
// テスト環境のグローバル設定

import '@testing-library/jest-dom';

// jestオブジェクトをグローバルに公開
globalThis.jest = jest;

// テスト用のグローバルオブジェクトを設定
globalThis.Request = class {};
globalThis.Headers = class {};
globalThis.Response = class {};

// モックをグローバルに保存するための変数
globalThis.mockModules = {};

// fs/promises のモックを設定
const fsPromisesMock = {
  readdir: jest.fn().mockImplementation(() => Promise.resolve([])),
  mkdir: jest.fn().mockImplementation(() => Promise.resolve()),
  unlink: jest.fn().mockImplementation(() => Promise.resolve()),
  stat: jest.fn().mockImplementation(() => Promise.resolve({ isDirectory: () => false })),
  copyFile: jest.fn().mockImplementation(() => Promise.resolve()),
  writeFile: jest.fn().mockImplementation(() => Promise.resolve()),
  readFile: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('test'))),
  access: jest.fn().mockImplementation(() => Promise.resolve()),
};

// fs のモックを設定
const fsMock = {
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
};

// next/server のモックを設定
const nextServerMock = {
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body,
      };
    }),
  }
};

// SWR のモックを設定
const swrMock = {
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    return {
      data: undefined,
      error: null,
      mutate: jest.fn().mockImplementation(async () => {}),
      isValidating: false,
      isLoading: false,
    };
  }),
};

// モックをグローバルに保存
globalThis.mockModules.fsPromises = fsPromisesMock;
globalThis.mockModules.fs = fsMock;
globalThis.mockModules.nextServer = nextServerMock;
globalThis.mockModules.swr = swrMock;

// モックの適用
jest.mock('fs/promises', () => fsPromisesMock);
jest.mock('fs', () => fsMock);
jest.mock('next/server', () => nextServerMock);
jest.mock('swr', () => swrMock);

// ファイルモックのためのユーティリティ関数を追加
globalThis.__mockReaddir = (files) => {
  globalThis.mockModules.fsPromises.readdir.mockResolvedValue(files);
};

globalThis.__mockExistsSync = (exists) => {
  globalThis.mockModules.fs.existsSync.mockReturnValue(exists);
};

globalThis.__mockMkdir = (implementationFn) => {
  if (implementationFn) {
    globalThis.mockModules.fsPromises.mkdir.mockImplementation(implementationFn);
  } else {
    globalThis.mockModules.fsPromises.mkdir.mockResolvedValue(undefined);
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
