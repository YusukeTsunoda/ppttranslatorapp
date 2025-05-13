import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import AdminSidebar from './sidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("[admin/layout.tsx] AdminLayout実行開始");
  
  // セッション確認
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    console.log("[admin/layout.tsx] セッションなし - サインインページへリダイレクト");
    redirect('/signin');
  }
  
  // 管理者権限確認
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  console.log(`[admin/layout.tsx] ユーザーロール: ${user?.role}`);
  
  if (!user || user.role !== 'ADMIN') {
    console.log("[admin/layout.tsx] 管理者権限なし - 翻訳ページへリダイレクト");
    redirect('/translate');
  }
  
  console.log("[admin/layout.tsx] 管理者権限確認OK");

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 bg-background">
        {children}
      </main>
    </div>
  );
}
