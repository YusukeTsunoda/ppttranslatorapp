import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーIDを取得
    const userId = session.user.id;
    console.log('履歴取得: ユーザーID', userId);

    try {
      // 翻訳履歴を取得
      const history = await prisma.translationHistory.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
      console.log('取得した翻訳履歴:', history);

      // 利用可能なクレジットを取得
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          credits: true,
        },
      });
      console.log('ユーザーのクレジット情報:', user);

      // 今月の翻訳数を取得
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyCount = await prisma.translationHistory.count({
        where: {
          userId: userId,
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
      });
      console.log('今月の翻訳数:', monthlyCount);

      const responseData = {
        history,
        credits: user?.credits || 0,
        monthlyCount,
      };
      console.log('レスポンスデータ:', responseData);

      return NextResponse.json(responseData);
    } catch (dbError) {
      console.error('データベースエラー:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('履歴取得エラー:', error);
    return NextResponse.json({ error: '履歴の取得中にエラーが発生しました' }, { status: 500 });
  }
}
