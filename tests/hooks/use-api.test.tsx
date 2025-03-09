import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useApiMutation } from '@/lib/hooks/use-api';

// fetchのモック
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('APIフック', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useApiMutation', () => {
    it('ミューテーションを正しく実行する', async () => {
      const mockData = { id: 1, name: '更新されたデータ' };
      const updateData = { name: '更新されたデータ' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useApiMutation('/api/test'));

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.mutate(updateData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(updateData),
        credentials: 'include',
      }));
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeUndefined();
    });

    it('ミューテーションエラーを正しく処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'サーバーエラー' }),
      });

      const { result } = renderHook(() => useApiMutation('/api/test'));

      await act(async () => {
        await result.current.mutate({ name: 'テスト' });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeDefined();
    });

    it('カスタムメソッドを使用できる', async () => {
      const mockData = { id: 1, name: 'テストデータ' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useApiMutation('/api/test', { method: 'PUT' }));

      await act(async () => {
        await result.current.mutate({ name: 'テスト' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name: 'テスト' }),
        credentials: 'include',
      }));
    });
  });
}); 