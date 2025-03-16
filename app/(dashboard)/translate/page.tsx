"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, ChevronLeft, ChevronRight, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import path from 'path';
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";
import { FileUploadComponent } from "./components/FileUpload";
import { PreviewSectionComponent } from "./components/PreviewSection";
import { Slide, TranslationModel, CustomSession, SessionStatus } from "./types";

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
    value: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    description: "高速で経済的な翻訳向け",
    premium: false
  },
  {
    value: "claude-3-sonnet-20240229",
    label: "Claude 3 Sonnet",
    description: "高品質な翻訳向け",
    premium: true
  },
  {
    value: "anthropic.claude-3-haiku-20240307-v1:0",
    label: "Claude 3 Haiku (AWS Bedrock)",
    description: "AWS Bedrock経由の高速翻訳",
    premium: true
  }
];

// 利用可能な言語のリスト
const availableLanguages = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "英語" },
  { value: "zh", label: "中国語" },
  { value: "ko", label: "韓国語" },
  { value: "fr", label: "フランス語" },
  { value: "de", label: "ドイツ語" },
  { value: "es", label: "スペイン語" },
  { value: "it", label: "イタリア語" },
  { value: "ru", label: "ロシア語" },
  { value: "pt", label: "ポルトガル語" }
];

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [hoveredTextIndex, setHoveredTextIndex] = useState<number | null>(null);
  const [sourceLang, setSourceLang] = useState("ja");  // 翻訳元言語を日本語に
  const [targetLang, setTargetLang] = useState("en");  // 翻訳先言語を英語に
  const { toast } = useToast();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false); // TODO: 実際のユーザー情報から取得
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslationComplete, setIsTranslationComplete] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldUpdateOverlay, setShouldUpdateOverlay] = useState(true);
  const { data: session, status } = useSession();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [selectedModel, setSelectedModel] = useState(availableModels[0].value);

  // コンポーネントの初期化
  useEffect(() => {
    // ステートをリセット
    setFile(null);
    setUploading(false);
    setSlides([]);
    setCurrentSlide(0);
    setSelectedTextIndex(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
    setEditedTranslations({});
    setIsSaving(false);
    setIsGenerating(false);
    setIsTranslationComplete(false);
    setIsInitialized(true);
    setShouldUpdateOverlay(true);
    setIsLoading(false);
    setEditingKey(null);
    setEditingValue('');
    setIsTranslating(false);
    setIsTranslated(false);

    return () => {
      setIsInitialized(false);
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
        title: "エラー",
        description: "認証が必要です",
        variant: "destructive",
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

  // ファイルアップロード処理
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.name.endsWith(".pptx")) {
      toast({
        title: "エラー",
        description: "PPTXファイルのみ対応しています",
        variant: "destructive",
      });
      return;
    }

    // ファイルサイズチェック（20MB）
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "エラー",
        description: "ファイルサイズは20MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
    setUploading(true);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      toast({
        title: "アップロード中",
        description: "ファイルを処理しています...",
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      if (response.status === 401) {
        toast({
          title: "エラー",
          description: "セッションが切れました。再度ログインしてください。",
          variant: "destructive",
        });
        router.push(`/signin?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      
      // APIレスポンスの詳細をログ出力
      console.log('=== API Response Debug ===');
      console.log('Status:', response.status);
      console.log('Response Data:', {
        type: typeof data,
        keys: Object.keys(data),
        fileId: data.fileId,
        success: data.success,
        hasSlides: data.slides && Array.isArray(data.slides),
        slidesLength: data.slides && Array.isArray(data.slides) ? data.slides.length : 0
      });

      // ファイルIDの取得を改善
      const fileId = data.fileId;
      if (!fileId) {
        console.error('=== File ID Error ===');
        console.error('Expected fileId in response data structure:');
        console.error('- data.fileId:', data.fileId);
        throw new Error('ファイルIDが見つかりません');
      }

      // スライドデータの検証と整形を改善
      let slides = data.slides;
      if (!slides || !Array.isArray(slides) || slides.length === 0) {
        console.error('=== Slides Data Error ===');
        console.error('Expected slides data structure not found:');
        console.error('- data.slides:', data.slides);
        throw new Error('スライドデータの形式が不正です');
      }

      // スライドデータの詳細をログ出力
      console.log('=== Slides Data Debug ===');
      console.log('First slide keys:', Object.keys(slides[0]));
      console.log('First slide texts sample:', slides[0].texts && slides[0].texts.length > 0 ? slides[0].texts[0] : 'No texts');

      // スライドデータの整形
      const formattedSlides = slides.map((slide: any, index: number) => {
        if (!slide) {
          console.error(`Invalid slide data at index ${index}:`, slide);
          return null;
        }

        // テキストデータの形式を確認
        const texts = Array.isArray(slide.texts) 
          ? slide.texts.map((text: any) => {
              // TextItem型に変換
              if (typeof text === 'string') {
                return {
                  text: text,
                  position: { x: 0, y: 0, width: 0, height: 0 }
                };
              } else if (text && typeof text === 'object') {
                return {
                  text: text.text || text.content || '',
                  position: text.position || { x: 0, y: 0, width: 0, height: 0 }
                };
              } else {
                console.error('Invalid text format:', text);
                return {
                  text: '',
                  position: { x: 0, y: 0, width: 0, height: 0 }
                };
              }
            })
          : [];

        // 画像パスの生成を修正
        const imagePath = slide.image_path || `slide_${index + 1}.png`;
        // デバッグ用にパスを出力
        console.log(`Slide ${index} image path:`, imagePath);
        
        return {
          index,
          imageUrl: `/api/slides/${fileId}/${imagePath}`,
          texts: texts,
          translations: []
        };
      }).filter(Boolean) as Slide[];

      if (formattedSlides.length === 0) {
        console.error('=== Formatting Error ===');
        console.error('No valid slides after formatting');
        throw new Error('有効なスライドデータがありません');
      }

      // 成功時のデータ構造を確認
      console.log('=== Success ===');
      console.log('Formatted Slides Count:', formattedSlides.length);
      console.log('First formatted slide:', formattedSlides[0]);

      setSlides(formattedSlides);
      setCurrentSlide(0);
      setShouldUpdateOverlay(true);
      
      toast({
        title: "成功",
        description: `${formattedSlides.length}枚のスライドの解析が完了しました`,
        variant: "default",
      });

    } catch (error) {
      console.error('=== Upload Error ===');
      console.error('Error details:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "アップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setIsLoading(false);
    }
  }, [toast, router]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // 画像サイズの状態を追加
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 画像読み込み時のハンドラーを修正
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setImageSize({
        width: imgRect.width,
        height: imgRect.height
      });
      setContainerSize({
        width: containerRect.width,
        height: containerRect.height
      });
    }
  }, []);

  // プレビューコンテナのスタイル
  const previewContainerStyle = {
    width: '100%',
    paddingTop: '56.25%', // 16:9のアスペクト比
    position: 'relative' as const,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none' // タッチデバイスでのスクロールを防止
  };

  // 共通のtransformスタイル
  const getTransformStyle = (x: number, y: number, scale: number) => ({
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    transformOrigin: 'center',
  });

  // ドラッグ処理の関数を修正
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // 移動範囲を制限（オプション）
    const maxMove = 500; // 最大移動距離
    const limitedX = Math.max(-maxMove, Math.min(maxMove, newX));
    const limitedY = Math.max(-maxMove, Math.min(maxMove, newY));
    
    setPosition({
      x: limitedX,
      y: limitedY
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  const handleZoom = (newScale: number) => {
    // スケールを更新するだけで、オーバーレイのリペイントは行わない
    setScale(Math.max(0.5, Math.min(3, newScale)));
    // setShouldUpdateOverlayは呼び出さない
  };

  // リセット時に位置もリセット
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShouldUpdateOverlay(true);
  };

  // 翻訳処理
  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      // 現在のスライドのテキストを抽出
      const textsToTranslate = slides[currentSlide].texts.map(textItem => ({
        text: textItem.text,
        position: textItem.position
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
          fileName: file?.name || "スライド",
          slides: slides // スライドデータを送信
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
          position: textsToTranslate[index].position
        }))
      };
      
      setSlides(updatedSlides);
      setIsTranslated(true);
      
      toast({
        title: "翻訳完了",
        description: "スライドの翻訳が完了しました",
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "エラー",
        description: "翻訳処理中にエラーが発生しました",
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
      const slidesWithTranslations = slides.map(slide => {
        // 各スライドのテキストに対応する翻訳を取得
        const textsWithTranslations = slide.texts.map((text, idx) => {
          // 編集された翻訳があればそれを使用
          const translationKey = `${slide.index}-${idx}`;
          const editedTranslation = editedTranslations[translationKey];
          
          // スライドの翻訳配列から対応する翻訳を取得
          const originalTranslation = slide.translations && slide.translations[idx] 
            ? slide.translations[idx].text 
            : "";
            
          // 編集された翻訳があればそれを優先、なければ元の翻訳を使用
          return {
            text: text.text,
            position: text.position,
            translation: editedTranslation || originalTranslation
          };
        });
        
        return {
          index: slide.index,
          texts: textsWithTranslations
        };
      });
      
      // デバッグ用にデータ構造をログ出力
      console.log("送信する翻訳データ:", slidesWithTranslations);
      
      // ダウンロードAPIの呼び出し
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: slides[0].imageUrl.split('/').slice(-2)[0], // URLからfileIdを抽出
          slides: slidesWithTranslations
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
          title: "ダウンロード完了",
          description: "翻訳済みファイルのダウンロードが完了しました",
        });
      } else {
        throw new Error('ダウンロードリンクの取得に失敗しました');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ダウンロード中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 翻訳テキストの編集
  const handleTranslationChange = (textIndex: number, newValue: string) => {
    const translationKey = `${currentSlide}-${textIndex}`;
    const newTranslations = { ...editedTranslations };
    newTranslations[translationKey] = newValue;
    setEditedTranslations(newTranslations);
  };

  // 編集開始
  const startEditing = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  // 翻訳保存
  const saveTranslation = (key: string) => {
    const [slideIndex, textIndex] = key.split('-').map(Number);
    handleTranslationChange(textIndex, editingValue);
    setEditingKey(null);
    setEditingValue('');
  };

  // 編集キャンセル
  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  // 翻訳実行
  const handleTranslateSlide = async () => {
    await handleTranslate();
  };

  // リセット処理
  const handleReset = () => {
    setSlides([]);
    setCurrentSlide(0);
    setEditedTranslations({});
    setIsTranslated(false);
    setIsTranslating(false);
    setEditingKey(null);
    setEditingValue('');
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
                    <Select
                      value={sourceLang}
                      onValueChange={setSourceLang}
                    >
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
                    <Select
                      value={targetLang}
                      onValueChange={setTargetLang}
                    >
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
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger id="model-select" className="w-full">
                        <SelectValue placeholder="モデルを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            disabled={model.premium && !isPremium}
                          >
                            {model.label}
                            {model.premium && !isPremium && " (プレミアム限定)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleTranslate}
                      disabled={isTranslating || slides[currentSlide]?.texts?.length === 0}
                    >
                      {isTranslating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="translating-indicator" />
                          翻訳中...
                        </>
                      ) : (
                        "翻訳する"
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
              <div className="w-full max-w-full">
                {renderPreviewSection()}
              </div>
            </div>
          </>
        )}
      </div>
      
      <Toaster />
    </div>
  );
}
