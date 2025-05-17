import React from 'react';
import { render, act } from '@testing-library/react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';
import { useRef } from 'react';

// IntersectionObserverメソッドのモック
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockUnobserve = jest.fn();

// グローバルIntersectionObserverのモック実装
beforeEach(() => {
  // jest.setup.jsで定義されているIntersectionObserverを上書き
  global.IntersectionObserver = jest.fn().mockImplementation(function(this: any, callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.observe = mockObserve;
    this.disconnect = mockDisconnect;
    this.unobserve = mockUnobserve;
    this.callback = callback;
    this.options = options;
  });

  // モック関数をリセット
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  mockUnobserve.mockClear();
});

// テスト後にモックをリセット
afterEach(() => {
  jest.clearAllMocks();
});

describe('useIntersectionObserver', () => {
  it('要素が存在する場合、IntersectionObserverを初期化して監視する', () => {
    // モックDOM要素を作成
    const mockElement = document.createElement('div');
    
    // テスト用のコンポーネント
    const TestComponent = () => {
      const mockRef = useRef<HTMLDivElement>(null);
      const mockCallback = jest.fn();
      
      // useRefのcurrentを手動で設定
      Object.defineProperty(mockRef, 'current', {
        value: mockElement,
        writable: true
      });

      useIntersectionObserver(mockRef, mockCallback);

      return <div data-testid="test-element" />;
    };

    render(<TestComponent />);

    // 要素が監視対象に追加されたか確認
    expect(mockObserve).toHaveBeenCalledWith(mockElement);
  });

  it('要素が存在しない場合、IntersectionObserverを初期化しない', () => {
    // テスト用のコンポーネント - refがnullのケース
    const TestComponent = () => {
      const mockRef = useRef<HTMLDivElement>(null);
      const mockCallback = jest.fn();

      useIntersectionObserver(mockRef, mockCallback);

      return <div data-testid="test-element" />;
    };

    render(<TestComponent />);

    // observeが呼ばれていないことを確認
    expect(mockObserve).not.toHaveBeenCalled();
    // IntersectionObserverが初期化されていないことを確認
    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });

  it('アンマウント時にIntersectionObserverを切断する', () => {
    // モックDOM要素を作成
    const mockElement = document.createElement('div');
    
    // テスト用のコンポーネント
    const TestComponent = () => {
      const mockRef = useRef<HTMLDivElement>(null);
      const mockCallback = jest.fn();
      
      // useRefのcurrentを手動で設定
      Object.defineProperty(mockRef, 'current', {
        value: mockElement,
        writable: true
      });

      useIntersectionObserver(mockRef, mockCallback);

      return <div data-testid="test-element" />;
    };

    const { unmount } = render(<TestComponent />);

    // コンポーネントをアンマウント
    act(() => {
      unmount();
    });

    // disconnectが呼ばれたことを確認
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('依存配列の値が変更された場合、IntersectionObserverを再初期化する', () => {
    // モックDOM要素を作成
    const mockElement = document.createElement('div');
    
    // テスト用のコンポーネント
    function TestComponent({ threshold }: { threshold: number }) {
      const mockRef = useRef<HTMLDivElement>(null);
      const mockCallback = jest.fn();
      
      // useRefのcurrentを手動で設定
      Object.defineProperty(mockRef, 'current', {
        value: mockElement,
        writable: true
      });

      useIntersectionObserver(mockRef, mockCallback, { threshold });

      return <div data-testid="test-element" />;
    }

    const { rerender } = render(<TestComponent threshold={0} />);
    
    // 最初のレンダリングでobserveが呼ばれたことを確認
    expect(mockObserve).toHaveBeenCalledTimes(1);
    
    // モックをリセット
    mockObserve.mockClear();
    mockDisconnect.mockClear();

    // 依存配列の値を変更して再レンダリング
    act(() => {
      rerender(<TestComponent threshold={1} />);
    });

    // disconnectとobserveが呼ばれたことを確認
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });
});
