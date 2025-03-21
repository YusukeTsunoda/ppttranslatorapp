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

  console.log('初期化時のcallbackUrl:', callbackUrl);
  console.log('現在のURL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  console.log('環境変数NEXTAUTH_URL:', process.env.NEXT_PUBLIC_APP_URL);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // イベント伝播を停止
    setError('');
    setLoading(true);

    console.log('フォーム送信時のcallbackUrl:', callbackUrl);

    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください');
      }

      console.log('認証前のcallbackUrl:', callbackUrl);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      console.log('認証結果:', result);

      if (result?.error) {
        throw new Error(result.error);
      }

      // 成功メッセージの表示
      toast({
        title: 'サインイン成功',
        description: 'リダイレクトします...',
      });

      // リダイレクト処理を修正
      console.log('サインイン成功、リダイレクト先:', callbackUrl);

      // 少し遅延を入れてからリダイレクト
      setTimeout(() => {
        console.log('リダイレクト実行:', callbackUrl);

        try {
          // Next.jsのルーターを使用してリダイレクト
          console.log('router.pushを実行:', callbackUrl);
          router.push(callbackUrl);

          // 念のため、少し遅延を入れてからwindow.location.hrefも使用
          setTimeout(() => {
            console.log('window.location.hrefを使用したリダイレクト:', callbackUrl);
            window.location.href = callbackUrl;
          }, 500);
        } catch (error) {
          console.error('リダイレクトエラー:', error);
          // エラーが発生した場合は直接URLを変更
          window.location.href = callbackUrl;
        }
      }, 1000); // 遅延を1秒に延長
    } catch (error) {
      console.error('Sign in error:', error);
      // エラーメッセージを統一して「サインインに失敗しました」を含むようにする
      const errorMessage =
        error instanceof Error ? `サインインに失敗しました: ${error.message}` : 'サインインに失敗しました';

      setError(errorMessage);

      // エラー時のトースト表示を修正
      setTimeout(() => {
        toast({
          title: 'エラー',
          description: errorMessage,
          variant: 'destructive',
        });
      }, 100);
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
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">PPT Translatorにサインイン</h2>
          <p className="mt-2 text-center text-sm text-gray-600">アカウント情報を入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-md" data-testid="signin-error">
              {error}
            </div>
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
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <Link href="/reset-password" className="text-sm font-medium text-orange-600 hover:text-orange-500">
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
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            onClick={(e) => {
              // クリックイベントの伝播を停止
              e.stopPropagation();
            }}
          >
            {loading ? <LoadingSpinner size="sm" text="サインイン中..." /> : 'サインイン'}
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
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
