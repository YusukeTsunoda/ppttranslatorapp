import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { getUserActivityLogs } from '@/lib/utils/activity-logger';
import { ActivityAction } from '@/lib/utils/activity-logger';
import { expect } from '@jest/globals';

// アクティビティロガーのモック
jest.mock('@/lib/utils/activity-logger', () => ({
  getUserActivityLogs: jest.fn(),
  ActivityAction: {
    sign_in: 'sign_in',
    file_upload: 'file_upload',
    translation: 'translation'
  }
}));

// SWRのモック
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn()
}));

import useSWR from 'swr';

describe('useActivityLogs', () => {
  const userId = 'test-user-123';
  const mockLogs = [
    { id: '1', userId, action: ActivityAction.sign_in, createdAt: new Date() },
    { id: '2', userId, action: ActivityAction.file_upload, createdAt: new Date() }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // SWRのモック実装
    (useSWR as jest.Mock).mockImplementation((key, fetcher, options) => {
      // keyがnullの場合はデータがない状態を再現
      if (key === null) {
        return {
          data: undefined,
          mutate: jest.fn()
        };
      }
      
      return {
        data: {
          logs: mockLogs,
          nextCursor: undefined
        },
        mutate: jest.fn()
      };
    });
    
    // getUserActivityLogsのモック実装
    (getUserActivityLogs as jest.Mock).mockResolvedValue({
      logs: mockLogs,
      nextCursor: undefined
    });
  });

  it('ユーザーIDが提供された場合、アクティビティログを取得する', async () => {
    const { result } = renderHook(() => useActivityLogs(userId));
    
    // useEffectが実行されるのを待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 結果の検証
    expect(result.current.logs).toEqual(mockLogs);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(true);
  });

  it('ユーザーIDがない場合、データを取得しない', () => {
    const { result } = renderHook(() => useActivityLogs(undefined));
    
    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
    expect(result.current.logs).toEqual([]);
  });

  it('loadMore関数が正しく動作する', async () => {
    const { result } = renderHook(() => useActivityLogs(userId));
    
    // useEffectが実行されるのを待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // loadMore関数を呼び出す
    await act(async () => {
      await result.current.loadMore();
    });
    
    // isLoadingMoreがfalseに戻ることを確認
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('mutate関数が利用可能である', async () => {
    const { result } = renderHook(() => useActivityLogs(userId));
    
    // useEffectが実行されるのを待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});
