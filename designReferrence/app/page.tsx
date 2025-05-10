"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText, Globe, Upload, User, Check, Zap } from "lucide-react"
import { useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"

// スクロール時のアニメーション用のカスタムフック
const useScrollReveal = () => {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal")

    const reveal = () => {
      revealElements.forEach((element) => {
        const windowHeight = window.innerHeight
        const elementTop = element.getBoundingClientRect().top
        const elementVisible = 150

        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("active")
        }
      })
    }

    window.addEventListener("scroll", reveal)
    // 初期表示時にも実行
    reveal()

    return () => window.removeEventListener("scroll", reveal)
  }, [])
}

export default function LandingPage() {
  useScrollReveal()

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
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 overflow-hidden">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4 animate-slide-in">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
                    プレゼンテーションを瞬時に翻訳
                  </h1>
                  <p className="max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    PowerPointファイルをアップロードするだけで、高品質な翻訳が数秒で完了します。ビジネスのグローバル展開をサポートします。
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/translate">
                    <Button className="inline-flex h-10 items-center justify-center rounded-md px-8 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      今すぐ翻訳する
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative h-[350px] w-[450px] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 p-4 hover-lift animate-float">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <FileText className="h-64 w-64 text-gray-400 dark:text-gray-600" />
                  </div>
                  <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-4 text-center">
                    <div className="rounded-full bg-primary/10 p-3 animate-pulse-slow">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">簡単3ステップ</h3>
                      <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" /> PPTファイルをアップロード
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" /> 翻訳言語を選択
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" /> 翻訳されたファイルをダウンロード
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full bg-gray-50 dark:bg-gray-900 py-12 md:py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 opacity-50"></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center reveal">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
                  主な特徴
                </h2>
                <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  プレゼンテーションの翻訳を簡単かつ効率的に行うための機能
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3 md:gap-12">
              <div className="flex flex-col items-center space-y-2 text-center p-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 hover-lift reveal">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">多言語対応</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  50以上の言語に対応し、グローバルなコミュニケーションをサポート
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    英語
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    中国語
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    スペイン語
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    +47
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center p-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 hover-lift reveal">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">フォーマット保持</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  レイアウト、フォント、画像などの書式を維持したまま翻訳
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                  <div className="aspect-video rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Before</span>
                  </div>
                  <div className="aspect-video rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">After</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center p-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 hover-lift reveal">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">高速処理</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AIによる高速処理で、数十ページのプレゼンテーションも数分で翻訳
                </p>
                <div className="mt-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full w-3/4 animate-pulse-slow"></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">平均処理時間: 2分30秒</span>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 border-t dark:border-gray-800 reveal">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">お客様の声</h2>
                  <p className="text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    PPT Translatorを利用したユーザーからのフィードバック
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border dark:border-gray-700 p-4 hover-lift">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm">
                          「海外クライアントへのプレゼンテーションの準備時間が大幅に短縮されました。フォーマットが崩れないのが特に助かります。」
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          田中 健太 - マーケティングディレクター
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border dark:border-gray-700 p-4 hover-lift">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm">
                          「専門用語の翻訳精度が高く、技術プレゼンテーションでも安心して使用できます。時間と費用の節約になっています。」
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          佐藤 美咲 - エンジニアリングマネージャー
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="grid gap-4 sm:gap-6">
                    <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-6 shadow-sm hover-lift">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Globe className="h-8 w-8 text-primary" />
                        <h3 className="text-xl font-bold">10+</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">サポート言語</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-6 shadow-sm hover-lift">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <FileText className="h-8 w-8 text-primary" />
                        <h3 className="text-xl font-bold">100万+</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">翻訳済みスライド</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:gap-6">
                    <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-6 shadow-sm hover-lift">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <User className="h-8 w-8 text-primary" />
                        <h3 className="text-xl font-bold">5,000+</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ユーザー</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-6 shadow-sm hover-lift">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Zap className="h-8 w-8 text-primary" />
                        <h3 className="text-xl font-bold">98%</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">顧客満足度</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
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
