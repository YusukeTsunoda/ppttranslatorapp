'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// SearchParamsを取得するコンポーネント
function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          throw new Error('トークンが見つかりません');
        }

        const response = await fetch('/api/auth/verify-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '認証に失敗しました');
        }

        // アクセストークンの保存
        localStorage.setItem('accessToken', data.accessToken);

        // 成功メッセージの表示
        toast({
          title: 'サインインしました',
          description: 'ダッシュボードにリダイレクトします...',
        });

        // ダッシュボードへリダイレクト
        router.push('/dashboard');
      } catch (error) {
        console.error('Verification error:', error);
        toast({
          title: 'エラー',
          description: error instanceof Error ? error.message : '認証に失敗しました',
          variant: 'destructive',
        });
        router.push('/signin');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            認証中...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isVerifying
              ? 'マジックリンクを検証しています...'
              : 'リダイレクトしています...'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>}>
      <VerifyContent />
    </Suspense>
  );
} 