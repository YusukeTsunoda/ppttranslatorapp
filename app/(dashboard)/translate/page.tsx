'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sourceLang, setSourceLang] = useState("ja");
  const [targetLang, setTargetLang] = useState("en");
  const { toast } = useToast();
  const router = useRouter();

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
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include', // Cookieを含める
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
      setSlides(data.slides);
      toast({
        title: "アップロード成功",
        description: "ファイルの解析が完了しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "アップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [toast, router]);

  const handleTranslate = async () => {
    if (!slides.length) return;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Cookieを含める
        body: JSON.stringify({
          slideIndex: currentSlide,
          texts: slides[currentSlide].texts,
          sourceLang,
          targetLang,
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
      const updatedSlides = [...slides];
      updatedSlides[currentSlide].translations = data.translations;
      setSlides(updatedSlides);

      toast({
        title: "翻訳完了",
        description: "テキストの翻訳が完了しました",
      });
    } catch (error) {
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

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">PPTファイルをアップロード</h2>
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
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
              <svg
                className="w-12 h-12 text-gray-400 mb-4 mx-auto"
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
              <span className="text-gray-600 block">
                {uploading
                  ? "アップロード中..."
                  : "クリックまたはドラッグ＆ドロップでファイルを選択"}
              </span>
              <span className="text-sm text-gray-500 mt-2 block">
                PPTXファイルのみ対応
              </span>
            </div>
          </Card>

          {slides.length > 0 && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">スライド {currentSlide + 1} / {slides.length}</h2>
                <div className="flex gap-2">
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
              <div className="aspect-video bg-gray-100 rounded-lg mb-4">
                {/* TODO: スライドプレビュー */}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">翻訳設定</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  翻訳元言語
                </label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">英語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  翻訳先言語
                </label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">英語</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleTranslate}
              disabled={!slides.length}
            >
              翻訳を開始
            </Button>
          </Card>

          {slides[currentSlide]?.texts?.map((textObj: any, index: number) => (
            <Card key={index} className="p-6">
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
                <div className="p-3 bg-gray-50 rounded-md">
                  {slides[currentSlide]?.translations?.[index] || "未翻訳"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
