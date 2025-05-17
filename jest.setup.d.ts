// jest.setup.d.ts
// グローバル変数の型定義

declare global {
  // エラータイプの定義
  const ErrorType: {
    AUTH: 'AUTH';
    VALIDATION: 'VALIDATION';
    NOT_FOUND: 'NOT_FOUND';
    FORBIDDEN: 'FORBIDDEN';
    DATABASE: 'DATABASE';
    NETWORK: 'NETWORK';
    RATE_LIMIT: 'RATE_LIMIT';
    UNKNOWN: 'UNKNOWN';
  };

  // エラーコードの定義
  const ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR';
    UNAUTHORIZED: 'UNAUTHORIZED';
    FORBIDDEN: 'FORBIDDEN';
    NOT_FOUND: 'NOT_FOUND';
    DATABASE_ERROR: 'DATABASE_ERROR';
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED';
    UNKNOWN_ERROR: 'UNKNOWN_ERROR';
  };

  // モックファイル作成ヘルパー
  function mockFile(name: string, size: number, type: string, lastModified?: Date): File;

  // fetchのモック
  let fetch: jest.Mock;

  // jestのグローバル参照
  const jest: typeof import('@jest/globals').jest;

  // IntersectionObserverのモック
  class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit);
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  }

  // ResizeObserverのモック
  class ResizeObserver {
    constructor(callback: ResizeObserverCallback);
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  }

  // matchMediaのモック
  const matchMedia: jest.Mock;

  // エラータイプの型
  type ErrorTypeValues = typeof ErrorType[keyof typeof ErrorType];
  
  // エラーコードの型
  type ErrorCodeValues = typeof ErrorCodes[keyof typeof ErrorCodes];
}

export {};
