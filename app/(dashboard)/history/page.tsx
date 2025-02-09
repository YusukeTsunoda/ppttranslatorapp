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

export default function HistoryPage() {
  // 仮のデータ
  const history = [
    {
      id: 1,
      fileName: 'presentation.pptx',
      date: '2024-02-09',
      status: '完了',
      credits: 10,
    },
    {
      id: 2,
      fileName: 'meeting.pptx',
      date: '2024-02-08',
      status: '完了',
      credits: 15,
    },
  ];

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
            <div className="text-3xl font-bold text-gray-900">250</div>
            <p className="text-sm text-gray-500 mt-1">
              1回の翻訳につき約10-20クレジットを消費します
            </p>
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
            <div className="text-3xl font-bold text-gray-900">12</div>
            <p className="text-sm text-gray-500 mt-1">
              過去30日間の翻訳ファイル数
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>翻訳履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ファイル名</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">消費クレジット</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.fileName}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="bg-green-100 text-green-800">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
