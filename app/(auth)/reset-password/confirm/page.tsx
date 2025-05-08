'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

// SearchParamsを取得するコンポーネント
function ResetPasswordConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get('token') : null;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/reset-password');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!password || !confirmPassword) {
        throw new Error('パスワードを入力してください');
      }

      if (password.length < 8) {
        throw new Error('パスワードは8文字以上で入力してください');
      }

      if (password !== confirmPassword) {
        throw new Error('パスワードが一致しません');
      }

      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワードのリセットに失敗しました');
      }

      // 成功メッセージの表示
      toast({
        title: 'パスワードを変更しました',
        description: '新しいパスワードでサインインしてください',
      });

      // サインインページへリダイレクト
      router.push('/signin');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'パスワードのリセットに失敗しました');
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'パスワードのリセットに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center">
            <CircleIcon className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">新しいパスワードを設定</h2>
          <p className="mt-2 text-center text-sm text-gray-600">新しいパスワードを入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} variant="destructive" className="mb-4" />}

          <div className="space-y-2">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上で入力"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワードの確認</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingSpinner size="sm" text="パスワードを変更中..." /> : 'パスワードを変更'}
          </Button>

          <div className="mt-6">
            <div className="text-sm text-center">
              <Link href="/signin" className="font-medium text-orange-600 hover:text-orange-500">
                サインインページに戻る
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      }
    >
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}
