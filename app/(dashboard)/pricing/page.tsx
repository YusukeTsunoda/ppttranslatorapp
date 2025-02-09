import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const starterPlan = products.find((product) => product.name === 'Starter');
  const proPlan = products.find((product) => product.name === 'Professional');

  const starterPrice = prices.find((price) => price.productId === starterPlan?.id);
  const proPrice = prices.find((price) => price.productId === proPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
        料金プラン
      </h1>
      <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
        ニーズに合わせて最適なプランをお選びください。スタータープランは7日間の無料トライアルをご利用いただけます。
      </p>
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name="スタータープラン"
          price={1000}
          interval="month"
          trialDays={14}
          features={[
            '月間100ページまで翻訳可能',
            '対応言語：日本語、英語、中国語、タイ語、韓国語、ベトナム語、インドネシア語',
            'カスタム用語・専門用語の登録機能',
            'メールサポート',
          ]}
          priceId={starterPrice?.id}
          buttonText="無料トライアルを開始"
          isPopular={false}
        />
        <PricingCard
          name="プロフェッショナルプラン"
          price={3000}
          interval="month"
          trialDays={0}
          features={[
            'スタータープランの全機能',
            '対応言語の拡大',
            '翻訳修正結果の自動学習機能',
            'PPT、PDF、Webコンテンツの翻訳対応',
          ]}
          priceId={proPrice?.id}
          buttonText="今すぐ契約"
          isPopular={true}
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  buttonText,
  isPopular,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  buttonText: string;
  isPopular: boolean;
}) {
  return (
    <div className={`pt-6 rounded-xl border ${isPopular ? 'border-orange-500' : 'border-gray-200'} p-8 relative`}>
      {isPopular && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-lg text-sm">
          おすすめ
        </div>
      )}
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      {trialDays > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          {trialDays}日間の無料トライアル付き
        </p>
      )}
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ¥{price.toLocaleString()}{' '}
        <span className="text-xl font-normal text-gray-600">
          /月
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton className={`w-full ${isPopular ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-900 hover:bg-gray-800'} text-white`}>
          {buttonText}
        </SubmitButton>
      </form>
    </div>
  );
}
