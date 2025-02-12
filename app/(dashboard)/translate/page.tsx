'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Download } from "lucide-react";

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const { toast } = useToast();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false); // TODO: 実際のユーザー情報から取得
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editedTranslations, setEditedTranslations] = useState<{ [key: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslationComplete, setIsTranslationComplete] = useState(false);

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

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pptx")) {
      toast({
        title: "エラー",
        description: "PPTXファイルのみ対応しています",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setIsTranslationComplete(false); // 新しいファイルがアップロードされたらリセット
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
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      console.log('Slide data:', data.slides[0]);
      setSlides(data.slides);
      toast({
        title: "アップロード成功",
        description: "ファイルの解析が完了しました",
      });

      // アップロード成功後、自動的に翻訳を開始
      if (data.slides && data.slides.length > 0) {
        await handleTranslateSlide(data.slides, 0);
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

      if (response.status === 401) {
        toast({
          title: "エラー",
          description: "セッションが切れました。再度ログインしてください。",
          variant: "destructive",
        });
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '翻訳に失敗しました');
      }

      const data = await response.json();
      console.log('Translation response for slide', slideIndex, ':', data);

      // 翻訳データを保存
      const updatedSlides = [...slides];
      if (!updatedSlides[slideIndex].translations) {
        updatedSlides[slideIndex].translations = [];
      }
      updatedSlides[slideIndex].translations = data.translations;
      console.log('Updated translations for slide', slideIndex, ':', updatedSlides[slideIndex].translations);
      setSlides(updatedSlides);

      // 次のスライドがある場合は、それも翻訳
      if (slideIndex < slides.length - 1) {
        await handleTranslateSlide(updatedSlides, slideIndex + 1);
      } else {
        setIsTranslationComplete(true); // すべてのスライドの翻訳が完了
        toast({
          title: "翻訳完了",
          description: "すべてのスライドの翻訳が完了しました",
        });
      }
    } catch (error) {
      console.error('Translation error for slide', slideIndex, ':', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "翻訳に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
      [index]: newTranslation
    }));

    // スライドの翻訳を更新
    const updatedSlides = [...slides];
    if (!updatedSlides[currentSlide].translations) {
      updatedSlides[currentSlide].translations = [];
    }
    updatedSlides[currentSlide].translations[index] = newTranslation;
    setSlides(updatedSlides);
  };

  // スライド変更時に編集状態をリセット
  useEffect(() => {
    setEditedTranslations({});
  }, [currentSlide]);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      
      // 翻訳済みデータを準備
      const fileId = slides[0]?.fileId;  // fileIdを取得
      if (!fileId) {
        throw new Error('ファイルIDが見つかりません');
      }

      const translations = slides.map((slide) => ({
        index: slide.index,
        texts: slide.texts.map((text: { text: string; }, idx: number) => {
          const translation = slide.translations?.[idx];
          console.log(`Slide ${slide.index}, Text ${idx}:`, {
            originalText: text.text,
            translation: translation
          });
          return {
            text: text.text,
            translation: translation || null,
          };
        }),
      }));

      // デバッグ用のログ出力を追加
      console.log('Full translation data:', JSON.stringify(translations, null, 2));
      
      // PPTXファイル生成をリクエスト
      const response = await fetch('/api/pptx/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          translations
        }),
        credentials: 'include',  // セッションCookieを含める
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PPTX');
      }
      
      const data = await response.json();
      
      // ダウンロードリンクを生成
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = 'translated_presentation.pptx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "ダウンロード開始",
        description: "翻訳済みのPPTXファイルのダウンロードを開始しました。",
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "PPTXファイルの生成に失敗しました。",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">PPTファイルをアップロード</h2>
              <div 
                className="border-2 border-dashed rounded-lg p-2 text-center cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400"
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
                  <span className="text-sm text-gray-600">
                    {uploading ? "アップロード中..." : "ファイルを選択"}
                  </span>
                </div>
              </div>
              {slides.length > 0 && (
                <Button
                  onClick={handleDownload}
                  disabled={isGenerating || !isTranslationComplete}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : !isTranslationComplete ? (
                    "翻訳完了までお待ちください..."
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      PPTXをダウンロード
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>

          {slides.length > 0 && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">スライド {currentSlide + 1} / {slides.length}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 mr-4">
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
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 relative overflow-hidden"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {slides[currentSlide]?.image_path ? (
                  <div 
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                      transformOrigin: 'center',
                      transition: isDragging ? 'none' : 'transform 0.2s'
                    }}
                  >
                    {/* スライドのメタデータをコンソールに出力（一度だけ） */}
                    {currentSlide === 0 && (
                      <>
                        {(console.log('Initial slide metadata:', slides[0]?.metadata), null)}
                        {(console.log('Slide dimensions:', slides[0]?.metadata?.dimensions), null)}
                        {null}
                      </>
                    )}
                    
                    <div 
                      className="relative"
                      style={{ 
                        width: '720px',
                        height: '405px',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        transform: 'scale(1)',
                        transformOrigin: 'top left',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={`/api/slides/${encodeURIComponent(slides[currentSlide].image_path)}`}
                        alt={`Slide ${currentSlide + 1}`}
                        className="w-full h-full object-contain"
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '100%',
                          position: 'relative',
                          zIndex: 1
                        }}
                        draggable={false}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log('Loaded image dimensions:', {
                            natural: {
                              width: img.naturalWidth,
                              height: img.naturalHeight
                            },
                            display: {
                              width: img.width,
                              height: img.height
                            }
                          });
                        }}
                      />
                      {slides[currentSlide]?.texts?.map((textObj: any, index: number) => {
                        const position = textObj.position;
                        
                        // スケール係数を画像サイズに基づいて計算
                        const scaleX = 720 / 1225;  // PPTXの標準幅は9144 EMU
                        const scaleY = 405 / 690;  // PPTXの標準高さは5143 EMU
                        
                        const scaledPosition = {
                          x: Math.round(position.x * scaleX),
                          y: Math.round(position.y * scaleY),
                          width: Math.round(position.width * scaleX),
                          height: Math.round(position.height * scaleY)
                        };
                        
                        return (
                          <div
                            key={index}
                            className={`absolute border-2 transition-colors duration-200 ${
                              selectedTextIndex === index ? 'border-orange-500 bg-orange-100/20' : 'border-orange-300/50'
                            }`}
                            style={{
                              left: `${scaledPosition.x}px`,
                              top: `${scaledPosition.y}px`,
                              width: `${scaledPosition.width}px`,
                              height: `${scaledPosition.height}px`,
                              zIndex: 2,
                              pointerEvents: 'auto'
                            }}
                            onClick={() => setSelectedTextIndex(index)}
                            onMouseEnter={() => setSelectedTextIndex(index)}
                            onMouseLeave={() => setSelectedTextIndex(null)}
                          >
                            {selectedTextIndex === index && (
                              <span className="absolute -top-6 left-0 bg-orange-500 text-white px-2 py-1 text-xs rounded z-20">
                                テキスト {index + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    スライドプレビューを読み込めません
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">翻訳設定</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    翻訳元言語
                  </label>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">英語</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    翻訳先言語
                  </label>
                  <Select value={targetLang} onValueChange={(value) => {
                    setTargetLang(value);
                    // 翻訳先言語が変更された場合、翻訳元言語を自動的に反対の言語に設定
                    setSourceLang(value === "ja" ? "en" : "ja");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="en">英語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  翻訳モデル
                </label>
                <Select 
                  value={selectedModel} 
                  onValueChange={setSelectedModel}
                  disabled={!isPremium && selectedModel !== "claude-3-haiku-20240307"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map(model => (
                      <SelectItem
                        key={model.value}
                        value={model.value}
                        disabled={!isPremium && model.premium}
                      >
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-gray-500">{model.description}</span>
                          {model.premium && !isPremium && (
                            <span className="text-xs text-orange-500">Premiumプラン限定</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
            {slides[currentSlide]?.texts?.map((textObj: any, index: number) => (
              <Card 
                key={index} 
                className={`p-6 cursor-pointer transition-all duration-200 ${
                  selectedTextIndex === index ? 'ring-2 ring-orange-500' : ''
                }`}
                onClick={() => setSelectedTextIndex(index)}
                onMouseEnter={() => setSelectedTextIndex(index)}
                onMouseLeave={() => setSelectedTextIndex(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-500">テキスト {index + 1}</span>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    原文
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">{textObj.text}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    翻訳文
                  </label>
                  <Textarea
                    value={
                      editedTranslations[index] !== undefined
                        ? editedTranslations[index]
                        : slides[currentSlide]?.translations?.[index] || ""
                    }
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTranslationChange(index, e.target.value)}
                    placeholder="翻訳文を入力"
                    className="min-h-[100px] bg-gray-50"
                  />
                  {editedTranslations[index] !== undefined && (
                    <p className="text-xs text-orange-500 mt-1">
                      ※ 編集済み
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
