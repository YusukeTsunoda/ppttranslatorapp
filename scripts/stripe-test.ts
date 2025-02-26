import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// デバッグログを追加
console.log('Starting Stripe test script...');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// 環境変数を読み込む（プロジェクトルートの.envファイルを指定）
const envPath = resolve(__dirname, '../.env');
console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

// 環境変数の状態をログ出力（機密情報は一部マスク）
console.log('Environment variables loaded:', {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'sk_test_....' + process.env.STRIPE_SECRET_KEY.slice(-4) : undefined,
  NODE_ENV: process.env.NODE_ENV,
});

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーがテスト環境のものかチェック
if (!stripeSecretKey.startsWith('sk_test_')) {
  console.error('Please use a test environment API key (starts with sk_test_)');
  process.exit(1);
}

console.log('Initializing Stripe client...');
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-08-16'
});

async function testStripeConnection() {
  try {
    console.log('Attempting to retrieve Stripe balance...');
    const balance = await stripe.balance.retrieve();
    console.log('Successfully connected to Stripe!');
    console.log('Current balance:', balance);
  } catch (error) {
    console.error('Error connecting to Stripe:', error);
    // エラーの詳細情報を出力
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

console.log('Starting connection test...');
testStripeConnection().catch(error => {
  console.error('Unhandled error in testStripeConnection:', error);
  process.exit(1);
}); 