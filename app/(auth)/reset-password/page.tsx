'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        throw new Error('メールアドレスを入力してください');
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワードリセットの要求に失敗しました');
      }

      // 成功メッセージの表示
      toast({
        title: 'パスワードリセットメールを送信しました',
        description: 'メールの指示に従ってパスワードをリセットしてください',
      });

      // メール確認ページへリダイレクト
      router.push('/check-email');
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(error instanceof Error ? error.message : 'パスワードリセットの要求に失敗しました');
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'パスワードリセットの要求に失敗しました',
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
            パスワードをリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録済みのメールアドレスを入力してください
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <LoadingSpinner 
                size="sm" 
                text="送信中..."
              />
            ) : (
              'パスワードリセットメールを送信'
            )}
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