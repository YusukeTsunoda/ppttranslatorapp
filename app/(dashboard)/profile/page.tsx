'use client';

import { useUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      console.error('ユーザーが見つかりません');
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">プロフィール設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          アカウント情報の確認と更新ができます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.name || ''}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email || ''}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="mt-1 text-sm text-gray-500">
                メールアドレスの変更はサポートまでお問い合わせください。
              </p>
            </div>
            <Button type="submit">保存</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
