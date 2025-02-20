'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/translate';
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 入力値のバリデーション
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('パスワードを入力してください');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        // アカウント作成
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, inviteId }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'アカウントの作成に失敗しました');
          setLoading(false);
          return;
        }
      }

      // サインイン処理
      const result = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: redirect || '/translate'
      });

      // redirect: true の場合、この部分は実行されません
      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
        console.error('Sign in error:', result.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'サインインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          {mode === 'signin' ? 'サインイン' : 'アカウント作成'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form 
          className="space-y-6" 
          onSubmit={handleSubmit}
          data-testid={mode === 'signin' ? 'signin-form' : 'signup-form'}
          data-cy={mode === 'signin' ? 'signin-form' : 'signup-form'}
        >
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
          {error && (
            <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              メールアドレス
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="メールアドレスを入力"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              パスワード
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="パスワードを入力"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : mode === 'signin' ? (
                'サインイン'
              ) : (
                'アカウント作成'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-sm text-center">
            {mode === 'signin' ? (
              <p>
                アカウントをお持ちでない方は{' '}
                <Link href="/sign-up" className="font-medium text-orange-600 hover:text-orange-500">
                  新規登録
                </Link>
              </p>
            ) : (
              <p>
                すでにアカウントをお持ちの方は{' '}
                <Link href="/sign-in" className="font-medium text-orange-600 hover:text-orange-500">
                  ログイン
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
