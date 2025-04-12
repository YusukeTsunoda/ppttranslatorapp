import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

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

    // 履歴項目の詳細情報を取得
    const historyItem = await prisma.translationHistory.findUnique({
      where: {
        id: historyId,
      },
    });

    // 権限チェック：自分の履歴データのみアクセス可能
    if (!historyItem || historyItem.userId !== userId) {
      return NextResponse.json({ error: '履歴が見つかりません' }, { status: 404 });
    }

    // 関連するファイル情報を取得
    // 注：ここでは仮定として、ファイル名から関連するファイルを検索
    const relatedFile = await prisma.file.findFirst({
      where: {
        userId: userId,
        originalName: historyItem.fileName,
      },
      include: {
        Slide: {
          include: {
            Text: {
              include: {
                Translation: true,
              },
            },
          },
        },
      },
    });

    // レスポンスデータの構築
    const responseData = {
      historyItem,
      fileDetails: relatedFile ? {
        id: relatedFile.id,
        originalName: relatedFile.originalName,
        fileSize: relatedFile.fileSize,
        mimeType: relatedFile.mimeType,
        status: relatedFile.status,
        createdAt: relatedFile.createdAt,
      } : null,
      slides: relatedFile?.Slide.map(slide => ({
        id: slide.id,
        index: slide.index,
        imagePath: slide.imagePath,
        texts: slide.Text.map(text => ({
          id: text.id,
          originalText: text.text,
          position: text.position,
          translations: text.Translation.map(translation => ({
            id: translation.id,
            translatedText: translation.translation,
            model: translation.model,
            sourceLang: translation.sourceLang,
            targetLang: translation.targetLang,
          })),
        })),
      })) || [],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    return NextResponse.json(
      { error: '履歴詳細の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
