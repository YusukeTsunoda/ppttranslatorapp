import { act, renderHook } from '@testing-library/react';
import { useToast, toast, reducer } from '@/components/ui/use-toast';

// モックタイムアウトを設定
jest.useFakeTimers();

describe('useToast', () => {
  afterEach(() => {
    // テストごとにタイマーをクリア
    jest.clearAllTimers();
  });

  it('初期状態では空のトースト配列を返す', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  it('toast関数を呼び出してトーストを追加できる', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'テストタイトル',
        description: 'テスト説明',
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('テストタイトル');
    expect(result.current.toasts[0].description).toBe('テスト説明');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('dismiss関数を呼び出してトーストを閉じる', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;
    
    act(() => {
      const response = result.current.toast({
        title: 'テストタイトル',
      });
      toastId = response.id;
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);
    
    act(() => {
      result.current.dismiss(toastId);
    });
    
    // dismissが呼ばれると、openがfalseになる
    expect(result.current.toasts[0].open).toBe(false);
    
    // タイムアウト後にトーストが削除される
    act(() => {
      jest.runAllTimers();
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe('toast', () => {
  it('トーストを生成し、IDとメソッドを返す', () => {
    const result = toast({ title: 'テストトースト' });
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('dismiss');
    expect(result).toHaveProperty('update');
    expect(typeof result.id).toBe('string');
    expect(typeof result.dismiss).toBe('function');
    expect(typeof result.update).toBe('function');
  });
});

describe('reducer', () => {
  it('ADD_TOASTアクションでトーストを追加する', () => {
    const initialState = { toasts: [] };
    const newToast = { id: '1', title: 'テスト', open: true };
    
    const newState = reducer(initialState, {
      type: 'ADD_TOAST',
      toast: newToast,
    });
    
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0]).toEqual(newToast);
  });
  
  it('UPDATE_TOASTアクションでトーストを更新する', () => {
    const initialState = { toasts: [{ id: '1', title: '古いタイトル', open: true }] };
    
    const newState = reducer(initialState, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: '新しいタイトル' },
    });
    
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe('新しいタイトル');
    expect(newState.toasts[0].open).toBe(true); // 他のプロパティは保持される
  });
  
  it('DISMISS_TOASTアクションでトーストを閉じる', () => {
    const initialState = { toasts: [{ id: '1', title: 'テスト', open: true }] };
    
    const newState = reducer(initialState, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });
    
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].open).toBe(false);
  });
  
  it('REMOVE_TOASTアクションでトーストを削除する', () => {
    const initialState = { toasts: [{ id: '1', title: 'テスト', open: false }] };
    
    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });
    
    expect(newState.toasts).toHaveLength(0);
  });
  
  it('IDなしのREMOVE_TOASTアクションで全てのトーストを削除する', () => {
    const initialState = { 
      toasts: [
        { id: '1', title: 'テスト1', open: false },
        { id: '2', title: 'テスト2', open: false }
      ] 
    };
    
    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
    });
    
    expect(newState.toasts).toHaveLength(0);
  });
}); 