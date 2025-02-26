'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

// SearchParamsを取得するコンポーネント
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/translate';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください');
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // 成功メッセージの表示
      toast({
        title: 'サインイン成功',
        description: 'リダイレクトします...',
      });

      // リダイレクト - router.pushの代わりにwindow.location.hrefを使用
      window.location.href = callbackUrl;
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'サインインに失敗しました');
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'サインインに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center">
            <CircleIcon className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            PPT Translatorにサインイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アカウント情報を入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <ErrorMessage 
              message={error}
              variant="destructive"
              className="mb-4"
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <Link
                href="/reset-password"
                className="text-sm font-medium text-orange-600 hover:text-orange-500"
              >
                パスワードをお忘れの方
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <LoadingSpinner 
                size="sm" 
                text="サインイン中..."
              />
            ) : (
              'サインイン'
            )}
          </Button>

          <div className="mt-6">
            <div className="text-sm text-center">
              <p>
                アカウントをお持ちでない方は{' '}
                <Link href="/signup" className="font-medium text-orange-600 hover:text-orange-500">
                  新規登録
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>}>
      <SignInContent />
    </Suspense>
  );
} 