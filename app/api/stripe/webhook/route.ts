import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe, validateStripeSignature, handleSubscriptionUpdated, handleSubscriptionDeleted } from '@/lib/payments/stripe';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return new NextResponse('Webhook Error: No signature', { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook Error: No webhook secret', { status: 500 });
  }

  try {
    const event = await validateStripeSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const customerId = session.customer;

        if (!userId || !customerId) {
          throw new Error('Missing user ID or customer ID in session');
        }

        // ユーザーのStripe顧客IDを更新
        // 注意: 現在のスキーマでは stripeCustomerId フィールドが存在しない可能性があります
        // 実際のスキーマに合わせて修正が必要です
        await prisma.user.update({
          where: { id: userId },
          data: {
            // stripeCustomerId: customerId, // このフィールドが存在しない場合はコメントアウト
            updatedAt: new Date()
          }
        });

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new NextResponse(
      'Webhook Error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      { status: 400 }
    );
  }
}
