// jest.setup.mjs
// テスト環境のグローバル設定

import '@testing-library/jest-dom';

// テスト用のグローバルオブジェクトを設定
globalThis.Request = class {};
globalThis.Headers = class {};
globalThis.Response = class {};

// モックオブジェクトをグローバルに保存
globalThis.mockModules = {};

// fs/promisesのモック関数を定義
const mockReaddir = jest.fn().mockImplementation(() => Promise.resolve([]));
const mockMkdir = jest.fn().mockImplementation(() => Promise.resolve());
const mockUnlink = jest.fn().mockImplementation(() => Promise.resolve());
const mockStat = jest.fn().mockImplementation(() => Promise.resolve({ isDirectory: () => false }));
const mockCopyFile = jest.fn().mockImplementation(() => Promise.resolve());
const mockWriteFile = jest.fn().mockImplementation(() => Promise.resolve());
const mockReadFile = jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('test')));
const mockAccess = jest.fn().mockImplementation(() => Promise.resolve());

// fsのモック関数を定義
const mockExistsSync = jest.fn().mockImplementation(() => true);
const mockCreateReadStream = jest.fn().mockImplementation(() => ({
  pipe: jest.fn().mockReturnThis(),
  on: jest.fn().mockImplementation(function (event, handler) {
    if (event === 'end') handler();
    return this;
  }),
}));
const mockCreateWriteStream = jest.fn().mockImplementation(() => ({
  on: jest.fn().mockImplementation(function (event, handler) {
    if (event === 'finish') handler();
    return this;
  }),
  end: jest.fn(),
}));

// next/serverのモック関数を定義
const mockNextResponseJson = jest.fn().mockImplementation((body, init) => {
  return {
    status: init?.status || 200,
    json: async () => body,
  };
});

// swrのモック関数を定義
const mockSWRDefault = jest.fn().mockImplementation(() => {
  return {
    data: undefined,
    error: null,
    mutate: jest.fn().mockImplementation(async () => {}),
    isValidating: false,
    isLoading: false,
  };
});

// モックの適用
jest.mock('fs/promises', () => {
  const mock = {
    readdir: mockReaddir,
    mkdir: mockMkdir,
    unlink: mockUnlink,
    stat: mockStat,
    copyFile: mockCopyFile,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  };
  globalThis.mockModules.fsPromises = mock;
  return mock;
});

jest.mock('fs', () => {
  const mock = {
    existsSync: mockExistsSync,
    createReadStream: mockCreateReadStream,
    createWriteStream: mockCreateWriteStream,
  };
  globalThis.mockModules.fs = mock;
  return mock;
});

jest.mock('next/server', () => {
  const mock = {
    NextResponse: {
      json: mockNextResponseJson,
    }
  };
  globalThis.mockModules.nextServer = mock;
  return mock;
});

jest.mock('swr', () => {
  const mock = {
    __esModule: true,
    default: mockSWRDefault,
  };
  globalThis.mockModules.swr = mock;
  return mock;
});

// ファイルモックのためのユーティリティ関数を追加
globalThis.__mockReaddir = (files) => {
  mockReaddir.mockResolvedValue(files);
};

globalThis.__mockExistsSync = (exists) => {
  mockExistsSync.mockReturnValue(exists);
};

globalThis.__mockMkdir = (implementationFn) => {
  if (implementationFn) {
    mockMkdir.mockImplementation(implementationFn);
  } else {
    mockMkdir.mockResolvedValue(undefined);
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
