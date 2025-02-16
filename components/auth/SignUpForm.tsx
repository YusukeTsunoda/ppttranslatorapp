import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignUpForm() {
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

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'アカウントの作成に失敗しました');
        return;
      }

      // 登録成功後、自動的にサインイン
      const signInResult = await signIn('credentials', {
        email,
        password,
        callbackUrl: redirect || '/translate',
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push(redirect || '/translate');
      } else {
        setError('サインインに失敗しました');
      }
    } catch (error) {
      setError('アカウントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="signup-form" className="space-y-4">
      <input type="hidden" name="redirect" value={redirect || ''} />
      <input type="hidden" name="priceId" value={priceId || ''} />
      <input type="hidden" name="inviteId" value={inviteId || ''} />

      {error && (
        <div className="rounded-md bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-800">{error}</p>
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
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            処理中...
          </>
        ) : (
          'アカウント作成'
        )}
      </Button>

      <p className="text-sm text-center text-gray-600">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/sign-in" className="text-orange-600 hover:text-orange-500">
          サインイン
        </Link>
      </p>
    </form>
  );
} 