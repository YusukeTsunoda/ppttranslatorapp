import { checkoutAction } from '@/lib/payments/actions';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">料金プラン</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* フリープラン */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">フリープラン</h2>
          <p className="mb-4">基本的な翻訳機能を無料で利用できます</p>
          <ul className="mb-6 space-y-2">
            <li>✓ 月5件までの翻訳</li>
            <li>✓ 基本的な翻訳機能</li>
          </ul>
          <p className="text-2xl font-bold mb-6">¥0/月</p>
          <Button className="w-full" variant="outline">
            現在のプラン
          </Button>
        </div>

        {/* スタータープラン */}
        <div className="border rounded-lg p-6 bg-primary/5">
          <h2 className="text-2xl font-semibold mb-4">スタータープラン</h2>
          <p className="mb-4">個人や小規模チーム向けの充実プラン</p>
          <ul className="mb-6 space-y-2">
            <li>✓ 月50件までの翻訳</li>
            <li>✓ 高度な翻訳オプション</li>
            <li>✓ プライオリティサポート</li>
          </ul>
          <p className="text-2xl font-bold mb-6">¥2,980/月</p>
          <form action={checkoutAction}>
            <input type="hidden" name="priceId" value="price_starter" />
            <Button className="w-full" type="submit">
              アップグレード
            </Button>
          </form>
        </div>

        {/* プロフェッショナルプラン */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">プロフェッショナル</h2>
          <p className="mb-4">大規模チーム向けの最上位プラン</p>
          <ul className="mb-6 space-y-2">
            <li>✓ 無制限の翻訳</li>
            <li>✓ カスタム翻訳設定</li>
            <li>✓ 専属サポート担当者</li>
            <li>✓ API アクセス</li>
          </ul>
          <p className="text-2xl font-bold mb-6">¥9,800/月</p>
          <form action={checkoutAction}>
            <input type="hidden" name="priceId" value="price_professional" />
            <Button className="w-full" type="submit">
              アップグレード
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
