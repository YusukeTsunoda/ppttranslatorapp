import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { User } from '@prisma/client';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

if (!process.env.BASE_URL) {
  throw new Error('BASE_URL environment variable is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true,
});

export async function createCheckoutSession({
  userId,
  priceId,
  email,
  successUrl,
  cancelUrl
}: {
  userId: string;
  priceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId
        }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: userId
        }
      },
      metadata: {
        userId: userId
      }
    });

    if (!session.url) {
      throw new Error('セッションURLの作成に失敗しました');
    }

    return session;
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    throw new Error('決済セッションの作成に失敗しました');
  }
}

export async function createCustomerPortalSession(user: User) {
  // ユーザーのStripe情報を取得
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      stripeCustomerId: true,
      stripeProductId: true
    }
  });

  if (!userData?.stripeCustomerId || !userData?.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(userData.stripeProductId);
    if (!product.active) {
      throw new Error("User's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the user's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: userData.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata.userId;
    if (!userId) {
      throw new Error('Subscription metadata does not contain userId');
    }

    const status = subscription.status;
    const priceId = subscription.items.data[0]?.price.id;
    const productName = subscription.items.data[0]?.price.product.toString();

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeProductId: priceId,
        planName: productName,
        subscriptionStatus: status
      }
    });

    return {
      userId,
      status,
      priceId
    };
  } catch (error) {
    console.error('Subscription update handling error:', error);
    throw error;
  }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata.userId;
    if (!userId) {
      throw new Error('Subscription metadata does not contain userId');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: 'canceled'
      }
    });
  } catch (error) {
    console.error('Subscription deletion handling error:', error);
    throw error;
  }
}

export async function validateStripeSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<Stripe.Event> {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Stripe signature validation error:', error);
    throw error;
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
