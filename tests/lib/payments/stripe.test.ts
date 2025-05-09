import {
  stripe,
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  validateStripeSignature,
  getStripePrices,
  getStripeProducts
} from '@/lib/payments/stripe';

// コンソール出力をモック
const originalConsoleLog = console.log;
let consoleOutput: any[] = [];

describe('Stripe決済ユーティリティ', () => {
  beforeEach(() => {
    // コンソール出力をキャプチャ
    consoleOutput = [];
    console.log = jest.fn((...args) => {
      consoleOutput.push(args);
    });
  });

  afterEach(() => {
    // コンソール出力を元に戻す
    console.log = originalConsoleLog;
  });

  describe('createCheckoutSession', () => {
    it('チェックアウトセッションを作成できる', async () => {
      const params = {
        userId: 'test-user-id',
        priceId: 'test-price-id',
        email: 'test@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await createCheckoutSession(params);
      
      // 結果を検証
      expect(result).toHaveProperty('url');
      expect(result.url).toBe(params.successUrl);
      
      // コンソール出力を検証
      expect(consoleOutput.length).toBeTruthy();
      expect(consoleOutput[0][0]).toBe('Dummy checkout session created:');
      expect(consoleOutput[0][1]).toEqual({
        userId: params.userId,
        priceId: params.priceId,
        email: params.email,
      });
    });
  });

  describe('createCustomerPortalSession', () => {
    it('カスタマーポータルセッションを作成できる', async () => {
      const user = { id: 'test-user-id', email: 'test@example.com' };
      
      const result = await createCustomerPortalSession(user);
      
      // 結果を検証
      expect(result).toHaveProperty('url');
      expect(result.url).toBe('/dashboard');
      
      // コンソール出力を検証
      expect(consoleOutput.length).toBeTruthy();
      expect(consoleOutput[0][0]).toBe('Dummy customer portal session created:');
      expect(consoleOutput[0][1]).toEqual(user);
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('サブスクリプション更新を処理できる', async () => {
      const subscription = {
        id: 'sub_123',
        metadata: { userId: 'test-user-id' },
        status: 'active',
      };
      
      const result = await handleSubscriptionUpdated(subscription);
      
      // 結果を検証
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priceId');
      expect(result.userId).toBe(subscription.metadata.userId);
      expect(result.status).toBe('active');
      
      // コンソール出力を検証
      expect(consoleOutput.length).toBeTruthy();
      expect(consoleOutput[0][0]).toBe('Dummy subscription updated:');
      expect(consoleOutput[0][1]).toEqual(subscription);
    });

    it('メタデータがない場合はデフォルト値を使用する', async () => {
      const subscription = {
        id: 'sub_123',
        status: 'active',
      };
      
      const result = await handleSubscriptionUpdated(subscription);
      
      expect(result.userId).toBe('dummy-user-id');
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('サブスクリプション削除を処理できる', async () => {
      const subscription = {
        id: 'sub_123',
        status: 'canceled',
      };
      
      const result = await handleSubscriptionDeleted(subscription);
      
      // 結果を検証
      expect(result).toBe(true);
      
      // コンソール出力を検証
      expect(consoleOutput.length).toBeTruthy();
      expect(consoleOutput[0][0]).toBe('Dummy subscription deleted:');
      expect(consoleOutput[0][1]).toEqual(subscription);
    });
  });

  describe('validateStripeSignature', () => {
    it('Stripe署名を検証できる', async () => {
      const payload = 'test-payload';
      const signature = 'test-signature';
      const webhookSecret = 'test-webhook-secret';
      
      const result = await validateStripeSignature(payload, signature, webhookSecret);
      
      // 結果を検証
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('dummy.event');
      
      // コンソール出力を検証
      expect(consoleOutput.length).toBeTruthy();
      expect(consoleOutput[0][0]).toBe('Dummy stripe signature validation');
    });
  });

  describe('getStripePrices', () => {
    it('Stripe料金プランを取得できる', async () => {
      const prices = await getStripePrices();
      
      // 結果を検証
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBe(2);
      
      // 各料金プランの構造を検証
      prices.forEach(price => {
        expect(price).toHaveProperty('id');
        expect(price).toHaveProperty('product');
        expect(price).toHaveProperty('unit_amount');
        expect(price).toHaveProperty('currency');
        expect(price).toHaveProperty('recurring');
      });
      
      // 具体的な値を検証
      expect(prices[0].id).toBe('price_dummy_monthly');
      expect(prices[1].id).toBe('price_dummy_yearly');
    });
  });

  describe('getStripeProducts', () => {
    it('Stripe製品を取得できる', async () => {
      const products = await getStripeProducts();
      
      // 結果を検証
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(2);
      
      // 各製品の構造を検証
      products.forEach(product => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('description');
      });
      
      // 具体的な値を検証
      expect(products[0].id).toBe('prod_dummy_basic');
      expect(products[1].id).toBe('prod_dummy_premium');
    });
  });
});
