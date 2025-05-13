import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const ACCENT = 'text-blue-600';
const ACCENT_BTN = 'bg-blue-600 hover:bg-blue-700 text-white';

const features = [
  'PowerPointファイルを直接アップロードして翻訳',
  '高精度なAI翻訳エンジンを使用',
  'スライドのレイアウトを保持したまま翻訳',
  '専門用語の一貫性を保つGlossary機能',
  'チーム内で用語集を共有可能',
];

const featureImages = [
  '/assets/feature-upload.svg',
  '/assets/feature-ai.svg',
  '/assets/feature-layout.svg',
  '/assets/feature-glossary.svg',
  '/assets/feature-team.svg',
];

const plans = [
  {
    name: 'ベーシック',
    price: '¥1,000',
    features: [
      '月100ページまで翻訳',
      'ファイル10件/月',
      '10MB/ファイル',
    ],
    buttonText: '無料で始める',
  },
  {
    name: 'プレミアム',
    price: '¥3,000',
    features: [
      '月500ページまで翻訳',
      'ファイル100件/月',
      '25MB/ファイル',
      'チーム利用対応',
    ],
    buttonText: '無料で始める',
    featured: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヒーローセクション */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-32 pb-16">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground mb-6 tracking-tight text-center">
          <span className="block">AIで</span>
          <span className={`block ${ACCENT}`}>パワポ翻訳</span>
          <span className="block">をもっとシンプルに</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl text-center mb-12">
          高精度AIでPowerPoint資料を一括翻訳。<br className="hidden sm:inline" />
          シンプルな料金プランで、すぐに始められます。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className={`w-48 ${ACCENT_BTN} text-lg font-semibold rounded-xl`}>
            <Link href="/signin">無料で始める</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-48 text-lg font-semibold rounded-xl border-2 border-foreground text-foreground bg-background hover:bg-muted">
            <Link href="#features">主な機能</Link>
          </Button>
        </div>
      </section>

      {/* 機能セクション */}
      <section id="features" className="w-full flex-1 flex flex-col items-center justify-center px-4 pb-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12 text-center">主な機能</h2>
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-between bg-muted rounded-2xl p-8 shadow-none border border-border min-h-[260px] h-full"
            >
              <img
                src={featureImages[idx]}
                alt={feature}
                className="w-16 h-16 mb-4 object-contain"
                loading="lazy"
              />
              <div className="flex items-center mb-2">
                <Check className={`h-6 w-6 mr-2 ${ACCENT}`} />
                <span className="text-lg text-foreground font-medium text-center">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* プラン比較セクション */}
      <section className="w-full flex-1 flex flex-col items-center justify-center px-4 pb-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12 text-center">料金プラン</h2>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col items-center p-10 rounded-3xl border border-border shadow-none bg-card transition-transform hover:scale-105 ${plan.featured ? 'ring-2 ring-foreground' : ''}`}
            >
              <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">{plan.name}</h3>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-base text-muted-foreground ml-2">/月</span>
              </div>
              <ul className="mb-10 space-y-3 w-full max-w-xs">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-muted-foreground text-base">
                    <Check className={`h-5 w-5 mr-2 ${ACCENT}`} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full py-4 text-lg font-semibold rounded-xl shadow-none border-none ${plan.featured ? ACCENT_BTN : 'bg-foreground hover:bg-muted text-background'}`}
                data-testid={`select-plan-${plan.name.toLowerCase()}`}
              >
                <Link href="/signin">{plan.buttonText}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
