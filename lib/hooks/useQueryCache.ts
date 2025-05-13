import { useState, useCallback, useEffect } from 'react';

interface CacheOptions {
  expirationTime?: number; // キャッシュの有効期限（ミリ秒）
  staleWhileRevalidate?: boolean; // 期限切れのキャッシュを使用しながら再検証するかどうか
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

// グローバルなキャッシュストレージ
const globalCache = new Map<string, CacheEntry<any>>();

// デフォルトの有効期限（5分）
const DEFAULT_EXPIRATION_TIME = 5 * 60 * 1000;

/**
 * APIクエリ結果をキャッシュするカスタムフック
 */
export function useQueryCache<T = any, P = any>(
  queryFn: (params: P) => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // オプションのデフォルト値設定
  const { 
    expirationTime = DEFAULT_EXPIRATION_TIME, 
    staleWhileRevalidate = true 
  } = options;

  // キャッシュキーの生成関数
  const generateCacheKey = (params: P): string => {
    return JSON.stringify(params);
  };

  // キャッシュの有効性をチェック
  const isCacheValid = (entry: CacheEntry<T>): boolean => {
    return Date.now() - entry.timestamp < expirationTime;
  };

  // クエリを実行する関数
  const executeQuery = useCallback(
    async (params: P, cacheKey: string): Promise<T> => {
      try {
        setIsLoading(true);

        // キャッシュからデータを取得
        const cachedEntry = globalCache.get(cacheKey) as CacheEntry<T> | undefined;

        // キャッシュが有効な場合はそれを返す
        if (cachedEntry && isCacheValid(cachedEntry)) {
          setData(cachedEntry.data);
          setIsLoading(false);
          return cachedEntry.data;
        }

        // 期限切れだが、staleWhileRevalidateが有効な場合は古いデータを返しつつ更新
        if (cachedEntry && staleWhileRevalidate) {
          setData(cachedEntry.data);
          // isStaleフラグを立てる
          globalCache.set(cacheKey, { ...cachedEntry, isStale: true });
        }

        // APIコールを実行
        const result = await queryFn(params);

        // 新しい結果をキャッシュに保存
        globalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          isStale: false,
        });

        setData(result);
        setError(null);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [queryFn, expirationTime, staleWhileRevalidate]
  );

  // クエリを実行する公開関数
  const query = useCallback(
    async (params: P): Promise<T> => {
      const cacheKey = generateCacheKey(params);
      return executeQuery(params, cacheKey);
    },
    [executeQuery]
  );

  // キャッシュを無効化する関数
  const invalidateCache = useCallback(
    (params?: P) => {
      if (params) {
        // 特定のクエリのキャッシュを無効化
        const cacheKey = generateCacheKey(params);
        globalCache.delete(cacheKey);
      } else {
        // 全てのキャッシュを無効化（このフックで使用しているもののみ）
        for (const [key] of globalCache) {
          globalCache.delete(key);
        }
      }
    },
    []
  );

  // キャッシュをプリフェッチする関数
  const prefetchQuery = useCallback(
    async (params: P): Promise<void> => {
      const cacheKey = generateCacheKey(params);
      
      // 既にキャッシュが有効な場合は何もしない
      const cachedEntry = globalCache.get(cacheKey) as CacheEntry<T> | undefined;
      if (cachedEntry && isCacheValid(cachedEntry)) {
        return;
      }
      
      try {
        // キャッシュを更新
        const result = await queryFn(params);
        globalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          isStale: false,
        });
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    },
    [queryFn]
  );

  return {
    data,
    isLoading,
    error,
    query,
    invalidateCache,
    prefetchQuery,
  };
} 