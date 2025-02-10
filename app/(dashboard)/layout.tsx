'use client';

import Link from 'next/link';
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
import { cn } from '@/lib/utils';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { userPromise } = useUser();
  const user = use(userPromise);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

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
          {user ? (
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
                <DropdownMenuItem className="cursor-pointer" onSelect={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
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
    { name: '翻訳', href: '/translate', icon: Settings },
    { name: '履歴', href: '/history', icon: History },
    { name: 'プロフィール', href: '/profile', icon: User },
    { name: '設定', href: '/settings', icon: Settings },
    { name: 'API連携', href: '/integrations', icon: LinkIcon },
  ];

  return (
    <nav className="flex flex-col space-y-1 p-4">
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
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5",
                  isActive ? "text-orange-600" : "text-gray-400"
                )}
                aria-hidden="true"
              />
              {item.name}
            </a>
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
          <aside className="w-64 bg-white shadow-sm rounded-lg overflow-hidden">
            <Sidebar />
          </aside>
          <main className="flex-1 bg-white shadow-sm rounded-lg p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
