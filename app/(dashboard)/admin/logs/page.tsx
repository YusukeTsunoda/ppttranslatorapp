import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { UserRole } from '@prisma/client';

export default async function LogsPage() {
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

  // アクティビティログを取得
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // 最新100件を取得
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">アクティビティログ</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← 管理者ダッシュボードに戻る
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>システムアクティビティ（最新100件）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">日時</th>
                  <th className="text-left p-2">ユーザー</th>
                  <th className="text-left p-2">タイプ</th>
                  <th className="text-left p-2">詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ja-JP')}</td>
                    <td className="p-2">{log.user.name || log.user.email}</td>
                    <td className="p-2">{log.type}</td>
                    <td className="p-2">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
