'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
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
  User,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
      console.log('Header: ログアウト成功');
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Header: ログアウトエラー:', error);
    }
  }, [setUser, router]);

  useEffect(() => {
    if (!user) {
      console.log('Header: ユーザーが見つかりません - ログインページへリダイレクト');
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user) {
    console.log('Header: ローディング表示を返します');
    return (
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
          <div className="animate-pulse h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/translate" className="flex items-center">
          <CircleIcon className="h-6 w-6 text-orange-500" />
          <span className="ml-2 text-lg font-medium text-gray-900">PPT翻訳アプリ</span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link
            href="/pricing"
            className="text-sm text-gray-600 hover:text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            料金プラン
          </Link>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage alt={user.name || ''} />
                  <AvatarFallback>
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <Link href="/profile" passHref legacyBehavior>
                <DropdownMenuItem className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>マイページ</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="cursor-pointer flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                onSelect={handleSignOut}
                data-testid="logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const navigation = [
    { name: '翻訳', href: '/translate', icon: Settings },
    { name: '履歴', href: '/history', icon: History },
    { name: 'アクティビティ', href: '/activity', icon: Activity },
    { name: 'プロフィール', href: '/profile', icon: User },
    { name: '設定', href: '/settings', icon: Settings },
    { name: 'API連携', href: '/integrations', icon: LinkIcon },
  ];

  return (
    <div className="relative h-full">
      <button
        onClick={handleToggle}
        className="absolute -right-4 top-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-50 z-50 cursor-pointer border border-gray-200"
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        )}
      </button>
      <nav className={cn(
        "flex flex-col space-y-1 p-4 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              passHref
              legacyBehavior
            >
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative",
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !isExpanded && "justify-center"
                )}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isExpanded ? "mr-3" : "mr-0",
                    isActive ? "text-orange-600" : "text-gray-400"
                  )}
                  aria-hidden="true"
                />
                {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      console.log('DashboardLayout: 初期化');
      setIsInitialized(true);
    }
    return () => {
      console.log('DashboardLayout: クリーンアップ');
      setIsInitialized(false);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 h-full">
          <aside className="bg-white shadow-sm rounded-lg h-full">
            <Sidebar />
          </aside>
          <main className="flex-1 bg-white shadow-sm rounded-lg p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
