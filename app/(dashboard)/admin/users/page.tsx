import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/signin');
  }
  
  // 管理者権限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });
  
  if (!user || user.role !== UserRole.ADMIN) {
    redirect('/dashboard');
  }
  
  // ユーザー一覧を取得
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      credits: true,
      _count: {
        select: {
          File: true,
          TranslationHistory: true
        }
      }
    }
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ユーザー管理</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← 管理者ダッシュボードに戻る
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead>クレジット</TableHead>
                <TableHead>ファイル数</TableHead>
                <TableHead>翻訳数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name || '未設定'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role === UserRole.ADMIN ? '管理者' : 'ユーザー'}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                  <TableCell>{user.credits}</TableCell>
                  <TableCell>{user._count.File}</TableCell>
                  <TableCell>{user._count.TranslationHistory}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 