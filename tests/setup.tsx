import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// UIコンポーネントテスト用のセットアップ
// テスト間で自動的にクリーンアップを実行
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// 共通のモックセットアップ
beforeAll(() => {
  // モックの設定をここで一元管理
  jest.mock('next/router', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      query: {},
    })),
  }));

  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    })),
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  }));

  jest.mock('swr', () => ({
    __esModule: true,
    default: jest.fn(() => ({
      data: null,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    })),
  }));

// グローバルなモック設定
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

class MockIntersectionObserver {
  root: Element | Document | null = null;
  rootMargin = '';
  thresholds = [0];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn().mockReturnValue([]);

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    if (options) {
      this.root = options.root || null;
      this.rootMargin = options.rootMargin || '0px';
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0];
    }
  }
}

// グローバルオブジェクトにモックを設定
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// matchMediaのモック
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// UIコンポーネントテスト用のレンダリングユーティリティ
export * from '@testing-library/react';
