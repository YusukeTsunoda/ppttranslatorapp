import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Prisma } from '@prisma/client';
import { translationPrisma } from '@/lib/db/prisma';
import { translationUtils } from '@/lib/db/db-utils';
import { translationHistoryFilterSchema, errorMessages } from '@/lib/utils/query-filter';
import { buildTranslationHistoryQuery, formatPaginatedResponse } from '@/lib/utils/query-builder';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 認証セッションの確認
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: errorMessages.unauthorized }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    
    // クエリパラメータのパースとバリデーション
    const parseResult = translationHistoryFilterSchema.safeParse(
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
    const { where, orderBy, pagination } = buildTranslationHistoryQuery(filterParams, userId);
    
    // クエリの実行とデータ取得をトランザクションで実行
    const [totalCount, history] = await translationPrisma.$transaction([
      translationPrisma.translationHistory.count({ where }),
      translationPrisma.translationHistory.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          creditsUsed: true,
          sourceLang: true,
          targetLang: true,
          model: true,
          createdAt: true,
          updatedAt: true,
          pageCount: true,
          fileSize: true,
          status: true,
          processingTime: true,
          tags: true,
          metadata: true,
          thumbnailPath: true,
          file: {
            select: {
              originalName: true,
            },
          },
        },
      }),
    ]);
    
    // レスポンス形式の加工
    const historyWithFileName = history.map(item => ({
      ...item,
      originalFileName: item.file.originalName,
    }));
    
    // 標準形式でレスポンスを返す
    return NextResponse.json(
      formatPaginatedResponse(
        historyWithFileName, 
        totalCount, 
        filterParams.page, 
        filterParams.limit
      )
    );
    
  } catch (error) {
    console.error('履歴取得APIエラー:', error);
    let errorMessage = '履歴の取得中にエラーが発生しました';
    if (error instanceof Error) {
      errorMessage = `詳細: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
