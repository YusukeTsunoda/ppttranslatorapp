'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import path from 'path';

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

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
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
  const [editedTranslations, setEditedTranslations] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslationComplete, setIsTranslationComplete] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldUpdateOverlay, setShouldUpdateOverlay] = useState(true);
  const { data: session, status } = useSession();
  const [isDownloading, setIsDownloading] = useState(false);

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

  // まずは handleTranslateSlide を定義
  const handleTranslateSlide = async (slides: any[], slideIndex: number) => {
    if (!slides.length || !slides[slideIndex]?.texts?.length) return;

    try {
      console.log('Translation request for slide', slideIndex, {
        texts: slides[slideIndex].texts,
        sourceLang,
        targetLang,
        model: selectedModel,
      });
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          slideIndex,
          texts: slides[slideIndex].texts.map((text: any) => ({
            text: text.text,
            type: text.type,
            position: text.position
          })),
          sourceLang,
          targetLang,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('翻訳リクエストに失敗しました');
      }

      const data = await response.json();
      console.log('Translation response:', data);
      if (!data.translations || !Array.isArray(data.translations)) {
        throw new Error('翻訳データの形式が不正です');
      }

      // 翻訳結果を現在のスライドに適用
      const updatedSlides = [...slides];
      const translations = data.translations.map((translation: string, index: number) => ({
        text: translation.trim(),
        type: 'translation',
        position: slides[slideIndex].texts[index].position
      }));

      updatedSlides[slideIndex] = {
        ...updatedSlides[slideIndex],
        translations
      };

      // スライドの状態を更新する前にデバッグログを出力
      console.log('Updating slide translations:', {
        slideIndex,
        translations,
        slideData: updatedSlides[slideIndex]
      });

      setSlides(updatedSlides);

      // 編集用の翻訳データも更新
      const newTranslations = { ...editedTranslations };
      translations.forEach((translation: any, index: number) => {
        newTranslations[`${slideIndex}-${index}`] = translation.text;
      });
      setEditedTranslations(newTranslations);

      console.log('Translation debug:', {
        slideIndex,
        translations: data.translations,
        updatedSlideTranslations: updatedSlides[slideIndex].translations,
        editedTranslations: newTranslations
      });

      console.log('Updated translations:', newTranslations);
      console.log('Updated slides:', updatedSlides);
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "翻訳に失敗しました",
        variant: "destructive",
      });
    }
  };

  // その後、handleFileUpload や handleDrop で handleTranslateSlide を利用できるようにする

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

    setUploading(true);
    setIsTranslationComplete(false);
    const formData = new FormData();
    formData.append("file", file);

    try {
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
      
      if (data.slides && Array.isArray(data.slides)) {
        setSlides(data.slides);
        setShouldUpdateOverlay(true);
        toast({
          title: "アップロード成功",
          description: "ファイルの解析が完了しました",
        });

        // すべてのスライドを翻訳
        for (let i = 0; i < data.slides.length; i++) {
          await handleTranslateSlide(data.slides, i);
        }

        console.log('Received slides data:', data.slides);
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
    }
  }, [toast, router, handleTranslateSlide]);

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

  // 翻訳の編集を保存する関数
  const handleTranslationChange = (index: number, newTranslation: string) => {
    // 編集用の翻訳データを更新
    setEditedTranslations(prev => ({
      ...prev,
      [`${currentSlide}-${index}`]: newTranslation
    }));

    // スライドの翻訳を更新
    const updatedSlides = [...slides];
    if (!updatedSlides[currentSlide].translations) {
      updatedSlides[currentSlide].translations = [];
    }
    
    // 翻訳オブジェクトの構造を統一
    updatedSlides[currentSlide].translations[index] = {
      text: newTranslation,
      type: 'translation',
      position: slides[currentSlide].texts[index].position
    };
    
    setSlides(updatedSlides);
    
    console.log('Translation updated:', {
      slideIndex: currentSlide,
      textIndex: index,
      newTranslation,
      updatedTranslations: updatedSlides[currentSlide].translations
    });
  };

  // スライド変更時の編集状態リセット
  useEffect(() => {
    if (currentSlide !== null) {
      setEditedTranslations({});
    }
  }, [currentSlide]); // slidesへの依存を削除

  // スライドのメタデータログ出力を最適化
  useEffect(() => {
    if (currentSlide === 0 && slides.length > 0) {
      console.log('Initial slide metadata:', slides[0]?.metadata);
    }
  }, [slides.length]); // currentSlideへの依存を削除し、slides.lengthのみに依存

  // 現在のスライドのメタデータログ出力
  useEffect(() => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData?.metadata) {
      console.log('Current slide metadata:', currentSlideData.metadata);
    }
  }, [currentSlide, slides]); // 必要な依存のみを保持

  const handleDownload = async () => {
    // スライドの存在チェック
    if (!slides || slides.length === 0) {
      toast({
        title: "エラー",
        description: "スライドが存在しません",
        variant: "destructive",
      });
      return;
    }

    // セッションステータスのチェック
    if (status !== 'authenticated' || !session?.user?.id) {
      console.error('セッションエラー:', {
        status,
        session,
        userId: session?.user?.id
      });
      toast({
        title: "エラー",
        description: "セッションの再認証が必要です",
        variant: "destructive",
      });
      router.push('/signin');
      return;
    }

    try {
      setIsDownloading(true);

      // ファイルパスの構築 - fileIdのみを送信し、サーバー側で実際のファイルを検索
      const fileId = slides[0].fileId;
      
      // リクエストデータの構築
      const requestData = {
        fileId, // ファイルIDのみを送信
        slides: slides.map(slide => ({
          index: slide.index,
          texts: slide.texts.map((text: any, index: number) => ({
            text: text.text,
            translation: (
              editedTranslations[`${slide.index}-${index}`] || 
              slide.translations?.[index]?.text || 
              text.text
            ).trim()
          }))
        }))
      };

      console.log("送信するリクエストデータ:", {
        requestData,
        sessionId: session.user.id,
        fileId
      });

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      // レスポンスの詳細なデバッグ情報
      console.log("ダウンロードAPIレスポンス:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("ダウンロードAPIエラー:", errorData);
        throw new Error(errorData.details || errorData.error || 'ダウンロードに失敗しました');
      }

      const data = await response.json();
      console.log("ダウンロード成功:", data);

      if (!data.success || !data.filePath) {
        throw new Error('ファイルの生成に失敗しました');
      }

      // ダウンロードリンクの作成と実行
      const downloadUrl = `/${data.filePath}`;
      console.log("ダウンロードURL:", downloadUrl);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `translated_${fileId}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "成功",
        description: "翻訳済みPPTXのダウンロードを開始しました",
      });
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ダウンロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/translations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slides,
          translations: editedTranslations,
          currentSlide: currentSlide
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '保存に失敗しました' }));
        throw new Error(errorData.message || '保存に失敗しました');
      }

      const data = await response.json();
      console.log('Save response:', data);

      toast({
        title: "成功",
        description: "翻訳が保存されました",
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 現在のスライドが変更されたときにデバッグ情報を表示
  useEffect(() => {
    if (slides[currentSlide]) {
      console.log('Current slide data:', slides[currentSlide]);
      console.log('Image path:', slides[currentSlide].image_path);
    }
  }, [currentSlide, slides]);

  // 言語設定が変更された時の処理を追加
  useEffect(() => {
    if (slides.length > 0) {
      // 全スライドを再翻訳
      slides.forEach((_, index) => {
        handleTranslateSlide(slides, index);
      });
    }
  }, [sourceLang, targetLang]); // 言語設定が変更されたときに実行

  // 表示部分の直前でデバッグログを追加
  useEffect(() => {
    if (slides[currentSlide]) {
      console.log('Current slide translations:', {
        slideData: slides[currentSlide],
        translations: slides[currentSlide]?.translations,
        editedTranslations: editedTranslations
      });
    }
  }, [currentSlide, slides, editedTranslations]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      {!slides.length ? (
        // ファイルアップロード前の表示
        <div className="grid grid-cols-2 gap-4">
          {/* 翻訳言語の選択（左側） */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">翻訳設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">翻訳元言語</label>
                <Select value={sourceLang} onValueChange={(value) => {
                  setSourceLang(value);
                  // 翻訳元言語が変更された時、翻訳先言語が同じ場合は別の言語を自動選択
                  if (value === targetLang) {
                    setTargetLang(value === 'en' ? 'ja' : 'en');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="翻訳元言語" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">英語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">翻訳先言語</label>
                <Select 
                  value={targetLang} 
                  onValueChange={setTargetLang}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="翻訳先言語" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 翻訳元言語と異なる言語のみを表示 */}
                    {sourceLang !== 'en' && <SelectItem value="en">英語</SelectItem>}
                    {sourceLang !== 'ja' && <SelectItem value="ja">日本語</SelectItem>}
                  </SelectContent>
                </Select>
                {/* デバッグ用の情報表示 */}
                <p className="mt-1 text-sm text-gray-500">
                  現在の設定: {sourceLang} → {targetLang}
                </p>
              </div>
            </div>
          </Card>

          {/* ファイルアップロード（右側） */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">ファイルのアップロード</h2>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center h-[calc(100%-2rem)]"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Input
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={handleFileSelect}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2 h-full"
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-lg text-gray-600">
                  {uploading ? "アップロード中..." : "クリックまたはドラッグ＆ドロップでファイルを選択"}
                </span>
                <span className="text-sm text-gray-500">
                  対応形式: .pptx
                </span>
              </label>
            </div>
          </Card>
        </div>
      ) : (
        // ファイルアップロード後の表示
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* ファイルアップロード関係の表示 */}
            <div>
              <h2 className="text-lg font-semibold mb-2">ファイル情報</h2>
              <div className="text-sm text-gray-600">
                {file?.name && <p>ファイル名: {file.name}</p>}
                <p>スライド数: {slides.length}</p>
              </div>
            </div>
            {/* 翻訳言語の選択の表示 */}
            <div>
              <h2 className="text-lg font-semibold mb-2">翻訳設定</h2>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Select value={sourceLang} onValueChange={(value) => {
                    setSourceLang(value);
                    // 翻訳元言語が変更された時、翻訳先言語が同じ場合は別の言語を自動選択
                    if (value === targetLang) {
                      setTargetLang(value === 'en' ? 'ja' : 'en');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="翻訳元言語" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="en">英語</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={targetLang} 
                    onValueChange={setTargetLang}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="翻訳先言語" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 翻訳元言語と異なる言語のみを表示 */}
                      {sourceLang !== 'en' && <SelectItem value="en">英語</SelectItem>}
                      {sourceLang !== 'ja' && <SelectItem value="ja">日本語</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || !slides || slides.length === 0}
                >
                  {isDownloading ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ダウンロード中...
                      </>
                  ) : (
                      <>
                          <Download className="mr-2 h-4 w-4" />
                          翻訳PPTをダウンロード
                      </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* プレビュー画面と原文・翻訳文の表示エリアを分割 */}
          <div className="flex flex-col gap-4">
            {/* プレビュー画面（大きく表示） */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">スライド {currentSlide + 1} / {slides.length}</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                      disabled={currentSlide === 0}
                    >
                      ← 前へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                      disabled={currentSlide === slides.length - 1}
                    >
                      次へ →
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleZoom(scale - 0.25)}
                      title="縮小"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={resetZoom}
                      title="リセット"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleZoom(scale + 0.25)}
                      title="拡大"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </Button>
                  </div>
                </div>
              </div>
              {/* プレビュー表示エリア */}
              <div
                ref={containerRef}
                className="relative overflow-hidden bg-gray-100 rounded-lg border-2 border-orange-500"
                style={{
                  width: '100%',
                  paddingTop: '56.25%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: 'center',
                      transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                    }}
                  >
                    {slides[currentSlide]?.image_path && (
                      <div className="relative" style={{ width: '100%', height: '100%' }}>
                        <img
                          ref={imageRef}
                          src={`/api/slides/${slides[currentSlide].image_path}`}
                          alt={`スライド ${currentSlide + 1}`}
                          className="w-full h-full object-contain"
                          style={{ userSelect: "none" }}
                          onLoad={handleImageLoad}
                          onError={(e) => {
                            console.error('Image load error:', e);
                            console.log('Attempted image path:', slides[currentSlide].image_path);
                          }}
                          draggable={false}
                        />
                        {shouldUpdateOverlay && slides[currentSlide]?.texts?.map((textObj: any, index: number) => {
                          const textPosition = textObj.position;
                          
                          // オフセットを計算
                          const offsetX = (containerSize.width - imageSize.width) / 2;
                          const offsetY = (containerSize.height - imageSize.height) / 2;
                          
                          // PowerPointの標準サイズに対する比率を計算
                          const baseScaleX = imageSize.width / 1920;
                          const baseScaleY = imageSize.height / 1080;
                          
                          // オーバーレイの位置とサイズを計算
                          const left = offsetX + (textPosition.x * baseScaleX)*2.65;
                          const top = offsetY + (textPosition.y * baseScaleY)*2.65;
                          const width = textPosition.width * baseScaleX*2.65;
                          const height = textPosition.height * baseScaleY*2.65;
                          
                          return (
                            <div
                              key={index}
                              style={{
                                position: 'absolute',
                                left: `${left}px`,
                                top: `${top}px`,
                                width: `${width}px`,
                                height: `${height}px`,
                                border: selectedTextIndex === index ? '3px solid orange' : '2px solid rgba(255, 165, 0, 0.7)',
                                backgroundColor: selectedTextIndex === index ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 165, 0, 0.1)',
                                pointerEvents: 'none',
                                zIndex: selectedTextIndex === index ? 20 : 10
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* 原文と翻訳文の表示エリア */}
            <Card className="p-4">
              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {slides[currentSlide]?.texts?.map((textObj: any, index: number) => (
                  <Card 
                    key={index}
                    className={`p-4 mb-4 ${selectedTextIndex === index ? 'ring-2 ring-orange-500' : ''}`}
                    onMouseEnter={() => setSelectedTextIndex(index)}
                    onMouseLeave={() => setSelectedTextIndex(null)}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">原文</h3>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {textObj.text}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">翻訳文</h3>
                        <Textarea
                          value={
                            editedTranslations[`${currentSlide}-${index}`] || 
                            slides[currentSlide]?.translations?.[index]?.text || // .textプロパティを参照
                            ''
                          }
                          onChange={(e) => handleTranslationChange(index, e.target.value)}
                          placeholder="翻訳文を入力"
                          className="w-full resize-none"
                          rows={1}
                          style={{
                            height: 'auto',
                            minHeight: '2.5rem',
                            overflow: 'hidden'
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
