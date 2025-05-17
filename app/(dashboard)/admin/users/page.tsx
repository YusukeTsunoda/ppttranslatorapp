// 動的レンダリングを明示的に指定
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import UserCreditsTable from './components/UserCreditsTable';

console.log("=== [admin/users/page.tsx] SSR実行 ===");
console.log("imported Card:", Card);
console.log("imported prisma:", prisma);
console.log("imported UserRole:", UserRole);

export default async function UsersPage() {
  try {
    console.log("=== [admin/users/page.tsx] UsersPage SSR実行 ===");
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/signin');
    }

    // 管理者権限チェック
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      redirect('/dashboard');
    }

    // ユーザー一覧を取得
    const dbUsers = await prisma.user.findMany({
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
            TranslationHistory: true,
          },
        },
      },
    });
    
    // Date型を文字列に変換してクライアントコンポーネントに渡す
    const users = dbUsers.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    }));

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
            {/* クライアントコンポーネントを使用してユーザー一覧とクレジット編集機能を表示 */}
            <UserCreditsTable initialUsers={users} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('[admin/users/page.tsx] SSR/ビルド時エラー:', error);
    throw error;
  }
}
