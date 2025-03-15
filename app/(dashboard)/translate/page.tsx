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

// ファイル先頭に型定義を追加
interface CustomSession {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    expires: string;
}

type SessionStatus = 'authenticated' | 'loading' | 'unauthenticated';

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
}

// スライドの型定義
interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextItem {
  text: string;
  position: TextPosition;
}

interface TranslationItem {
  text: string;
  position: TextPosition;
}

interface Slide {
  index: number;
  imageUrl: string;
  texts: TextItem[];
  translations?: TranslationItem[];
}

// FileUploadコンポーネントを定義
const FileUpload = ({ onUploadComplete }: { onUploadComplete: (file: File) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUploadComplete(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 ${
        isDragOver 
          ? 'border-primary bg-primary/5' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid="file-drop-area"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pptx"
        onChange={(e) => e.target.files && onUploadComplete(e.target.files[0])}
        data-testid="file-input"
      />
      <div className="text-center">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">ファイルをアップロード</h3>
          <p className="text-sm text-gray-500 mt-1">
            PPTXファイルをドラッグ＆ドロップするか、クリックして選択してください
          </p>
        </div>
        <Button 
          onClick={handleButtonClick}
          disabled={uploading}
          data-testid="file-select-button"
          className="w-full sm:w-auto"
          variant="outline"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              ファイルを選択
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          最大ファイルサイズ: 20MB
        </p>
      </div>
    </div>
  );
};

const PreviewSection = ({ slide }: { slide: Slide }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* プレビュー画像 */}
      <div className="relative w-full h-[400px] bg-gray-50">
        {!imageError ? (
          <Image
            src={slide.imageUrl}
            alt={`スライド ${slide.index + 1}`}
            fill
            style={{ objectFit: 'contain' }}
            priority
            onError={() => setImageError(true)}
            data-testid="preview-image"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">画像の読み込みに失敗しました</p>
          </div>
        )}
      </div>
      
      {/* テキスト一覧 */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">抽出されたテキスト</h3>
        <div className="space-y-4">
          {slide.texts.map((text, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
              {/* 原文 */}
              <div>
                <div className="text-sm text-gray-500 mb-1">原文:</div>
                <div className="p-3 bg-white rounded border">{text.text}</div>
              </div>
              
              {/* 翻訳 */}
              <div>
                <div className="text-sm text-gray-500 mb-1">翻訳:</div>
                <div className="p-3 bg-white rounded border">
                  {slide.translations?.[idx]?.text || '翻訳待ち...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
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

  // 利用可能なモデルのリスト
  const availableModels = [
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
      console.log('Upload response:', data);
      
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        // スライドデータの整形
        const formattedSlides = data.slides.map((slide: any, index: number) => ({
          index,
          imageUrl: `/api/slides/${data.fileId}/slide_${index + 1}.png`,
          texts: slide.texts || [],
          translations: slide.translations || []
        }));
        
        setSlides(formattedSlides);
        setCurrentSlide(0);
        setShouldUpdateOverlay(true);
        
        toast({
          title: "成功",
          description: `${formattedSlides.length}枚のスライドの解析が完了しました`,
          variant: "default",
        });
      } else {
        throw new Error('スライドデータの形式が不正です');
      }

    } catch (error) {
      console.error('Upload error:', error);
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
  const handleTranslateSlide = async () => {
    setIsTranslating(true);
    try {
      // 翻訳APIの呼び出し処理をここに実装
      // 実際のAPIコールは省略
      
      // 仮の実装として、少し待ってから翻訳完了とする
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 翻訳結果を更新
      const updatedSlides = [...slides];
      updatedSlides[currentSlide] = {
        ...updatedSlides[currentSlide],
        translations: updatedSlides[currentSlide].texts.map(text => ({
          text: `Translated: ${text.text}`,
          position: text.position
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
      
      // ダウンロードAPIの呼び出し処理をここに実装
      // 実際のAPIコールは省略
      
      // 仮の実装として、少し待ってからダウンロード完了とする
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "ダウンロード完了",
        description: "翻訳済みファイルのダウンロードが完了しました",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "エラー",
        description: "ダウンロード中にエラーが発生しました",
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
  const handleTranslate = async () => {
    await handleTranslateSlide();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" data-testid="translate-page-title">翻訳</h1>
      
      {slides.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md" data-testid="upload-area">
          <h2 className="text-xl font-semibold mb-4">ファイルをアップロード</h2>
          <FileUpload onUploadComplete={handleFileUpload} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 操作ボタン */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Button 
                onClick={handleTranslate} 
                disabled={isTranslating}
                data-testid="translate-button"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    翻訳中...
                  </>
                ) : (
                  '翻訳開始'
                )}
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={isDownloading || !isTranslated}
                variant="outline"
                data-testid="download-button"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
            <Button 
              variant="ghost" 
              onClick={handleReset}
              data-testid="reset-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              リセット
            </Button>
          </div>

          {/* プレビューとテキスト */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12" data-testid="loading-indicator">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">スライドを読み込み中...</span>
            </div>
          ) : (
            <PreviewSection slide={slides[currentSlide]} />
          )}
        </div>
      )}
      
      <Toaster />
    </div>
  );
}
