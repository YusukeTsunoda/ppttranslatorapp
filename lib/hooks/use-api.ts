import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { useState } from 'react';
import { handleClientError } from '@/lib/utils/error-handler';

// フェッチャー関数の型
type Fetcher<Data> = (...args: any[]) => Promise<Data>;

// APIリクエストの状態
interface ApiState<Data, Error> {
  data: Data | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: SWRResponse<Data, Error>['mutate'];
}

// APIリクエストのオプション
interface ApiOptions<Data, Error> extends SWRConfiguration<Data, Error> {
  onSuccess?: (data: Data) => void;
  onError?: (error: Error) => void;
  errorHandler?: (error: unknown) => void;
}

/**
 * SWRを使用したAPIフック
 * @param key キャッシュキー
 * @param fetcher フェッチャー関数
 * @param options オプション
 */
export function useApi<Data = any, Error = any>(
  key: string | null,
  fetcher: Fetcher<Data>,
  options: ApiOptions<Data, Error> = {},
): ApiState<Data, Error> {
  const { onSuccess, onError, errorHandler = handleClientError, ...swrOptions } = options;

  // SWRフックを使用
  const { data, error, isLoading, isValidating, mutate } = useSWR<Data, Error>(key, fetcher, {
    ...swrOptions,
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      // エラーハンドリング
      errorHandler(error);
      onError?.(error);
    },
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * APIリクエストを送信するフック
 * @param url エンドポイントURL
 * @param options オプション
 */
export function useApiRequest<Data = any, Error = any>(
  url: string,
  options: ApiOptions<Data, Error> & {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {},
): ApiState<Data, Error> {
  const { method = 'GET', body, headers, ...apiOptions } = options;

  // キャッシュキーの生成
  const cacheKey = method === 'GET' ? url : null;

  // フェッチャー関数
  const fetcher = async (): Promise<Data> => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  };

  return useApi<Data, Error>(cacheKey, fetcher, apiOptions);
}

/**
 * APIミューテーションを実行するフック
 * @param url エンドポイントURL
 * @param options オプション
 */
export function useApiMutation<Data = any, Error = any>(
  url: string,
  options: Omit<ApiOptions<Data, Error>, 'onSuccess' | 'onError'> & {
    method?: 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
  } = {},
) {
  const { method = 'POST', headers, errorHandler = handleClientError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);

  // ミューテーション関数
  const mutate = async (
    body: any,
    callbacks?: {
      onSuccess?: (data: Data) => void;
      onError?: (error: Error) => void;
    },
  ): Promise<Data | undefined> => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      setData(responseData);
      callbacks?.onSuccess?.(responseData);
      return responseData;
    } catch (err) {
      const typedError = err as Error;
      setError(typedError as any);
      errorHandler(err);
      callbacks?.onError?.(typedError as any);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    isLoading,
    error,
    data,
  };
}

/**
 * ユーザープロファイルを取得するフック
 */
export function useUserProfile() {
  return useApi('/api/profile', async () => {
    const response = await fetch('/api/profile', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  });
}

/**
 * ユーザープロファイルを更新するフック
 */
export function useUpdateProfile() {
  return useApiMutation('/api/profile/update');
}

/**
 * 翻訳リクエストを送信するフック
 */
export function useTranslate() {
  return useApiMutation('/api/translate');
}
