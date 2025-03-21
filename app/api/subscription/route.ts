/*
// 元のコード全体をコメントアウト
*/

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

// サブスクリプション情報を取得するエンドポイント
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // ダミーのサブスクリプション情報を返す
    return NextResponse.json({
      subscription: {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('サブスクリプション情報取得エラー:', error);
    return NextResponse.json({ error: 'サブスクリプション情報の取得に失敗しました' }, { status: 500 });
  }
}

// サブスクリプションを作成するエンドポイント
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'プランIDが必要です' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // ダミーのチェックアウトセッションURLを返す
    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout_success=true`,
    });
  } catch (error) {
    console.error('サブスクリプション作成エラー:', error);
    return NextResponse.json({ error: 'サブスクリプションの作成に失敗しました' }, { status: 500 });
  }
}
