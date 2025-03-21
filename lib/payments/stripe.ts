/*
// 元のコード全体をコメントアウト
*/

import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';

// Stripeクライアントの初期化
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-08-16',
});

// ダミー実装
export async function createCheckoutSession({
  userId,
  priceId,
  email,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  priceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  console.log('Dummy checkout session created:', { userId, priceId, email });
  return { url: successUrl };
}

export async function createCustomerPortalSession(user: any) {
  console.log('Dummy customer portal session created:', user);
  return { url: '/dashboard' };
}

export async function handleSubscriptionUpdated(subscription: any) {
  console.log('Dummy subscription updated:', subscription);
  return {
    userId: subscription.metadata?.userId || 'dummy-user-id',
    status: 'active',
    priceId: 'dummy-price-id',
  };
}

export async function handleSubscriptionDeleted(subscription: any) {
  console.log('Dummy subscription deleted:', subscription);
  return true;
}

export async function validateStripeSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
): Promise<any> {
  console.log('Dummy stripe signature validation');
  return { type: 'dummy.event' };
}

export async function getStripePrices() {
  return [
    {
      id: 'price_dummy_monthly',
      product: { name: 'Basic Plan' },
      unit_amount: 1000,
      currency: 'jpy',
      recurring: { interval: 'month' },
    },
    {
      id: 'price_dummy_yearly',
      product: { name: 'Premium Plan' },
      unit_amount: 10000,
      currency: 'jpy',
      recurring: { interval: 'year' },
    },
  ];
}

export async function getStripeProducts() {
  return [
    {
      id: 'prod_dummy_basic',
      name: 'Basic Plan',
      description: 'Basic features',
    },
    {
      id: 'prod_dummy_premium',
      name: 'Premium Plan',
      description: 'All features',
    },
  ];
}
