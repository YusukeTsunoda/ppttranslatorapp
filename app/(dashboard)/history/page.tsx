'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface HistoryItem {
  id: string;
  fileName: string;
  createdAt: string;
  status: string;
  credits: number;
  creditsUsed: number;
  pageCount: number;
}

export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [credits, setCredits] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/history');
        
        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました');
        }
        
        const data = await response.json();
        console.log('履歴データ詳細:', {
          history: data.history,
          credits: data.credits,
          monthlyCount: data.monthlyCount,
          historyLength: data.history?.length || 0
        });
        
        // データを整形
        const formattedHistory = data.history?.map((item: any) => ({
          id: item.id || 'unknown-id',
          fileName: item.fileName || 'unknown.pptx',
          createdAt: item.createdAt || new Date().toISOString(),
          status: item.status || '完了',
          credits: item.creditsUsed || 0,
          creditsUsed: item.creditsUsed || 0,
          pageCount: item.pageCount || 0,
        })) || [];
        
        console.log('整形後の履歴データ:', formattedHistory);
        
        setHistory(formattedHistory);
        setCredits(data.credits || 0);
        setMonthlyCount(data.monthlyCount || 0);
      } catch (err) {
        console.error('履歴取得エラー:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">履歴とクレジット</h1>
          <p className="mt-1 text-sm text-red-500">
            エラーが発生しました: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">履歴とクレジット</h1>
        <p className="mt-1 text-sm text-gray-500">
          翻訳履歴と利用可能なクレジットを確認できます。
        </p>
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
                <p className="text-sm text-gray-500 mt-1">
                  1回の翻訳につき約10-20クレジットを消費します
                </p>
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
                <p className="text-sm text-gray-500 mt-1">
                  過去30日間の翻訳ファイル数
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>翻訳履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ファイル名</TableHead>
                  <TableHead>ページ数</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">消費クレジット</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      翻訳履歴がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.fileName}</TableCell>
                      <TableCell>{item.pageCount}ページ</TableCell>
                      <TableCell>{formatDate(new Date(item.createdAt))}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.creditsUsed}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
