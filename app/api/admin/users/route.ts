import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { userFilterSchema, errorMessages } from '@/lib/utils/query-filter';
import { buildUserQuery, formatPaginatedResponse } from '@/lib/utils/query-builder';

export const dynamic = 'force-dynamic';

// 管理者用ユーザー一覧取得API
export async function GET(req: Request) {
  try {
    // 認証セッションの確認
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: errorMessages.unauthorized }, { status: 401 });
    }

    // 管理者権限の確認
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: errorMessages.forbidden }, { status: 403 });
    }

    const url = new URL(req.url);
    
    // クエリパラメータのパースとバリデーション
    const parseResult = userFilterSchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );
    
    // バリデーションエラーがある場合はエラーレスポンスを返す
    if (!parseResult.success) {
      const errors = parseResult.error.format();
      return NextResponse.json({ 
        error: 'クエリパラメータが無効です', 
        details: errors 
      }, { status: 400 });
    }
    
    // 検証済みのパラメータを取得
    const filterParams = parseResult.data;
    
    // Prismaクエリを構築
    const { where, orderBy, pagination } = buildUserQuery(filterParams);
    
    // クエリの実行とデータ取得をトランザクションで実行
    const [totalCount, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          credits: true,
          role: true,
          _count: {
            select: {
              File: true,
              TranslationHistory: true,
              ActivityLog: true
            }
          }
        },
      }),
    ]);
    
    // レスポンス形式の加工：センシティブな情報を除外し、利用統計を追加
    const enhancedUsers = await Promise.all(users.map(async user => {
      // クレジット使用状況の集計
      const creditStats = await prisma.translationHistory.aggregate({
        where: { userId: user.id },
        _sum: { creditsUsed: true },
        _avg: { creditsUsed: true },
        _count: true
      });

      // 直近のアクティビティを取得
      const recentActivity = await prisma.activityLog.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { type: true, description: true, createdAt: true }
      });

      return {
        ...user,
        // ユーザー統計情報
        statistics: {
          totalFiles: user._count.File,
          totalTranslations: user._count.TranslationHistory, 
          totalActivities: user._count.ActivityLog,
          totalCreditsUsed: creditStats._sum.creditsUsed || 0,
          avgCreditsPerTranslation: creditStats._avg.creditsUsed || 0
        },
        lastActivity: recentActivity,
        // 内部フィールドを削除
        _count: undefined
      };
    }));
    
    // アクティビティログに記録
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        type: 'ADMIN_USER_LIST',
        description: '管理者がユーザーリストを閲覧しました',
        metadata: {
          filters: filterParams,
          resultCount: totalCount
        }
      }
    });
    
    // 標準形式でレスポンスを返す
    return NextResponse.json(
      formatPaginatedResponse(
        enhancedUsers, 
        totalCount, 
        filterParams.page, 
        filterParams.limit
      )
    );
  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error);
    let errorMessage = 'ユーザー一覧の取得中にエラーが発生しました';
    if (error instanceof Error) {
      errorMessage = `詳細: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 