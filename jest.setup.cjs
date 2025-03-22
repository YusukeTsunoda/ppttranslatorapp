// jest.setup.cjs
// テスト環境のグローバル設定

require('@testing-library/jest-dom');

// テスト用のグローバルオブジェクトを設定
global.Request = class {};
global.Headers = class {};
global.Response = class {};

// モックオブジェクトをグローバルに保存
global.mockModules = {};

// fs/promisesのモック
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

// fsのモック
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

// next/serverのモック
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

// swrのモック
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
global.mockModules.fsPromises = fsPromisesMock;
global.mockModules.fs = fsMock;
global.mockModules.nextServer = nextServerMock;
global.mockModules.swr = swrMock;

// モックの適用
jest.mock('fs/promises', () => global.mockModules.fsPromises);
jest.mock('fs', () => global.mockModules.fs);
jest.mock('next/server', () => global.mockModules.nextServer);
jest.mock('swr', () => global.mockModules.swr);

// ファイルモックのためのユーティリティ関数を追加
global.__mockReaddir = (files) => {
  global.mockModules.fsPromises.readdir.mockResolvedValue(files);
};

global.__mockExistsSync = (exists) => {
  global.mockModules.fs.existsSync.mockReturnValue(exists);
};

global.__mockMkdir = (implementationFn) => {
  if (implementationFn) {
    global.mockModules.fsPromises.mkdir.mockImplementation(implementationFn);
  } else {
    global.mockModules.fsPromises.mkdir.mockResolvedValue(undefined);
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
global.waitForNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));
