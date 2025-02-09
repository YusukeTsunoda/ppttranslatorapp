import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, BookOpen, Settings, Clock, CreditCard } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="bg-white">
      {/* ヒーローセクション */}
      <section className="py-20 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                プレゼン資料を
                <span className="block text-orange-500">瞬時に多言語展開</span>
              </h1>
              <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                AIを活用した高精度な翻訳で、PowerPointプレゼンテーションを素早く多言語化。
                ビジネスのグローバル展開をスピーディにサポートします。
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-lg px-8 py-4 inline-flex items-center justify-center">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="rounded-lg shadow-xl bg-white p-4">
                <img
                  src="/hero-image.png"
                  alt="PPT翻訳デモ"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 主要機能セクション */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ビジネスの多言語化を加速する機能
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                高精度AI翻訳
              </h3>
              <p className="text-gray-600">
                最新のAI技術を活用し、自然で正確な翻訳を提供。
                専門用語や業界特有の表現も的確に翻訳します。
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                RAGによる学習
              </h3>
              <p className="text-gray-600">
                過去の翻訳データや専門用語を学習し、
                翻訳の精度が継続的に向上。企業独自の表現も反映します。
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                即時翻訳
              </h3>
              <p className="text-gray-600">
                PPTファイルをアップロードするだけで瞬時に翻訳。
                レイアウトや書式を保持したまま多言語化が可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            シンプルな料金プラン
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                スタータープラン
              </h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                ¥1,000<span className="text-base font-normal text-gray-500">/月</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  月100ページまで翻訳可能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  7言語対応
                  <span className="text-xs ml-1">(日本語、英語、中国語、タイ語、韓国語、ベトナム語、インドネシア語)</span>
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  カスタム用語・専門用語の登録機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  7日間の無料トライアル
                </li>
              </ul>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                無料トライアルを開始
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-orange-500 relative lg:scale-105">
              <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-lg text-sm">
                おすすめ
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                プロフェッショナルプラン
              </h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                ¥3,000<span className="text-base font-normal text-gray-500">/月</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  スタータープランの全機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  対応言語の拡大
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  翻訳修正結果の自動学習機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  PPT、PDF、Webコンテンツの翻訳対応
                </li>
              </ul>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                今すぐ契約
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                エンタープライズプラン
              </h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                お問い合わせ
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  プロフェッショナルプランの全機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  カスタマイズ可能な翻訳エンジン
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  API連携
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  専任サポート担当者
                </li>
              </ul>
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                お問い合わせ
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-16 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            今すぐ始めましょう
          </h2>
          <p className="text-xl text-white mb-8">
            7日間の無料トライアルで、プレゼン資料の多言語化を体験してください。
          </p>
          <Button className="bg-white text-orange-500 hover:bg-gray-100 rounded-full text-lg px-8 py-4 inline-flex items-center justify-center">
            無料トライアルを開始
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </main>
  );
}
