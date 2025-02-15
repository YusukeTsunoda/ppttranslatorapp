import * as React from "react";
import Link from "next/link";

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    name: "ベーシックプラン",
    price: "¥1,000",
    period: "月額",
    description: "個人向け有料プラン",
    features: [
      "月100ページ分（約10万文字）まで翻訳可能",
      "月10件までのファイル翻訳",
      "ファイルサイズ上限10MB",
      "年間契約で最大20%割引",
    ],
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
      "チーム利用対応（用語集10件まで共有可）",
    ],
  },
];

export default function DashboardPricingPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            料金プラン
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            ニーズに合わせてお選びいただける料金プランです。プラン変更も自由に行えます。
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600">{plan.description}</p>
              <div className="mt-4 text-3xl font-bold text-gray-900">
                {plan.price}{" "}
                <span className="text-base font-normal text-gray-600">
                  {plan.period}
                </span>
              </div>
              <ul className="mt-6 space-y-2 text-gray-600">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/translate"
                className="mt-8 block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-white hover:bg-indigo-500"
              >
                今すぐ始める
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
