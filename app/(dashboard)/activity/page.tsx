'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

export default function ActivityPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // アクティビティログを取得する関数
  const fetchLogs = useCallback(async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/activity?page=${pageNum}&limit=10`);

      if (!response.ok) {
        throw new Error('アクティビティログの取得に失敗しました');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setLogs(data.logs || []);
      } else {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      }

      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      console.error('アクティビティログ取得エラー:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    if (session?.user) {
      fetchLogs(1);
    }
  }, [session, fetchLogs]);

  // 無限スクロール用のIntersection Observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, isLoadingMore, hasMore]);

  // ページが変わったら追加データを取得
  useEffect(() => {
    if (page > 1) {
      fetchLogs(page);
    }
  }, [page, fetchLogs]);

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">アクティビティログ</h1>
        <div className="p-4 bg-red-50 text-red-800 rounded-md">エラーが発生しました: {error}</div>
      </div>
    );
  }

  // アクティビティタイプに応じたバッジの色を返す関数
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'translation':
        return 'bg-blue-100 text-blue-800';
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'signup':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">アクティビティログ</h1>
      <Card>
        <CardHeader>
          <CardTitle>最近のアクティビティ</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">アクティビティログがありません</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className={getBadgeVariant(log.type)}>
                        {log.type === 'translation'
                          ? '翻訳'
                          : log.type === 'login'
                            ? 'ログイン'
                            : log.type === 'signup'
                              ? '登録'
                              : log.type}
                      </Badge>
                      <p className="mt-2">{log.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(new Date(log.createdAt))}</span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
                  {isLoadingMore ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <span className="text-sm text-gray-500">スクロールして更に読み込む</span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
