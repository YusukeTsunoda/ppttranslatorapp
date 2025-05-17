import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { translationPrisma } from '@/lib/db/prisma';
import { translationUtils } from '@/lib/db/db-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    const historyId = params.id;

    // 1. 最初に履歴の存在チェックと基本情報取得（軽量クエリ）
    const historyExists = await translationPrisma.translationHistory.findUnique({
      where: {
        id: historyId,
        userId: userId, // 取得時にユーザーIDも条件に含める
      },
      select: { id: true, fileId: true }
    });

    // 履歴が見つからない、または自分のものでない場合
    if (!historyExists) {
      return NextResponse.json({ error: '履歴が見つかりません' }, { status: 404 });
    }

    // 2. 必要な情報だけを効率的に取得するために分割クエリを実行
    const [historyBasic, fileWithSlides] = await translationPrisma.$transaction([
      // 基本情報のみを取得
      translationPrisma.translationHistory.findUnique({
        where: { id: historyId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          sourceLang: true,
          targetLang: true,
          model: true,
          creditsUsed: true,
          status: true,
          pageCount: true,
          fileSize: true,
          thumbnailPath: true,
          processingTime: true,
          metadata: true,
          tags: true,
          fileId: true,
          translatedFileKey: true,
        }
      }),
      
      // ファイル、スライド、テキスト情報を取得
      translationPrisma.file.findUnique({
        where: { id: historyExists.fileId },
        select: {
          id: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          createdAt: true,
          Slide: {
            orderBy: { index: 'asc' },
            select: {
              id: true,
              index: true,
              imagePath: true,
              Text: {
                orderBy: { id: 'asc' },
                select: {
                  id: true,
                  text: true,
                  position: true,
                  Translation: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                      id: true,
                      translation: true,
                      model: true,
                      sourceLang: true,
                      targetLang: true,
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    if (!historyBasic || !fileWithSlides) {
      return NextResponse.json({ error: '履歴データの取得に失敗しました' }, { status: 500 });
    }

    // レスポンスデータの構築
    const responseData = {
      ...historyBasic,
      // 関連ファイル情報
      fileDetails: {
        id: fileWithSlides.id,
        originalName: fileWithSlides.originalName,
        fileSize: fileWithSlides.fileSize,
        mimeType: fileWithSlides.mimeType,
        status: fileWithSlides.status,
        createdAt: fileWithSlides.createdAt,
        thumbnailPath: historyBasic.thumbnailPath,
      },
      // 関連スライド情報
      slides: fileWithSlides.Slide.map(slide => ({
        id: slide.id,
        index: slide.index,
        imagePath: slide.imagePath,
        texts: slide.Text.map(text => ({
          id: text.id,
          originalText: text.text, // `text`フィールドはoriginalTextにマッピング
          position: text.position,
          translations: text.Translation.map(translation => ({
            id: translation.id,
            translatedText: translation.translation, // `translation`フィールドはtranslatedTextにマッピング
            model: translation.model,
            sourceLang: translation.sourceLang,
            targetLang: translation.targetLang,
          })),
        })),
      })),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    return NextResponse.json(
      { error: '履歴詳細の取得中に予期せぬエラーが発生しました' },
      { status: 500 }
    );
  }
}
