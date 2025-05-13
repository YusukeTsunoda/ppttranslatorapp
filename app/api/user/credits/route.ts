import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * ユーザーのクレジット残高を取得するAPI
 */
export async function GET() {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);

    // 未認証の場合はエラー
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザーIDを取得
    const userId = session.user.id;

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    // ユーザーが見つからない場合はエラー
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // クレジット残高を返す（クレジットが0以下の場合は0を返す）
    const credits = user.credits > 0 ? user.credits : 0;
    return NextResponse.json({ credits });
  } catch (error) {
    console.error('クレジット残高取得エラー:', error);
    return NextResponse.json(
      { error: 'クレジット残高の取得に失敗しました' },
      { status: 500 }
    );
  }
}
