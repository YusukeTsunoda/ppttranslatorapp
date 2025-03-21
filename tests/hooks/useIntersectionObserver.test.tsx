import React from 'react';
import { renderHook } from '@testing-library/react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';

// IntersectionObserverとそのコールバック型の定義
type IntersectionObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

// IntersectionObserverのモック
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockIntersectionObserver = jest.fn<
  IntersectionObserver,
  [IntersectionObserverCallback, IntersectionObserverInit?]
>(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  unobserve: jest.fn(),
  takeRecords: jest.fn(() => []),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// グローバルにIntersectionObserverをモック
global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('要素が存在する場合、IntersectionObserverを初期化して監視する', () => {
    // モック要素の作成
    const mockRef = { current: document.createElement('div') };
    const mockCallback = jest.fn();
    const mockOptions = { rootMargin: '10px' };

    // フックをレンダリング
    renderHook(() => useIntersectionObserver(mockRef as React.RefObject<Element>, mockCallback, mockOptions));

    // IntersectionObserverが正しく初期化されたか確認
    expect(mockIntersectionObserver).toHaveBeenCalledWith(mockCallback, mockOptions);

    // 要素が監視対象に追加されたか確認
    expect(mockObserve).toHaveBeenCalledWith(mockRef.current);
  });

  it('要素が存在しない場合、IntersectionObserverを初期化しない', () => {
    // nullの参照を作成
    const mockRef = { current: null };
    const mockCallback = jest.fn();

    // フックをレンダリング
    renderHook(() => useIntersectionObserver(mockRef as React.RefObject<Element>, mockCallback));

    // IntersectionObserverが初期化されていないことを確認
    expect(mockIntersectionObserver).not.toHaveBeenCalled();
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('アンマウント時にIntersectionObserverを切断する', () => {
    // モック要素の作成
    const mockRef = { current: document.createElement('div') };
    const mockCallback = jest.fn();

    // フックをレンダリングして解除
    const { unmount } = renderHook(() => useIntersectionObserver(mockRef as React.RefObject<Element>, mockCallback));
    unmount();

    // disconnectが呼ばれたことを確認
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('依存配列の値が変更された場合、IntersectionObserverを再初期化する', () => {
    // モック要素の作成
    const mockRef = { current: document.createElement('div') };
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    // 初回レンダリング
    const { rerender } = renderHook(
      ({ callback }) => useIntersectionObserver(mockRef as React.RefObject<Element>, callback),
      { initialProps: { callback: mockCallback1 } },
    );

    // 再レンダリング（コールバックを変更）
    rerender({ callback: mockCallback2 });

    // IntersectionObserverが2回初期化されたことを確認
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(2);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledTimes(2);
  });
});
