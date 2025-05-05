import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const adminNav = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/users', label: 'ユーザー管理' },
  { href: '/admin/statistics', label: '統計' },
  { href: '/admin/logs', label: 'ログ' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore - カスタムプロパティにアクセス
  if (!session || session.user.role !== 'admin') {
    redirect('/'); // 権限外はトップへ
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="font-bold text-xl px-6 py-4 border-b">Admin</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded px-3 py-2 text-gray-700 hover:bg-gray-100',
                item.href === '/admin' && location.pathname === '/admin' ||
                item.href !== '/admin' && location.pathname.startsWith(item.href)
                  ? 'bg-gray-100 font-medium'
                  : ''
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
