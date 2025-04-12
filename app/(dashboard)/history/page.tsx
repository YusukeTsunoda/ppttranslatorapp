'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Eye, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatBytes } from '@/lib/utils';
import { useHistoryFilter } from '@/lib/hooks/useHistoryFilter';
import { HistoryFilter } from '@/components/history/HistoryFilter';
import { HistorySort } from '@/components/history/HistorySort';
import { Pagination } from '@/components/history/Pagination';

interface HistoryItem {
  id: string;
  fileName: string;
  createdAt: string;
  status: string;
  credits: number;
  creditsUsed: number;
  pageCount: number;
  fileSize: number;
  processingTime: number;
  thumbnailPath?: string;
  sourceLang: string;
  targetLang: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [credits, setCredits] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  
  const filter = useHistoryFilter();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        
        // クエリパラメータを構築
        const params = new URLSearchParams();
        params.set('page', filter.page.toString());
        params.set('limit', filter.limit.toString());
        params.set('sort', filter.sort);
        params.set('order', filter.order);
        
        if (filter.search) params.set('search', filter.search);
        if (filter.startDate) params.set('startDate', filter.startDate);
        if (filter.endDate) params.set('endDate', filter.endDate);
        if (filter.status) params.set('status', filter.status);
        if (filter.sourceLang) params.set('sourceLang', filter.sourceLang);
        if (filter.targetLang) params.set('targetLang', filter.targetLang);
        
        const response = await fetch(`/api/history?${params.toString()}`);

        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました');
        }

        const data = await response.json();
        console.log('履歴データ詳細:', {
          history: data.history,
          credits: data.credits,
          monthlyCount: data.monthlyCount,
          pagination: data.pagination,
          historyLength: data.history?.length || 0,
        });

        // データを整形
        const formattedHistory =
          data.history?.map((item: any) => ({
            id: item.id || 'unknown-id',
            fileName: item.fileName || 'unknown.pptx',
            createdAt: item.createdAt || new Date().toISOString(),
            status: item.status || '完了',
            credits: item.creditsUsed || 0,
            creditsUsed: item.creditsUsed || 0,
            pageCount: item.pageCount || 0,
            fileSize: item.fileSize || 0,
            processingTime: item.processingTime || 0,
            thumbnailPath: item.thumbnailPath,
            sourceLang: item.sourceLang,
            targetLang: item.targetLang,
          })) || [];

        console.log('整形後の履歴データ:', formattedHistory);

        setHistory(formattedHistory);
        setCredits(data.credits || 0);
        setMonthlyCount(data.monthlyCount || 0);
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('履歴取得エラー:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [
    filter.page,
    filter.limit,
    filter.sort,
    filter.order,
    filter.search,
    filter.startDate,
    filter.endDate,
    filter.status,
    filter.sourceLang,
    filter.targetLang,
  ]);

  const handleViewDetail = (id: string) => {
    router.push(`/history/${id}`);
  };

  const handleRetranslate = (id: string) => {
    router.push(`/translate?file=${id}`);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">履歴とクレジット</h1>
          <p className="mt-1 text-sm text-red-500">エラーが発生しました: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">履歴とクレジット</h1>
        <p className="mt-1 text-sm text-gray-500">翻訳履歴と利用可能なクレジットを確認できます。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-500" />
              利用可能なクレジット
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-900">{credits}</div>
                <p className="text-sm text-gray-500 mt-1">1回の翻訳につき約10-20クレジットを消費します</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-orange-500" />
              今月の翻訳数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-900">{monthlyCount}</div>
                <p className="text-sm text-gray-500 mt-1">過去30日間の翻訳ファイル数</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <CardTitle>翻訳履歴</CardTitle>
          <HistorySort filter={filter} />
        </CardHeader>
        <CardContent className="space-y-4">
          <HistoryFilter filter={filter} />
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div data-testid="history-list" className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ファイル名</TableHead>
                      <TableHead className="hidden md:table-cell">ページ数</TableHead>
                      <TableHead className="hidden md:table-cell">日付</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="hidden md:table-cell text-right">消費クレジット</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          翻訳履歴がありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((item) => (
                        <TableRow 
                          key={item.id}
                          data-testid="history-item"
                          onClick={() => handleViewDetail(item.id)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <TableCell>
                            <div className="font-medium">{item.fileName}</div>
                            <div className="text-sm text-gray-500 md:hidden">
                              {formatDate(new Date(item.createdAt))} · {item.pageCount}ページ
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{item.pageCount}ページ</TableCell>
                          <TableCell className="hidden md:table-cell">{formatDate(new Date(item.createdAt))}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === '完了' ? 'success' : item.status === 'エラー' ? 'destructive' : 'default'} className="whitespace-nowrap">
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">{item.creditsUsed}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(item.id)}
                                title="詳細を表示"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRetranslate(item.id)}
                                title="再翻訳"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <Pagination
                filter={filter}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
