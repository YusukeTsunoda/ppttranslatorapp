'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// ... 他のインポート

export function TranslateClient(): ReactNode {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editedTranslations, setEditedTranslations] = useState<{ [key: string]: string }>({});

  // セッション状態を監視
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast({
        title: 'エラー',
        description: 'ログインが必要です',
        variant: 'destructive',
      });
      router.push('/signin');
    }
  }, [status, router, toast]);

  // ローディング中の表示
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  // 未認証の場合は何も表示しない（useEffectでリダイレクト）
  if (status === 'unauthenticated') {
    return null;
  }

  const handleSave = async () => {
    try {
      console.log('Current session:', session); // セッション情報をログ出力

      if (!session?.user) {
        throw new Error('ユーザー認証が必要です');
      }

      setIsSaving(true);

      // リクエストデータをログ出力
      const requestData = {
        slides: slides,
        translations: editedTranslations,
        currentSlide: currentSlide,
        userId: session.user.id, // ユーザーIDを追加
      };
      console.log('Save request data:', requestData);

      const response = await fetch('/api/translations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      // レスポンスの詳細情報をログ出力
      console.log('Save response status:', response.status);
      console.log('Save response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '保存に失敗しました' }));
        console.error('Save error response:', errorData);
        throw new Error(errorData.message || '保存に失敗しました');
      }

      const data = await response.json();
      console.log('Save success response:', data);

      toast({
        title: '成功',
        description: '翻訳が保存されました',
      });
    } catch (error) {
      console.error('Save error details:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 翻訳の編集時にもログを追加
  const handleTranslationChange = (index: number, newTranslation: string) => {
    console.log('Translation change:', {
      slideIndex: currentSlide,
      textIndex: index,
      newTranslation: newTranslation,
    });

    setEditedTranslations((prev) => {
      const updated = {
        ...prev,
        [`${currentSlide}-${index}`]: newTranslation,
      };
      console.log('Updated translations:', updated);
      return updated;
    });

    // スライドの翻訳を更新
    const updatedSlides = [...slides];
    if (!updatedSlides[currentSlide].translations) {
      updatedSlides[currentSlide].translations = [];
    }
    updatedSlides[currentSlide].translations[index] = newTranslation;
    setSlides(updatedSlides);
  };

  return <div>{/* コンポーネントの内容 */}</div>;
}
