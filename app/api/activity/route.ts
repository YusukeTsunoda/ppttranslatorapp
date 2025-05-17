import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { activityLogFilterSchema, errorMessages } from '@/lib/utils/query-filter';
import { buildActivityLogQuery, formatPaginatedResponse } from '@/lib/utils/query-builder';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: errorMessages.unauthorized }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const url = new URL(req.url);
    
    // クエリパラメータのパースとバリデーション
    const parseResult = activityLogFilterSchema.safeParse(
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
    
    // Prismaクエリを構築（管理者の場合は他のユーザーのログも参照可能）
    const { where, orderBy, pagination } = buildActivityLogQuery(filterParams, userId, isAdmin);
    
    // クエリの実行とデータ取得をトランザクションで実行
    const [totalCount, logs] = await prisma.$transaction([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // ファイルアクセスログの場合、関連するファイル情報を取得して追加
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        // ファイルアクセスまたはファイルアップロードの場合
        if (log.type === 'file_access' || log.type === 'file_upload' || log.type === 'FILE_UPLOAD') {
          const metadata = log.metadata as any;

          // ファイルIDがメタデータに含まれている場合
          if (metadata?.fileId || (metadata?.fileIds && metadata.fileIds.length > 0)) {
            try {
              const fileId = metadata.fileId || metadata.fileIds[0];
              const fileInfo = await prisma.file.findUnique({
                where: { id: fileId },
                select: {
                  originalName: true,
                  fileSize: true,
                  Slide: {
                    select: {
                      id: true,
                      index: true,
                      Text: {
                        select: {
                          id: true,
                          Translation: {
                            select: {
                              id: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              });

              if (fileInfo) {
                // 翻訳済みのスライド番号を抽出
                const translatedSlides = fileInfo.Slide.filter((slide) =>
                  slide.Text.some((text) => text.Translation.length > 0),
                ).map((slide) => slide.index + 1); // インデックスは0始まりなので+1

                // スライド数（ページ数）を計算
                const pageCount = fileInfo.Slide.length;

                // メタデータを拡張
                return {
                  ...log,
                  metadata: {
                    ...metadata,
                    fileName: fileInfo.originalName,
                    pageCount: pageCount,
                    translatedPages: translatedSlides,
                  },
                };
              }
            } catch (err) {
              console.error('ファイル情報取得エラー:', err);
            }
          }
        }

        return log;
      }),
    );
    
    // 標準形式でレスポンスを返す
    return NextResponse.json(
      formatPaginatedResponse(
        enhancedLogs, 
        totalCount, 
        filterParams.page, 
        filterParams.limit
      )
    );
  } catch (error) {
    console.error('アクティビティログ取得エラー:', error);
    return NextResponse.json({ error: 'アクティビティログの取得中にエラーが発生しました' }, { status: 500 });
  }
}
