'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const adminNav = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/users', label: 'ユーザー管理' },
  { href: '/admin/statistics', label: '統計' },
  { href: '/admin/logs', label: 'ログ' },
];

export default function AdminSidebar() {
  const pathname = usePathname() || '';
  console.log("[admin/sidebar.tsx] 現在のパス:", pathname);

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col">
      <div className="font-bold text-xl px-6 py-4 border-b border-border">Admin</div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {adminNav.map((item) => {
          const isActive = 
            (item.href === '/admin' && pathname === '/admin') ||
            (item.href !== '/admin' && pathname && pathname.startsWith(item.href));
            
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded px-3 py-2 text-muted-foreground hover:bg-muted',
                isActive ? 'bg-muted font-medium' : ''
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
