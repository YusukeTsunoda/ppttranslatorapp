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

    return () => {
      setIsInitialized(false);
    };
  }, []); // 依存配列を空にして、マウント時のみ実行

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
        router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
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
        toast({
          title: "アップロード成功",
          description: "ファイルの解析が完了しました",
        });

        // アップロード成功後、自動的に翻訳を開始
        if (data.slides.length > 0) {
          await handleTranslateSlide(data.slides, 0);
        }
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

  // 個別のスライドを翻訳する関数
  const handleTranslateSlide = async (slides: any[], slideIndex: number) => {
    if (!slides.length || !slides[slideIndex]?.texts?.length) return;

    try {
      console.log('Translation request for slide', slideIndex, ':', {
        texts: slides[slideIndex].texts,
        sourceLang,
        targetLang,
        model: selectedModel,
      });

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          slideIndex,
          texts: slides[slideIndex].texts,
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

      // 翻訳結果を現在のスライドに適用
      const updatedSlides = [...slides];
      updatedSlides[slideIndex] = {
        ...updatedSlides[slideIndex],
        translations: data.translations.map((text: string, index: number) => ({
          text,
          type: 'translation',
          position: slides[slideIndex].texts[index].position
        }))
      };
      setSlides(updatedSlides);

      // 編集用の翻訳データも更新
      const newTranslations = { ...editedTranslations };
      data.translations.forEach((text: string, index: number) => {
        newTranslations[`${slideIndex}-${index}`] = text;
      });
      setEditedTranslations(newTranslations);

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "翻訳に失敗しました",
        variant: "destructive",
      });
    }
  };

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

  // ドラッグ処理の更新
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
    
    setPosition({
      x: newX,
      y: newY
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
    setScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 翻訳の編集を保存する関数
  const handleTranslationChange = (index: number, newTranslation: string) => {
    setEditedTranslations(prev => ({
      ...prev,
      [`${currentSlide}-${index}`]: newTranslation
    }));

    // スライドの翻訳を更新
    const updatedSlides = [...slides];
    if (!updatedSlides[currentSlide].translations) {
      updatedSlides[currentSlide].translations = [];
    }
    updatedSlides[currentSlide].translations[index] = newTranslation;
    setSlides(updatedSlides);
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

  const handleDownload = useCallback(async () => {
    if (!isTranslationComplete) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slides }),
      });

      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translated_presentation.pptx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "成功",
        description: "ファイルのダウンロードが完了しました",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ダウンロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isTranslationComplete, slides, toast]);

  // 画像のサイズと位置を管理するための状態を追加
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // コンテナサイズの監視
  useEffect(() => {
    if (!containerRef.current) return;

    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    // 初期サイズを設定
    updateContainerSize();

    // リサイズ監視
    const observer = new ResizeObserver(updateContainerSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // 画像サイズの更新
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    let width, height;
    if (imageAspect > containerAspect) {
      width = containerRect.width;
      height = containerRect.width / imageAspect;
    } else {
      height = containerRect.height;
      width = containerRect.height * imageAspect;
    }

    setImageSize({ width, height });
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/save-translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slides,
          translations: editedTranslations,
        }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

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
                <Select value={sourceLang} onValueChange={setSourceLang}>
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
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="翻訳先言語" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">英語</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="flex gap-4">
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="翻訳元言語" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">英語</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="翻訳先言語" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">英語</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* プレビュー画面（大きく表示） */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">スライド {currentSlide + 1} / {slides.length}</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleZoom(scale - 0.1)}
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
                    onClick={() => handleZoom(scale + 0.1)}
                    title="拡大"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                >
                  前へ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlide === slides.length - 1}
                >
                  次へ
                </Button>
              </div>
            </div>
            {/* プレビュー表示エリア */}
            <div
              ref={containerRef}
              className="relative overflow-hidden bg-gray-100 rounded-lg border-2 border-orange-500"
              style={{
                height: "calc(100vh - 400px)",
                minHeight: "400px",
                cursor: isDragging ? "grabbing" : "grab"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 0.3s ease-out",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                {slides[currentSlide]?.image && (
                  <img
                    src={slides[currentSlide].image}
                    alt={`Slide ${currentSlide + 1}`}
                    className="max-w-full h-auto"
                    style={{ 
                      userSelect: "none",
                      maxHeight: "100%",
                      objectFit: "contain"
                    }}
                    onLoad={handleImageLoad}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* 原文と翻訳文の表示エリア */}
          <div className="space-y-4">
            {slides[currentSlide]?.texts?.map((text: any, index: number) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                {/* 原文 */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">原文 {index + 1}</h3>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{text.text}</p>
                </Card>
                {/* 翻訳文 */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">翻訳文 {index + 1}</h3>
                  </div>
                  <Textarea
                    value={editedTranslations[`${currentSlide}-${index}`] || ''}
                    onChange={(e) => {
                      const newTranslations = { ...editedTranslations };
                      newTranslations[`${currentSlide}-${index}`] = e.target.value;
                      setEditedTranslations(newTranslations);
                    }}
                    className="min-h-[100px] text-sm"
                    placeholder="翻訳文を入力"
                  />
                </Card>
              </div>
            ))}
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
