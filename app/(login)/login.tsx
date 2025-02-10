'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData(e.currentTarget);
      const action = mode === 'signin' ? signIn : signUp;
      const result = await action({ 
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        inviteId: formData.get('inviteId') as string | undefined
      }, formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          {mode === 'signin'
            ? 'ログイン'
            : '新規アカウント作成'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
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
                maxLength={50}
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
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                required
                minLength={8}
                maxLength={100}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="パスワードを入力"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error === 'An error occurred. Please try again.'
                      ? 'エラーが発生しました。もう一度お試しください。'
                      : error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : mode === 'signin' ? (
                'ログイン'
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
