import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { UserRole } from '@prisma/client';

console.log("=== [admin/page.tsx] SSR実行 ===");
console.log("imported Card:", Card);
console.log("imported prisma:", prisma);
console.log("imported UserRole:", UserRole);

export default async function AdminDashboard() {
  try {
    console.log("=== [admin/page.tsx] AdminDashboard SSR実行 ===");
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/signin');
    }

    // 管理者権限チェック
    console.log("[admin/page.tsx] 管理者権限チェック開始 - ユーザーID:", session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    console.log("[admin/page.tsx] 取得したユーザー情報:", user);
    
    if (!user || user.role !== UserRole.ADMIN) {
      console.log("[admin/page.tsx] 管理者権限なし - /translateにリダイレクト");
      redirect('/translate');
    }
    
    console.log("[admin/page.tsx] 管理者権限確認OK");

    // 統計情報の取得
    const userCount = await prisma.user.count();
    const translationCount = await prisma.translationHistory.count();
    const activeUsersThisMonth = await prisma.user.count({
      where: {
        ActivityLog: {
          some: {
            createdAt: {
              gte: new Date(new Date().setDate(1)), // 今月の1日以降
            },
          },
        },
      },
    });

    // 最近のアクティビティログ
    const recentLogs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>ユーザー数</CardTitle>
              <CardDescription>登録済みユーザー総数</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{userCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>翻訳数</CardTitle>
              <CardDescription>実行された翻訳の総数</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{translationCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>アクティブユーザー</CardTitle>
              <CardDescription>今月のアクティブユーザー数</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{activeUsersThisMonth}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>管理メニュー</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="flex flex-col space-y-2">
                <Link href="/admin/users" className="text-blue-600 hover:underline">
                  ユーザー管理
                </Link>
                <Link href="/admin/statistics" className="text-blue-600 hover:underline">
                  統計・分析
                </Link>
                <Link href="/admin/logs" className="text-blue-600 hover:underline">
                  アクティビティログ
                </Link>
              </nav>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近のアクティビティ</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recentLogs.map((log) => (
                  <li key={log.id} className="border-b pb-2">
                    <p className="text-sm text-gray-500">{new Date(log.createdAt).toLocaleString('ja-JP')}</p>
                    <p>
                      <span className="font-medium">{log.user.name || log.user.email}</span>: {log.description}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[admin/page.tsx] SSR/ビルド時エラー:', error);
    throw error;
  }
}
