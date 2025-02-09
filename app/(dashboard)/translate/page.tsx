"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
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
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

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
  };

  const handleTranslate = async () => {
    if (!slides.length) return;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slideIndex: currentSlide,
          texts: slides[currentSlide].texts,
          targetLang: "en", // TODO: 言語選択から取得
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      // 翻訳結果を反映
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

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左側: ファイルアップロード & プレビューエリア */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">PPTファイルをアップロード</h2>
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
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
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
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
                <span className="text-gray-600">
                  {uploading
                    ? "アップロード中..."
                    : "クリックまたはドラッグ＆ドロップでファイルを選択"}
                </span>
                <span className="text-sm text-gray-500 mt-2">
                  .pptxファイルのみ対応
                </span>
              </label>
            </div>
          </Card>
          
          {/* プレビューエリア */}
          {slides.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                プレビュー（{currentSlide + 1} / {slides.length}）
              </h3>
              <div className="space-y-4">
                <div className="aspect-video bg-gray-100 rounded-lg p-4">
                  {slides[currentSlide].texts.map((text: any, index: number) => (
                    <div key={index} className="mb-2">
                      <p className="text-sm text-gray-600">{text.text}</p>
                      {text.translated_text && (
                        <p className="text-sm text-blue-600">{text.translated_text}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                  >
                    前へ
                  </Button>
                  <Button
                    onClick={() =>
                      setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))
                    }
                    disabled={currentSlide === slides.length - 1}
                  >
                    次へ
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 右側: 翻訳設定 & テキストエリア */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">翻訳設定</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">原文の言語</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">英語</SelectItem>
                    <SelectItem value="zh">中国語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">翻訳後の言語</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">英語</SelectItem>
                    <SelectItem value="zh">中国語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {slides.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">翻訳テキスト</h2>
              <div className="space-y-4">
                {slides[currentSlide].texts.map((text: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">原文</label>
                      <textarea
                        className="w-full h-24 mt-2 p-2 border rounded-md bg-gray-50"
                        readOnly
                        value={text.text}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">翻訳文</label>
                      <textarea
                        className="w-full h-24 mt-2 p-2 border rounded-md"
                        value={text.translated_text || ""}
                        onChange={(e) => {
                          const updatedSlides = [...slides];
                          updatedSlides[currentSlide].texts[index].translated_text =
                            e.target.value;
                          setSlides(updatedSlides);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Button className="w-full" onClick={handleTranslate}>
                  翻訳を更新
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
