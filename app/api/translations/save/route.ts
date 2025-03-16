import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // データベース接続確認
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({ error: 'データベース接続エラー' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // トランザクションを使用して保存処理を実行
    try {
      const body = await request.json();
      const { slides, translations, currentSlide, sourceLang, targetLang } = body;

      const result = await prisma.$transaction(async (tx) => {
        // ユーザーの存在確認
        const user = await tx.user.findUnique({
          where: { email: userEmail },
          select: { id: true }
        });

        if (!user) {
          throw new Error('ユーザーが見つかりません');
        }

        // 翻訳履歴の保存
        const translationHistory = await tx.translationHistory.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            fileName: `スライド_${new Date().toISOString().split('T')[0]}`,
            pageCount: slides?.length > 0 ? slides.length : 1,
            status: '完了',
            creditsUsed: 1,
            sourceLang: sourceLang || 'ja',
            targetLang: targetLang || 'en',
            model: 'claude-3-haiku-20240307',
          }
        });

        // アクティビティログの記録
        await tx.activityLog.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            type: 'translation',
            description: '翻訳を保存しました',
            metadata: {
              translationId: translationHistory.id,
              timestamp: new Date().toISOString()
            }
          }
        });

        return translationHistory;
      });

      return NextResponse.json({ 
        success: true, 
        data: result 
      });
    } catch (txError) {
      console.error('Transaction error:', txError);
      throw txError;
    }
  } catch (error) {
    console.error('Save translation error:', error);
    return NextResponse.json(
      { 
        error: '翻訳の保存に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 