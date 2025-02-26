'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const plans = [
  {
    id: "price_H5UGwpxnJVWdmh", // Stripeの価格ID
    name: "ベーシックプラン",
    price: "¥1,000",
    description: "個人向け有料プラン",
    features: [
      "月100ページ分（約10万文字）まで翻訳可能",
      "月10件までのファイル翻訳",
      "ファイルサイズ上限10MB",
      "年間契約で最大20%割引"
    ],
    buttonText: "無料で始める",
  },
  {
    id: "price_H5UGxyzABCDefg", // Stripeの価格ID
    name: "プレミアムプラン",
    price: "¥3,000",
    description: "ヘビーユーザー向け",
    features: [
      "月500ページ分（約50万文字）まで翻訳可能",
      "月50〜100件のファイル翻訳",
      "ファイルサイズ上限25MB",
      "Glossary機能強化",
      "チーム利用対応（用語集10件まで共有可）"
    ],
    buttonText: "無料で始める",
    featured: true,
  }
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'チェックアウトの作成に失敗しました');
      }

      if (data.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "チェックアウトの作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-base font-semibold leading-7 text-orange-600">料金プラン</h1>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            あなたのニーズに合わせたプランをお選びください
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ring-1 ring-gray-200 rounded-3xl p-8 xl:p-10 ${
                plan.featured ? "bg-orange-50" : ""
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 right-8">
                  <div className="rounded-full bg-orange-600 px-4 py-1 text-xs font-semibold leading-5 text-white">
                    おすすめ
                  </div>
                </div>
              )}
              <div className="flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-lg font-semibold leading-8 text-gray-900">{plan.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">{plan.price}</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">/月額</span>
                  </p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <Check className="h-6 w-5 flex-none text-orange-600" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto">
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full ${
                      plan.featured ? "bg-orange-600 hover:bg-orange-500" : ""
                    }`}
                    data-testid={`select-plan-${plan.name.toLowerCase()}`}
                  >
                    {loading === plan.id ? "処理中..." : plan.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 