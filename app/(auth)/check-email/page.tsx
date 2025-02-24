'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CheckEmailPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            メールをご確認ください
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            マジックリンクを記載したメールを送信しました。<br />
            メールのリンクをクリックしてサインインを完了してください。
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-center text-sm text-gray-500">
            メールが届かない場合は、以下をご確認ください：
          </p>
          <ul className="list-disc text-sm text-gray-500 pl-5 space-y-2">
            <li>迷惑メールフォルダをご確認ください</li>
            <li>メールアドレスが正しく入力されているか確認してください</li>
            <li>数分待ってからもう一度お試しください</li>
          </ul>

          <Button
            onClick={() => router.push('/signin')}
            variant="outline"
            className="w-full"
          >
            サインインページに戻る
          </Button>
        </div>
      </div>
    </div>
  );
} 