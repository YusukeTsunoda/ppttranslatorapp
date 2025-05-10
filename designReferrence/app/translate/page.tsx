"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Download, FileText, Globe, Upload, Check, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState("ja")
  const [targetLanguage, setTargetLanguage] = useState("en")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)

  // ドラッグ&ドロップ処理
  useEffect(() => {
    const dropArea = dropAreaRef.current
    if (!dropArea) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile.name.endsWith(".ppt") || droppedFile.name.endsWith(".pptx")) {
          setFile(droppedFile)
          // シミュレーション: アップロード中
          simulateUpload()
        }
      }
    }

    dropArea.addEventListener("dragover", handleDragOver)
    dropArea.addEventListener("dragleave", handleDragLeave)
    dropArea.addEventListener("drop", handleDrop)

    return () => {
      dropArea.removeEventListener("dragover", handleDragOver)
      dropArea.removeEventListener("dragleave", handleDragLeave)
      dropArea.removeEventListener("drop", handleDrop)
    }
  }, [])

  const simulateUpload = () => {
    setIsUploading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const simulateTranslation = () => {
    setIsTranslating(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTranslating(false)
          setIsComplete(true)
          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      simulateUpload()
    }
  }

  const handleTranslate = () => {
    simulateTranslation()
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleReset = () => {
    setFile(null)
    setIsComplete(false)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 言語交換機能
  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <Globe className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
            <span>PPT Translator</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium nav-link">
              ホーム
            </Link>
            <Link href="/translate" className="text-sm font-medium nav-link">
              翻訳
            </Link>
            <Link href="/profile" className="text-sm font-medium nav-link">
              プロフィール
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
              プレゼンテーションを翻訳
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              PowerPointファイルをアップロードして、簡単に翻訳しましょう
            </p>
          </div>

          <Card className="mx-auto max-w-2xl overflow-hidden animate-scale-in hover-glow dark:border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm mr-2">
                        1
                      </span>
                      ファイルを選択
                    </h3>
                    {file && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {file.name}
                        </span>
                        <button onClick={handleReset} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    ref={dropAreaRef}
                    className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 ${
                      isDragging
                        ? "border-primary bg-primary/5 file-drop-active"
                        : file
                          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                          : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                    }`}
                    onClick={handleBrowseClick}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {file ? (
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2 mb-2">
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400">ファイルが選択されました</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="mb-2 h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-primary">クリックしてアップロード</span>
                            またはドラッグ＆ドロップ
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">.pptx, .ppt (最大20MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".ppt,.pptx"
                      onChange={handleFileChange}
                    />
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>アップロード中...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm mr-2">
                      2
                    </span>
                    翻訳言語を選択
                  </h3>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">元の言語</label>
                      <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">英語</SelectItem>
                          <SelectItem value="zh">中国語</SelectItem>
                          <SelectItem value="ko">韓国語</SelectItem>
                          <SelectItem value="fr">フランス語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSwapLanguages}
                        className="rounded-full hover:bg-gray-100 transition-all duration-200"
                      >
                        <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                        <span className="sr-only">言語を入れ替え</span>
                      </Button>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">翻訳先の言語</label>
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">英語</SelectItem>
                          <SelectItem value="zh">中国語</SelectItem>
                          <SelectItem value="ko">韓国語</SelectItem>
                          <SelectItem value="fr">フランス語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm mr-2">
                      3
                    </span>
                    翻訳を開始
                  </h3>
                  <Button
                    className="w-full transition-all duration-300 hover:shadow-lg relative overflow-hidden group"
                    disabled={!file || isUploading || isTranslating}
                    onClick={handleTranslate}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isUploading ? (
                        "アップロード中..."
                      ) : isTranslating ? (
                        "翻訳中..."
                      ) : (
                        <>
                          翻訳を開始{" "}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                    {(isUploading || isTranslating) && (
                      <span
                        className="absolute inset-0 w-full bg-gradient-to-r from-primary/80 to-blue-600/80"
                        style={{ width: `${progress}%` }}
                      ></span>
                    )}
                  </Button>

                  {isTranslating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>翻訳中...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>

                {isComplete && (
                  <div className="rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 animate-scale-in">
                    <div className="flex flex-col items-center space-y-4 text-center">
                      <div className="rounded-full bg-green-100 dark:bg-green-800/30 p-2">
                        <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-green-800 dark:text-green-400">翻訳が完了しました！</h4>
                        <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                          ファイルの翻訳が正常に完了しました。ダウンロードボタンをクリックしてください。
                        </p>
                      </div>
                      <Button className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <Download className="h-4 w-4" />
                        翻訳ファイルをダウンロード
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 text-center animate-fade-in">
            <h2 className="text-xl font-bold mb-4">最近の翻訳</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover-lift"
                >
                  <div className="flex items-center space-x-3">
                    <div className="rounded-md bg-gray-100 dark:bg-gray-700 p-2">
                      <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 truncate">
                      <h4 className="font-medium text-sm truncate">プレゼンテーション_{i}.pptx</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">日本語 → 英語</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t py-6 md:py-8 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
              ホーム
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/translate" className="text-gray-500 hover:text-gray-900 transition-colors">
              翻訳
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/profile" className="text-gray-500 hover:text-gray-900 transition-colors">
              プロフィール
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500">© 2025 PPT Translator. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
