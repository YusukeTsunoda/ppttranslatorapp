'use client';

import Link from  'next/link';
import { use, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/lib/auth';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  Settings,
  Link as LinkIcon,
  Bell,
  User
} from 'lucide-react';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { userPromise } = useUser();
  const user = use(userPromise);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <CircleIcon className="h-6 w-6 text-orange-500" />
          <span className="ml-2 text-lg font-medium text-gray-900">PPT翻訳アプリ</span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link
            href="/pricing"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            料金プラン
          </Link>
          {user ? (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger>
                <Avatar className="cursor-pointer size-8">
                  <AvatarImage alt={user.name || ''} />
                  <AvatarFallback>
                    {user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <Link href="/dashboard" className="flex w-full items-center">
                    <Home className="mr-2 h-4 w-4" />
                    <span>マイページ</span>
                  </Link>
                </DropdownMenuItem>
                <form action={handleSignOut} className="w-full">
                  <button type="submit" className="flex w-full">
                    <DropdownMenuItem className="w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>ログアウト</span>
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-md"
            >
              <Link href="/sign-up">新規登録</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'プロフィール', href: '/dashboard/profile', icon: User },
    { name: '履歴とクレジット', href: '/dashboard/history', icon: History },
    { name: '翻訳設定', href: '/dashboard/settings', icon: Settings },
    { name: 'API連携', href: '/dashboard/integrations', icon: LinkIcon },
    { name: 'お知らせ', href: '/dashboard/notifications', icon: Bell },
  ];

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`${
              isActive
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600 hover:bg-gray-50'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
          >
            <item.icon
              className={`${
                isActive ? 'text-orange-600' : 'text-gray-400'
              } mr-3 flex-shrink-0 h-5 w-5`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <div className="w-64 bg-white shadow-sm rounded-lg">
            <Sidebar />
          </div>
          <main className="flex-1 bg-white shadow-sm rounded-lg p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
