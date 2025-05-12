import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { Language, Prisma } from '@prisma/client';
import { TranslationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ソート可能なフィールドのリスト
const allowedSortFields: (keyof Prisma.TranslationHistoryOrderByWithRelationInput | 'originalFileName')[] = [
  'createdAt', 'updatedAt', 'pageCount', 'status', 'creditsUsed', 'sourceLang', 'targetLang', 'model', 'fileSize', 'processingTime', 'originalFileName'
];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const sortParam = searchParams.get('sort') || 'createdAt';
    const orderParam = searchParams.get('order') || 'desc';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const statusParam = searchParams.get('status');
    const sourceLangParam = searchParams.get('sourceLang');
    const targetLangParam = searchParams.get('targetLang');

    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : 10;

    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: '無効なページ番号です' }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: '無効な制限数です' }, { status: 400 });
    }

    if (orderParam !== 'asc' && orderParam !== 'desc') {
      return NextResponse.json({ error: '無効なソート順序です' }, { status: 400 });
    }

    // Allow sorting by originalFileName via relation
    const effectiveSortParam = sortParam === 'originalFileName' ? 'file' : sortParam;
    if (!allowedSortFields.includes(sortParam as any)) {
        return NextResponse.json({ error: `無効なソートキーです: ${sortParam}` }, { status: 400 });
    }

    const sourceLang = sourceLangParam && Object.values(Language).includes(sourceLangParam as Language)
                       ? sourceLangParam as Language
                       : null;
    const targetLang = targetLangParam && Object.values(Language).includes(targetLangParam as Language)
                       ? targetLangParam as Language
                       : null;
    // Validate status param against Enum
    const status = statusParam && Object.values(TranslationStatus).includes(statusParam as TranslationStatus)
                   ? statusParam as TranslationStatus
                   : null;

    const skip = (page - 1) * limit;

    const whereCondition: Prisma.TranslationHistoryWhereInput = {
      userId: userId,
    };

    if (search) {
      // Search by originalName in the related File model
      whereCondition.file = {
        originalName: {
          contains: search,
          mode: 'insensitive',
        }
      };
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      try {
        dateFilter.gte = new Date(startDate);
      } catch { /* ignore invalid date */ }
    }
    if (endDate) {
      try {
        dateFilter.lte = new Date(endDate);
      } catch { /* ignore invalid date */ }
    }
    if (dateFilter.gte || dateFilter.lte) {
      whereCondition.createdAt = dateFilter;
    }

    if (status) {
      whereCondition.status = status; // Use validated enum value
    }

    if (sourceLang) {
      whereCondition.sourceLang = sourceLang;
    }

    if (targetLang) {
      whereCondition.targetLang = targetLang;
    }

    // Handle sorting by related field
    let orderByCondition: Prisma.TranslationHistoryOrderByWithRelationInput | Prisma.TranslationHistoryOrderByWithRelationInput[];
    if (sortParam === 'originalFileName') {
        orderByCondition = {
            file: {
                originalName: orderParam,
            },
        };
    } else {
        orderByCondition = {
            [sortParam]: orderParam,
        } as Prisma.TranslationHistoryOrderByWithRelationInput;
    }

    const [totalCount, history] = await prisma.$transaction([
      prisma.translationHistory.count({ where: whereCondition }),
      prisma.translationHistory.findMany({
        where: whereCondition,
        orderBy: orderByCondition,
        skip,
        take: limit,
        include: {
          file: {
            select: {
              originalName: true,
            },
          },
        },
      }),
    ]);

    // Add originalFileNameと新フィールドをhistory objectsに追加
    const historyWithFileName = history.map(item => ({
        ...item,
        originalFileName: item.file.originalName,
        tags: item.tags,
        metadata: item.metadata,
        thumbnailPath: item.thumbnailPath,
        processingTime: item.processingTime,
        fileSize: item.fileSize,
      }));

    return NextResponse.json({
      data: historyWithFileName,
      total: totalCount,
      page,
      limit,
    });

  } catch (error) {
    console.error('履歴取得APIエラー:', error);
    let errorMessage = '履歴の取得中にエラーが発生しました';
    if (error instanceof Error) {
      errorMessage = `詳細: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
