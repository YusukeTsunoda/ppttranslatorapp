'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "¥0",
    description: "個人利用に最適",
    features: [
      "月5ファイルまで翻訳可能",
      "基本的な翻訳機能",
      "Claude 3 Haikuモデル",
      "ファイル履歴7日間",
    ],
    buttonText: "無料で始める",
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: "¥2,980",
    description: "プロフェッショナル向け",
    features: [
      "無制限のファイル翻訳",
      "高品質な翻訳機能",
      "Claude 3 Sonnetモデル",
      "ファイル履歴30日間",
      "優先サポート",
    ],
    buttonText: "アップグレード",
    href: "/checkout?plan=pro",
    featured: true,
  },
  {
    name: "Team",
    price: "¥9,800",
    description: "チーム利用に最適",
    features: [
      "無制限のファイル翻訳",
      "高品質な翻訳機能",
      "Claude 3 Sonnetモデル",
      "ファイル履歴無制限",
      "優先サポート",
      "チームメンバー5名まで",
      "共有ライブラリ",
    ],
    buttonText: "チームプランを選択",
    href: "/checkout?plan=team",
  },
];

export default function PricingPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-base font-semibold leading-7 text-orange-600">料金プラン</h1>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            あなたのニーズに合わせたプランをお選びください
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
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
                    人気
                  </div>
                </div>
              )}
              <div className="flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-lg font-semibold leading-8 text-gray-900">{plan.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">{plan.price}</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">/月</span>
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
                    asChild
                    className={`w-full ${
                      plan.featured ? "bg-orange-600 hover:bg-orange-500" : ""
                    }`}
                    data-testid={`select-plan-${plan.name.toLowerCase()}`}
                  >
                    <Link href={plan.href}>{plan.buttonText}</Link>
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