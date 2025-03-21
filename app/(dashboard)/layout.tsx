'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from 'next-auth/react';
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
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut({
        redirect: true,
        callbackUrl: '/signin',
      });
      toast({
        title: 'ログアウト成功',
        description: 'ログアウトしました',
      });
    } catch (error) {
      console.error('ログアウトエラー:', error);
      toast({
        title: 'エラー',
        description: 'ログアウトに失敗しました',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('Header: 未認証状態 - ログインページへリダイレクト');
      toast({
        title: 'セッションエラー',
        description: '再度ログインしてください',
        variant: 'destructive',
      });
      router.push('/signin');
      return;
    }

    if (status === 'loading') {
      console.log('Header: セッション読み込み中');
      return;
    }

    if (!session?.user) {
      console.log('Header: ユーザー情報なし - ログインページへリダイレクト');
      router.push('/signin');
      return;
    }
  }, [status, session, router]);

  if (status === 'loading' || !session?.user) {
    return (
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <LoadingSpinner text="読み込み中..." />
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
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage alt={session.user.name || ''} />
                  <AvatarFallback>{session.user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  プロフィール
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  設定
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/activity">
                  <Activity className="mr-2 h-4 w-4" />
                  アクティビティ
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} data-testid="logout-button">
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
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
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 管理者権限の確認
    const checkAdminRole = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/user/role');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin);
          }
        } catch (error) {
          console.error('管理者権限の確認に失敗しました:', error);
        }
      }
    };

    checkAdminRole();
  }, [session]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const navigation = [
    { name: '翻訳', href: '/translate', icon: Settings },
    { name: '履歴', href: '/history', icon: History },
    { name: 'アクティビティ', href: '/activity', icon: Activity },
    { name: 'プロフィール', href: '/profile', icon: User },
    { name: '設定', href: '/settings', icon: Settings },
    { name: 'API連携', href: '/integrations', icon: LinkIcon },
    // 管理者のみ表示
    ...(isAdmin ? [{ name: '管理者', href: '/admin', icon: ShieldAlert }] : []),
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
      <nav
        className={cn(
          'flex flex-col space-y-1 p-4 transition-all duration-300 ease-in-out',
          isExpanded ? 'w-64' : 'w-16',
        )}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} passHref legacyBehavior>
              <a
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative',
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  !isExpanded && 'justify-center',
                )}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isExpanded ? 'mr-3' : 'mr-0',
                    isActive ? 'text-orange-600' : 'text-gray-400',
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
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setError('セッションが無効です。再度ログインしてください。');
    } else {
      setError(null);
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="セッション確認中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <ErrorMessage message={error} variant="destructive" className="mb-4" />
        ) : (
          <div className="flex gap-8 h-full">
            <aside className="bg-white shadow-sm rounded-lg h-full">
              <Sidebar />
            </aside>
            <main className="flex-1 bg-white shadow-sm rounded-lg p-6">{children}</main>
          </div>
        )}
      </div>
    </div>
  );
}
