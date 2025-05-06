'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/toaster';
import { FileUploadComponent } from './components/FileUpload';
import { PreviewSectionComponent } from './components/PreviewSection';
import { Slide, TranslationModel } from './types';

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
}

// 利用可能なモデルのリスト
const availableModels: TranslationModel[] = [
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    description: '高速で経済的な翻訳向け',
    premium: false,
  },
  {
    value: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    description: '高品質な翻訳向け',
    premium: true,
  },
  {
    value: 'anthropic.claude-3-haiku-20240307-v1:0',
    label: 'Claude 3 Haiku (AWS Bedrock)',
    description: 'AWS Bedrock経由の高速翻訳',
    premium: true,
  },
];

// 利用可能な言語のリスト
const availableLanguages = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: '英語' },
  { value: 'zh', label: '中国語' },
  { value: 'ko', label: '韓国語' },
  { value: 'fr', label: 'フランス語' },
  { value: 'de', label: 'ドイツ語' },
  { value: 'es', label: 'スペイン語' },
  { value: 'it', label: 'イタリア語' },
  { value: 'ru', label: 'ロシア語' },
  { value: 'pt', label: 'ポルトガル語' },
];

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [hoveredTextIndex, setHoveredTextIndex] = useState<number | null>(null);
  const [sourceLang, setSourceLang] = useState('ja'); // 翻訳元言語を日本語に
  const [targetLang, setTargetLang] = useState('en'); // 翻訳先言語を英語に
  const { toast } = useToast();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false); // TODO: 実際のユーザー情報から取得
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [selectedModel, setSelectedModel] = useState(availableModels[0].value);
  const { data: session, status } = useSession();
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ファイルアップロード処理
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log('ファイルアップロード開始:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      console.log('アップロードAPIレスポンス（フロントエンド）:', data);
      
      if (data.success) {
        setFile(file);
        setFileId(data.fileId);
        setSlides(data.slides);
        setCurrentSlide(0);
        setUploadSuccess(true);
        
        // スライドデータの詳細をログ出力
        console.log('スライドデータ詳細:', {
          slidesCount: data.slides.length,
          firstSlide: data.slides[0],
          imageUrl: data.slides[0]?.imageUrl,
          urlParts: data.slides[0]?.imageUrl?.split('/') || []
        });
        
        // 画像のプリロードを試みる
        if (data.slides[0]?.imageUrl) {
          const img = new Image();
          img.onload = () => console.log('画像プリロード成功:', data.slides[0].imageUrl);
          img.onerror = (e) => console.error('画像プリロード失敗:', e);
          img.src = data.slides[0].imageUrl;
          
          // 直接fetchでも試してみる
          fetch(data.slides[0].imageUrl, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
            .then(res => {
              console.log('画像fetch結果:', {
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries()),
                url: res.url
              });
              return res.blob();
            })
            .then(blob => {
              console.log('画像ブロブ取得成功:', {
                type: blob.type,
                size: blob.size
              });
            })
            .catch(error => {
              console.error('画像fetch失敗:', error);
            });
        }
        
        toast({
          title: 'アップロード成功',
          description: `${file.name}のアップロードが完了しました。`,
        });
      } else {
        setUploadError(data.error || 'アップロードに失敗しました');
        toast({
          variant: 'destructive',
          title: 'アップロード失敗',
          description: data.error || 'アップロードに失敗しました',
        });
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      setUploadError('アップロード中にエラーが発生しました');
      toast({
        variant: 'destructive',
        title: 'アップロード失敗',
        description: 'アップロード中にエラーが発生しました',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // マウスイベントのクリーンアップを最適化
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // コンポーネントの初期化
  useEffect(() => {
    // ステートをリセット
    setFile(null);
    setSlides([]);
    setCurrentSlide(0);
    setSelectedTextIndex(null);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
    setEditedTranslations({});
    setIsTranslating(false);
    setIsTranslated(false);

    return () => {
      // setIsInitialized(false);
    };
  }, []); // 依存配列を空にして、マウント時のみ実行

  // セッション状態の監視
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (!session?.user) {
      toast({
        title: 'エラー',
        description: '認証が必要です',
        variant: 'destructive',
      });
      router.push('/signin');
      return;
    }
  }, [status, session, router, toast]);

  // ローディング中の表示
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // 未認証の場合は何も表示しない
  if (!session?.user) {
    return null;
  }

  // 翻訳ボタンの無効化条件を関数化
  const isTranslateButtonDisabled = () => {
    // スライドが存在しない場合
    if (!slides || slides.length === 0 || currentSlide >= slides.length) {
      return true;
    }
    
    // 現在のスライドにテキスト要素がない場合
    const currentSlideData = slides[currentSlide];
    if (!currentSlideData || !currentSlideData.texts || currentSlideData.texts.length === 0) {
      return true;
    }
    
    // 翻訳中の場合
    if (isTranslating) {
      return true;
    }
    
    return false;
  };

  // 翻訳処理
  const handleTranslate = async () => {
    // 現在のスライドのテキスト要素を確認
    console.log('翻訳開始前の確認:');
    console.log('現在のスライド:', currentSlide);
    console.log('スライドデータ:', slides[currentSlide]);
    console.log('テキスト要素:', slides[currentSlide]?.texts);
    console.log('テキスト要素数:', slides[currentSlide]?.texts?.length);
    
    // テキスト要素がない場合は処理を中止
    if (!slides[currentSlide]?.texts || slides[currentSlide]?.texts?.length === 0) {
      toast({
        title: '翻訳できません',
        description: '現在のスライドにテキスト要素がありません',
        variant: 'destructive',
      });
      return;
    }

    setIsTranslating(true);
    try {
      // 現在のスライドのテキストを抽出
      const textsToTranslate = slides[currentSlide].texts.map((textItem) => ({
        text: textItem.text,
        position: textItem.position,
      }));

      // 翻訳APIの呼び出し
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: textsToTranslate,
          sourceLang: sourceLang,
          targetLang: targetLang,
          model: selectedModel,
          fileName: file?.name || 'スライド',
          slides: slides, // スライドデータを送信
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('翻訳APIの呼び出しに失敗しました');
      }

      const data = await response.json();

      // 翻訳結果を更新
      const updatedSlides = [...slides];
      updatedSlides[currentSlide] = {
        ...updatedSlides[currentSlide],
        translations: data.translations.map((translatedText: string, index: number) => ({
          text: translatedText,
          position: textsToTranslate[index].position,
        })),
      };

      setSlides(updatedSlides);
      setIsTranslated(true);

      toast({
        title: '翻訳完了',
        description: 'スライドの翻訳が完了しました',
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '翻訳処理中にエラーが発生しました',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // ダウンロード処理
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // 翻訳データの準備 - 修正: 翻訳データの構造を正しく整形
      const slidesWithTranslations = slides.map((slide) => {
        // 各スライドのテキストに対応する翻訳を取得
        const textsWithTranslations = slide.texts.map((text, idx) => {
          // 編集された翻訳があればそれを使用
          const translationKey = `${slide.index}-${idx}`;
          const editedTranslation = editedTranslations[translationKey];

          // スライドの翻訳配列から対応する翻訳を取得
          const originalTranslation = slide.translations && slide.translations[idx] ? slide.translations[idx].text : '';

          // 編集された翻訳があればそれを優先、なければ元の翻訳を使用
          return {
            text: text.text,
            position: text.position,
            translation: editedTranslation || originalTranslation,
          };
        });

        return {
          index: slide.index,
          texts: textsWithTranslations,
        };
      });

      // デバッグ用にデータ構造をログ出力
      console.log('送信する翻訳データ:', slidesWithTranslations);

      // ダウンロードAPIの呼び出し
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: slides[0].imageUrl.split('/').slice(-2)[0], // URLからfileIdを抽出
          slides: slidesWithTranslations,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'ダウンロードに失敗しました');
      }

      const data = await response.json();

      if (data.success && data.filePath) {
        // ファイルのダウンロード
        const downloadLink = document.createElement('a');
        downloadLink.href = `/${data.filePath}`;
        downloadLink.download = `translated_presentation.pptx`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast({
          title: 'ダウンロード完了',
          description: '翻訳済みファイルのダウンロードが完了しました',
        });
      } else {
        throw new Error('ダウンロードリンクの取得に失敗しました');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ダウンロード中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // テキストが選択された時の処理を追加
  const handleTextSelect = (index: number | null) => {
    setSelectedTextIndex(index);
  };

  // テキストにホバーした時の処理を追加
  const handleTextHover = (index: number | null) => {
    setHoveredTextIndex(index);
  };

  // プレビューセクションのレンダリング部分を修正
  const renderPreviewSection = () => {
    if (slides.length === 0) {
      return null;
    }

    return (
      <PreviewSectionComponent
        currentSlide={currentSlide}
        slides={slides}
        onSlideChange={setCurrentSlide}
        selectedTextIndex={selectedTextIndex}
        onTextSelect={handleTextSelect}
        hoveredTextIndex={hoveredTextIndex}
        onTextHover={handleTextHover}
      />
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">プレゼンテーション翻訳</h1>

        {!file && (
          <Card className="p-6">
            <FileUploadComponent onUploadComplete={handleFileUpload} />
          </Card>
        )}

        {file && slides.length > 0 && (
          <>
            <div className="flex flex-col gap-4">
              {/* 言語選択とモデル選択を上部に移動 */}
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="source-lang">翻訳元言語</Label>
                    <Select value={sourceLang} onValueChange={setSourceLang}>
                      <SelectTrigger id="source-lang" className="w-full">
                        <SelectValue placeholder="翻訳元言語を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="target-lang">翻訳先言語</Label>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger id="target-lang" className="w-full">
                        <SelectValue placeholder="翻訳先言語を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="model-select">翻訳モデル</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="model-select" className="w-full">
                        <SelectValue placeholder="モデルを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.value} value={model.value} disabled={model.premium && !isPremium}>
                            {model.label}
                            {model.premium && !isPremium && ' (プレミアム限定)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleTranslate}
                      disabled={isTranslateButtonDisabled()}
                    >
                      {isTranslating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="translating-indicator" />
                          翻訳中...
                        </>
                      ) : (
                        '翻訳する'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* スライドナビゲーション - プレビューの上に移動 */}
              {slides.length > 1 && (
                <Card className="p-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      スライド {currentSlide + 1} / {slides.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                      disabled={currentSlide === slides.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ダウンロードボタン */}
              {isTranslated && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    data-testid="download-button"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="downloading-indicator" />
                        ダウンロード中...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        ダウンロード
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* スライドプレビュー */}
              <div className="w-full max-w-full">{renderPreviewSection()}</div>
            </div>
          </>
        )}
      </div>

      <Toaster />
    </div>
  );
}
