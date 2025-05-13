'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('クレジット情報の取得に失敗しました');
  }
  return res.json();
});

interface CreditsDisplayProps {
  className?: string;
  showCard?: boolean;
}

export function CreditsDisplay({ className = '', showCard = true }: CreditsDisplayProps) {
  const { data, error, isLoading } = useSWR<{ credits: number }>('/api/user/credits', fetcher, {
    refreshInterval: 10000, // 10秒ごとに更新
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const credits = data?.credits ?? 0;
  
  const content = (
    <>
      {isLoading ? (
        <Skeleton className="h-10 w-20" />
      ) : error ? (
        <div className="text-red-500">エラー</div>
      ) : (
        <div className="text-3xl font-bold text-foreground">{credits}</div>
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5 text-primary" />
          利用可能なクレジット
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
