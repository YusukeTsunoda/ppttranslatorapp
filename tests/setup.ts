// Jest setup file
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// NextAuth のモック
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// fetch のモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// SWR のモック
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  })),
}));

// window.navigator のモック
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
  },
  writable: true,
});

// ローカルストレージのモック
class LocalStorageMock implements Storage {
  store: Record<string, string>;
  length: number;
  
  constructor() {
    this.store = {};
    this.length = 0;
  }

  clear() {
    this.store = {};
    this.length = 0;
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
    this.length = Object.keys(this.store).length;
  }

  removeItem(key: string) {
    delete this.store[key];
    this.length = Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();

// console.error のモック（テスト出力をクリーンに保つため）
console.error = jest.fn();

// テスト環境のクリーンアップ
afterEach(() => {
  jest.clearAllMocks();
});

// Jestの拡張
expect.extend({
  toBe(received, expected) {
    const pass = Object.is(received, expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to be ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be ${expected}`,
        pass: false,
      };
    }
  },
  toEqual(received, expected) {
    const pass = this.equals(received, expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to equal ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to equal ${expected}`,
        pass: false,
      };
    }
  },
  toBeUndefined(received) {
    const pass = received === undefined;
    if (pass) {
      return {
        message: () => `expected ${received} not to be undefined`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be undefined`,
        pass: false,
      };
    }
  },
  toBeDefined(received) {
    const pass = received !== undefined;
    if (pass) {
      return {
        message: () => `expected ${received} to be undefined`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} not to be undefined`,
        pass: false,
      };
    }
  },
  toHaveBeenCalledWith(received, ...expected) {
    const pass = jest.isMockFunction(received) && 
      received.mock.calls.some(call => 
        this.equals(call, expected)
      );
    if (pass) {
      return {
        message: () => `expected ${received} not to have been called with ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have been called with ${expected}`,
        pass: false,
      };
    }
  },
}); 