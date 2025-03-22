import { useToast, toast, reducer } from '@/components/ui/use-toast';
import { renderHook, act } from '@testing-library/react';

// モックタイムアウトを設定
jest.useFakeTimers();

describe('useToast', () => {
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

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('IDなしでdismiss関数を呼び出すと全てのトーストを閉じる', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'トースト1' });
      result.current.toast({ title: 'トースト2' });
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.every(t => t.open)).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts.every(t => !t.open)).toBe(true);
  });
});

// グローバルトースト関数のテスト
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

// リデューサーのテスト
describe('reducer', () => {
  it('ADD_TOASTアクションでトーストを追加する', () => {
    const initialState = { toasts: [] };
    const newToast = { id: '1', title: 'テストトースト', open: true };
    
    const newState = reducer(initialState, {
      type: 'ADD_TOAST',
      toast: newToast,
    });

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0]).toEqual(newToast);
  });

  it('UPDATE_TOASTアクションでトーストを更新する', () => {
    const initialState = { toasts: [{ id: '1', title: '元のタイトル', open: true }] };
    
    const newState = reducer(initialState, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: '新しいタイトル' },
    });

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe('新しいタイトル');
    expect(newState.toasts[0].open).toBe(true); // 他のプロパティは保持される
  });

  it('DISMISS_TOASTアクションでトーストを閉じる', () => {
    const initialState = { toasts: [{ id: '1', title: 'タイトル', open: true }] };
    
    const newState = reducer(initialState, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].open).toBe(false);
  });

  it('REMOVE_TOASTアクションでトーストを削除する', () => {
    const initialState = { toasts: [{ id: '1', title: 'タイトル', open: false }] };
    
    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(newState.toasts).toHaveLength(0);
  });

  it('IDなしのREMOVE_TOASTアクションで全てのトーストを削除する', () => {
    const initialState = { 
      toasts: [
        { id: '1', title: 'タイトル1', open: false },
        { id: '2', title: 'タイトル2', open: false }
      ] 
    };
    
    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
    });

    expect(newState.toasts).toHaveLength(0);
  });
});
