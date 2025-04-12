import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { Language } from '@prisma/client';

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

    // URLからクエリパラメータを取得
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const sort = url.searchParams.get('sort') || 'createdAt';
    const order = url.searchParams.get('order') || 'desc';
    const search = url.searchParams.get('search') || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    const sourceLang = url.searchParams.get('sourceLang') as Language | null;
    const targetLang = url.searchParams.get('targetLang') as Language | null;

    // ページネーションの計算
    const skip = (page - 1) * limit;

    try {
      // フィルター条件の構築
      const whereCondition: any = {
        userId: userId,
      };

      // 検索キーワードがある場合
      if (search) {
        whereCondition.fileName = {
          contains: search,
          mode: 'insensitive',
        };
      }

      // 日付範囲フィルター
      if (startDate) {
        whereCondition.createdAt = {
          ...(whereCondition.createdAt || {}),
          gte: new Date(startDate),
        };
      }

      if (endDate) {
        whereCondition.createdAt = {
          ...(whereCondition.createdAt || {}),
          lte: new Date(endDate),
        };
      }

      // ステータスフィルター
      if (status) {
        whereCondition.status = status;
      }

      // 言語フィルター
      if (sourceLang) {
        whereCondition.sourceLang = sourceLang;
      }

      if (targetLang) {
        whereCondition.targetLang = targetLang;
      }

      // 総件数を取得
      const totalCount = await prisma.translationHistory.count({
        where: whereCondition,
      });

      // ソート条件の構築
      const orderByCondition: any = {};
      orderByCondition[sort] = order;

      // 翻訳履歴を取得
      const history = await prisma.translationHistory.findMany({
        where: whereCondition,
        orderBy: orderByCondition,
        skip,
        take: limit,
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

      // ページネーション情報を含むレスポンスデータ
      const responseData = {
        history,
        credits: user?.credits || 0,
        monthlyCount,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
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
