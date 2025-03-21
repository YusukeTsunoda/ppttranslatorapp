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
function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/translate';
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 入力値の検証
      if (!email || !password || !name) {
        throw new Error('すべての項目を入力してください');
      }

      if (password.length < 8) {
        throw new Error('パスワードは8文字以上で入力してください');
      }

      // APIへサインアップリクエスト
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アカウントの作成に失敗しました');
      }

      // アカウント作成成功の通知
      toast({
        title: 'アカウント作成成功',
        description: '自動的にサインインします',
      });

      // 登録成功後、自動的にサインイン
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirect,
      });

      if (signInResult?.error) {
        throw new Error('サインインに失敗しました');
      }

      // サインイン成功後、リダイレクト
      router.push(redirect);
    } catch (error) {
      console.error('サインアップエラー:', error);
      // エラーメッセージを統一
      const errorMessage =
        error instanceof Error ? `アカウントの作成に失敗しました: ${error.message}` : 'アカウントの作成に失敗しました';

      setError(errorMessage);
      toast({
        title: 'エラー',
        description: errorMessage,
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
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">新規アカウント作成</h2>
          <p className="mt-2 text-center text-sm text-gray-600">必要な情報を入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />

          {error && (
            <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-md" data-testid="signup-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              required
              disabled={loading}
            />
          </div>

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
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力（8文字以上）"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingSpinner size="sm" text="アカウント作成中..." /> : 'アカウント作成'}
          </Button>

          <div className="mt-6">
            <div className="text-sm text-center">
              <p>
                すでにアカウントをお持ちの方は{' '}
                <Link href="/signin" className="font-medium text-orange-600 hover:text-orange-500">
                  サインイン
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
