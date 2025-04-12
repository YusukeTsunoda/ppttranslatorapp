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

    // 履歴項目の詳細情報と関連ファイル、スライド、テキスト、翻訳情報を一括取得
    const historyItem = await prisma.translationHistory.findUnique({
      where: {
        id: historyId,
        userId: userId, // 取得時にユーザーIDも条件に含める
      },
      include: {
        file: { // fileIdリレーションを使ってFileを取得
          include: {
            Slide: { // Fileに関連するSlideを取得
              orderBy: { index: 'asc' }, // スライド順でソート
              include: {
                Text: { // Slideに関連するTextを取得
                  orderBy: { id: 'asc' }, // テキストIDでソート (またはpositionなど)
                  include: {
                    Translation: { // Textに関連するTranslationを取得
                      orderBy: { createdAt: 'desc' }, // 最新の翻訳を優先
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 履歴が見つからない、または自分のものでない場合
    if (!historyItem) {
      return NextResponse.json({ error: '履歴が見つかりません' }, { status: 404 });
    }

    // レスポンスデータの構築
    const responseData = {
      // 履歴自体の情報 (fileを除外して重複を避ける)
      ...(({ file, ...rest }) => rest)(historyItem),
      // 関連ファイル情報 (もしfileリレーションが存在すれば)
      fileDetails: historyItem.file ? {
        id: historyItem.file.id,
        originalName: historyItem.file.originalName,
        fileSize: historyItem.file.fileSize,
        mimeType: historyItem.file.mimeType,
        status: historyItem.file.status,
        createdAt: historyItem.file.createdAt,
      } : null,
      // 関連スライド情報 (もしfileとSlideリレーションが存在すれば)
      slides: historyItem.file?.Slide.map(slide => ({
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
      })) || [],
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
