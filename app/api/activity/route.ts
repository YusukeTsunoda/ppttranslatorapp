import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // URLからクエリパラメータを取得
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // ユーザーIDを取得
    const userId = session.user.id;

    // アクティビティログを取得
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // ファイルアクセスログの場合、関連するファイル情報を取得して追加
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        // ファイルアクセスまたはファイルアップロードの場合
        if (log.type === 'file_access' || log.type === 'file_upload') {
          const metadata = log.metadata as any;
          
          // ファイルIDがメタデータに含まれている場合
          if (metadata?.fileId) {
            try {
              const fileInfo = await prisma.file.findUnique({
                where: { id: metadata.fileId },
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
                const translatedSlides = fileInfo.Slide
                  .filter(slide => slide.Text.some(text => text.Translation.length > 0))
                  .map(slide => slide.index + 1); // インデックスは0始まりなので+1

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
      })
    );

    // 総件数を取得
    const total = await prisma.activityLog.count({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json({
      logs: enhancedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + logs.length < total,
      },
    });
  } catch (error) {
    console.error("アクティビティログ取得エラー:", error);
    return NextResponse.json(
      { error: "アクティビティログの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 