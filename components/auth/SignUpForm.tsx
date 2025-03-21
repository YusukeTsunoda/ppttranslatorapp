'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

export default function SignUpForm() {
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

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アカウントの作成に失敗しました');
      }

      // 成功通知
      toast({
        title: 'アカウント作成成功',
        description: '自動的にサインインします',
      });

      // 登録成功後、自動的にサインイン
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        toast({
          title: 'サインイン成功',
          description: 'ダッシュボードに移動します',
        });
        router.push(redirect || '/translate');
      } else {
        throw new Error('サインインに失敗しました');
      }
    } catch (error) {
      console.error('サインアップエラー:', error);
      setError(error instanceof Error ? error.message : 'アカウントの作成に失敗しました');
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'アカウントの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="signup-form" className="space-y-4">
      <input type="hidden" name="redirect" value={redirect || ''} />
      <input type="hidden" name="priceId" value={priceId || ''} />
      <input type="hidden" name="inviteId" value={inviteId || ''} />

      {error && <ErrorMessage message={error} variant="destructive" className="mb-4" />}

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
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        {loading ? <LoadingSpinner size="sm" text="アカウント作成中..." /> : 'アカウント作成'}
      </Button>

      <p className="text-sm text-center text-gray-600">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/signin" className="font-medium text-orange-600 hover:text-orange-500">
          サインイン
        </Link>
      </p>
    </form>
  );
}
