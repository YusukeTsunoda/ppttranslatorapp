'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditsDisplay } from '@/components/credits/CreditsDisplay';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Eye, RefreshCw } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatBytes } from '@/lib/utils';
import { useHistoryFilter } from '@/lib/hooks/useHistoryFilter';
import { HistoryFilter } from '@/components/history/HistoryFilter';
import { HistorySort } from '@/components/history/HistorySort';
import { Pagination } from '@/components/history/Pagination';
import useSWR from 'swr';
import { TranslationStatus, Language } from '@prisma/client';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('履歴の取得に失敗しました');
  }
  return res.json();
});

interface HistoryItem {
  id: string;
  originalFileName: string;
  createdAt: string;
  status: TranslationStatus;
  creditsUsed: number;
  pageCount: number;
  fileSize: number | null;
  processingTime: number | null;
  thumbnailPath?: string;
  sourceLang: Language;
  targetLang: Language;
  file: { originalName: string };
}

interface ApiResponse {
  data: HistoryItem[];
  total: number;
  page: number;
  limit: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const filter = useHistoryFilter();

  const apiUrl = useMemo(() => {
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
    return `/api/history?${params.toString()}`;
  }, [filter]);

  const { data: apiResponse, error, isLoading } = useSWR<ApiResponse>(apiUrl, fetcher);
  const { data: creditsData, error: creditsError, isLoading: creditsLoading } = useSWR<{credits: number}>('/api/user/credits', fetcher);

  const pagination: PaginationInfo | null = useMemo(() => {
    if (!apiResponse) return null;
    return {
      total: apiResponse.total,
      page: apiResponse.page,
      limit: apiResponse.limit,
      totalPages: Math.ceil(apiResponse.total / apiResponse.limit),
    };
  }, [apiResponse]);

  const history: HistoryItem[] = apiResponse?.data || [];

  const handleViewDetail = (id: string) => {
    router.push(`/history/${id}`);
  };

  const handleRetranslate = (id: string) => {
    router.push(`/translate?file=${id}`);
  };

  const getBadgeVariant = (status: TranslationStatus): 'success' | 'destructive' | 'secondary' | 'default' => {
    switch (status) {
      case TranslationStatus.COMPLETED:
        return 'success';
      case TranslationStatus.FAILED:
        return 'destructive';
      case TranslationStatus.PROCESSING:
        return 'secondary';
      default:
        return 'default';
    }
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
        <h1 className="text-2xl font-semibold text-foreground">履歴とクレジット</h1>
        <p className="mt-1 text-sm text-muted-foreground">翻訳履歴と利用可能なクレジットを確認できます。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CreditsDisplay />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              今月の翻訳数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold text-foreground">0</div>
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
                            <div className="font-medium">{item.originalFileName}</div>
                            <div className="text-sm text-gray-500 md:hidden">
                              {formatDate(new Date(item.createdAt))} · {item.pageCount}ページ
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{item.pageCount}ページ</TableCell>
                          <TableCell className="hidden md:table-cell">{formatDate(new Date(item.createdAt))}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(item.status)} className="whitespace-nowrap">
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
              
              {pagination && (
                <Pagination
                  filter={filter}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
