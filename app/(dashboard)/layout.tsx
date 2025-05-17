'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, /* Home, */ LogOut } from 'lucide-react';
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
  /* LayoutDashboard, */
  History,
  Settings,
  Link as LinkIcon,
  /* Bell, */
  User,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldAlert,
  Files,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    // ユーザー情報（管理者権限とクレジット残高）の取得
    const fetchUserInfo = async () => {
      if (session?.user?.id) {
        try {
          console.log("[layout.tsx] ユーザー情報取得開始 - ユーザーID:", session.user.id);
          
          // 管理者権限の確認
          const roleResponse = await fetch('/api/user/role');
          if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            console.log("[layout.tsx] 管理者権限確認結果:", roleData);
            setIsAdmin(roleData.isAdmin);
          } else {
            console.error("[layout.tsx] 管理者権限確認失敗 - ステータスコード:", roleResponse.status);
            setIsAdmin(false); // 確認失敗時は管理者でないとみなす
          }
          
          // クレジット残高の取得
          const creditsResponse = await fetch('/api/user/credits');
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            console.log("[layout.tsx] クレジット残高取得結果:", creditsData);
            setCredits(creditsData.credits);
          } else {
            console.error("[layout.tsx] クレジット残高取得失敗 - ステータスコード:", creditsResponse.status);
            setCredits(0); // 取得失敗時は0として表示
          }
        } catch (error) {
          console.error('ユーザー情報の取得に失敗しました:', error);
          setIsAdmin(false); // エラー時は管理者でないとみなす
          setCredits(0); // エラー時は0として表示
        }
      } else {
        console.log("[layout.tsx] ユーザーセッションが存在しないため、情報取得をスキップ");
      }
    };

    fetchUserInfo();
  }, [session]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const navigation = [
    { name: '翻訳', href: '/translate', icon: Settings },
    { name: 'バッチ翻訳', href: '/translate/batch', icon: Files },
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
        className="absolute -right-4 top-2 bg-card rounded-full p-1.5 shadow-md hover:bg-muted z-50 cursor-pointer border border-border"
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <nav
        className={cn(
          'flex flex-col space-y-1 p-4 transition-all duration-300 ease-in-out',
          isExpanded ? 'w-64' : 'w-16',
        )}
      >
        {/* クレジット残高表示 */}
        <div className={cn(
          'mb-4 p-3 bg-primary/5 rounded-md flex items-center',
          isExpanded ? 'justify-between' : 'justify-center'
        )}>
          <div className="flex items-center">
            <CircleIcon className="h-4 w-4 text-primary mr-2" />
            {isExpanded && <span className="text-xs font-medium">クレジット</span>}
          </div>
          {(credits !== null) && (
            <span className={cn(
              'text-sm font-bold text-primary',
              !isExpanded && 'hidden'
            )}>
              {credits}
            </span>
          )}
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} passHref legacyBehavior>
              <a
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary',
                  !isExpanded && 'justify-center',
                )}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isExpanded ? 'mr-3' : 'mr-0',
                    isActive ? 'text-primary' : 'text-muted-foreground',
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
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <LoadingSpinner size="lg" text="セッション確認中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <ErrorMessage message={error} variant="destructive" className="mb-4" />
        ) : (
          <div className="flex gap-8 h-full">
            <aside className="bg-card shadow-sm rounded-lg h-full">
              <Sidebar />
            </aside>
            <main className="flex-1 bg-card shadow-sm rounded-lg p-6">{children}</main>
          </div>
        )}
      </div>
    </div>
  );
}
