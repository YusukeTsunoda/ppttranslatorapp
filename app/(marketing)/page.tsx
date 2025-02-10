import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

const features = [
  "PowerPointファイルを直接アップロードして翻訳",
  "高精度なAI翻訳エンジンを使用",
  "スライドのレイアウトを保持したまま翻訳",
  "専門用語の一貫性を保つGlossary機能",
  "チーム内で用語集を共有可能",
];

const pricingPlans = [
  {
    name: "ベーシックプラン",
    price: "¥1,000",
    period: "月額",
    description: "個人向け有料プラン",
    features: [
      "月100ページ分（約10万文字）まで翻訳可能",
      "月10件までのファイル翻訳",
      "ファイルサイズ上限10MB",
      "年間契約で最大20%割引"
    ]
  },
  {
    name: "プレミアムプラン",
    price: "¥3,000",
    period: "月額",
    description: "ヘビーユーザー向け",
    features: [
      "月500ページ分（約50万文字）まで翻訳可能",
      "月50〜100件のファイル翻訳",
      "ファイルサイズ上限25MB",
      "Glossary機能強化",
      "チーム利用対応（用語集10件まで共有可）"
    ]
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      {/* ヒーローセクション */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[50%] top-0 h-[48rem] w-[48rem] -translate-x-1/2 bg-gradient-radial from-orange-100 to-transparent opacity-20 blur-2xl"></div>
        </div>
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-8 leading-tight">
            PowerPointスライドを<br />
            <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">瞬時に翻訳</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed">
            AIを活用した高精度な翻訳で、プレゼンテーションの<br />国際化をスムーズにサポート
          </p>
          <div className="flex justify-center gap-6">
            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 px-8">
              <Link href="/sign-up" className="flex items-center">
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2">
              <Link href="#pricing">料金プランを見る</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 機能セクション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">主な機能</span>
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="group p-6 bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-xl shadow-orange-100/50 hover:shadow-orange-200/50 transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-orange-500 group-hover:text-orange-600 transition-colors" />
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">{feature}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 料金プランセクション */}
      <div id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">料金プラン</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <div key={index} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-gray-900">{plan.price}</div>
                    <div className="text-gray-600">{plan.period}</div>
                  </div>
                </div>
                <ul className="space-y-5 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-4">
                      <CheckCircle className="h-5 w-5 text-orange-500 mt-1" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 shadow-lg shadow-orange-600/20">
                  <Link href="/sign-up">プランを選択</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
