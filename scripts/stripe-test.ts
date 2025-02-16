import Stripe from 'stripe';
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

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

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia'
});

async function testStripeConnection() {
  try {
    const balance = await stripe.balance.retrieve();
    console.log('Successfully connected to Stripe!');
    console.log('Current balance:', balance);
  } catch (error) {
    console.error('Error connecting to Stripe:', error);
  }
}

testStripeConnection(); 