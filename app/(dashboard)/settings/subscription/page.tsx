import * as React from 'react';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'ベーシックプラン',
    price: '¥1,000',
    period: '月額',
    description: '個人向け有料プラン',
    features: [
      '月100ページ分（約10万文字）まで翻訳可能',
      '月10件までのファイル翻訳',
      'ファイルサイズ上限10MB',
      '年間契約で最大20%割引',
    ],
  },
  {
    name: 'プレミアムプラン',
    price: '¥3,000',
    period: '月額',
    description: 'ヘビーユーザー向け',
    features: [
      '月500ページ分（約50万文字）まで翻訳可能',
      '月50〜100件のファイル翻訳',
      'ファイルサイズ上限25MB',
      'Glossary機能強化',
      'チーム利用対応（用語集10件まで共有可）',
    ],
  },
];

export default function SubscriptionPage() {
  return (
    <div className="bg-card">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">サブスクリプション設定</h1>
          <p className="mt-4 text-lg text-muted-foreground">現在のプランと利用状況を確認・変更できます。</p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-border p-8 shadow-sm hover:shadow-lg transition-shadow bg-card">
              <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-muted-foreground">{plan.description}</p>
              <div className="mt-4 text-3xl font-bold text-foreground">
                {plan.price} <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="h-5 w-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="mt-8 block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                プランを変更する
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            プラン変更は次回の請求サイクルから適用されます。
            <br />
            ご不明な点がございましたら、サポートまでお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
