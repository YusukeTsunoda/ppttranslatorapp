'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

const ACCENT = 'text-blue-600'; // アクセントカラー（青）
const ACCENT_BG = 'bg-blue-600';
const ACCENT_BTN = 'bg-blue-600 hover:bg-blue-700 text-white';

const plans = [
  {
    id: 'price_H5UGwpxnJVWdmh',
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
    id: 'price_H5UGxyzABCDefg',
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

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'チェックアウトの作成に失敗しました');
      if (data.url) router.push(data.url);
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'チェックアウトの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヒーローセクション */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-black mb-6 tracking-tight text-center">
          <span className="block">AIで</span>
          <span className={`block ${ACCENT}`}>パワポ翻訳</span>
          <span className="block">をもっとシンプルに</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 max-w-2xl text-center mb-12">
          高精度AIでPowerPoint資料を一括翻訳。<br className="hidden sm:inline" />
          シンプルな料金プランで、すぐに始められます。
        </p>
      </section>

      {/* プラン比較セクション */}
      <section className="w-full flex-1 flex flex-col items-center justify-center px-4 pb-24">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col items-center p-10 rounded-3xl border border-gray-200 shadow-none bg-white transition-transform hover:scale-105 ${plan.featured ? 'ring-2 ring-black' : ''}`}
            >
              <h2 className="text-2xl font-bold text-black mb-2 tracking-tight">{plan.name}</h2>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-black">{plan.price}</span>
                <span className="text-base text-gray-500 ml-2">/月</span>
              </div>
              <ul className="mb-10 space-y-3 w-full max-w-xs">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-800 text-base">
                    <Check className={`h-5 w-5 mr-2 ${ACCENT}`} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-4 text-lg font-semibold rounded-xl shadow-none border-none ${plan.featured ? ACCENT_BTN : 'bg-black hover:bg-gray-900 text-white'}`}
                data-testid={`select-plan-${plan.name.toLowerCase()}`}
              >
                {loading === plan.id ? '処理中...' : plan.buttonText}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
