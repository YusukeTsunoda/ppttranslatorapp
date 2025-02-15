'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { useUser } from '@/lib/hooks/useUser';
import { ActivityLogList } from '@/components/activity/ActivityLogList';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';

export default function ActivityPage() {
  const { user } = useUser();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    logs,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore
  } = useActivityLogs(user?.teamId);

  const onIntersect = useCallback(async () => {
    if (hasMore && !isLoadingMore) {
      await loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  useIntersectionObserver(loadMoreRef, onIntersect);

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage
          title="エラーが発生しました"
          message={error}
        />
      </div>
    );
  }

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
          ) : (
            <>
              <ActivityLogList logs={logs} />
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="h-16 flex items-center justify-center"
                >
                  {isLoadingMore ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <span className="text-sm text-gray-500">
                      スクロールして更に読み込む
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 