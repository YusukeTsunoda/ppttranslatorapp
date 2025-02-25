import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createCheckoutSession } from '@/lib/payments/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: "価格IDが必要です" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';
    
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      priceId: priceId,
      email: session.user.email || '',
      successUrl: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "チェックアウトの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const searchParams = new URL(request.url).searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }

    // セッションIDが存在する場合は、ダッシュボードにリダイレクト
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Checkout completion error:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}
