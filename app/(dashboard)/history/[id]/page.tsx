'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HistoryDetail } from '@/components/history/HistoryDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface HistoryDetailPageProps {
  params: {
    id: string;
  };
}

export default function HistoryDetailPage({ params }: HistoryDetailPageProps) {
  const router = useRouter();
  const [historyData, setHistoryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoryDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/history/${params.id}`);
        
        if (!response.ok) {
          throw new Error('履歴詳細の取得に失敗しました');
        }
        
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        console.error('履歴詳細取得エラー:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoryDetail();
  }, [params.id]);

  const handleBack = () => {
    router.push('/history');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-[200px] w-full" />
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-8" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Button onClick={handleBack}>履歴一覧に戻る</Button>
      </div>
    );
  }

  return (
    <HistoryDetail
      historyId={params.id}
      historyData={historyData}
      onBack={handleBack}
    />
  );
}
