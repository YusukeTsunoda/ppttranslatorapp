import useSWR from 'swr';
import { getUserActivityLogs } from '@/lib/utils/activity-logger';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { useState, useEffect } from 'react';

const CACHE_KEY = 'activity-logs';
const STALE_TIME = 30000; // 30秒

export function useActivityLogs(userId?: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const { data, mutate } = useSWR(
    userId ? [CACHE_KEY, userId] : null,
    async ([_, id]) => {
      try {
        return await getUserActivityLogs(id);
      } catch (err) {
        throw getErrorMessage(err);
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: STALE_TIME,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (data) {
      setLogs(data.logs);
      setError(null);
      setIsLoading(false);
      setHasMore(true);
      setIsLoadingMore(false);
    }
  }, [data]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    // 追加データ取得処理
    // 例: 新しいログがある場合は setHasMore(true) 、ないなら setHasMore(false)
    setIsLoadingMore(false);
  };

  return {
    logs,
    error,
    isLoading,
    mutate,
    hasMore,
    loadMore,
    isLoadingMore,
  };
} 