import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { PrismaTranslation } from '@/types/prisma';

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
      const { slides, translations, currentSlide } = body;

      const result = await prisma.$transaction(async (tx) => {
        // ユーザーの存在確認
        const user = await tx.user.findUnique({
          where: { email: userEmail },
          select: { id: true }
        });

        if (!user) {
          throw new Error('ユーザーが見つかりません');
        }

        // 翻訳データの保存
        const translation = await tx.translation.create({
          data: {
            slides,
            translations,
            currentSlide,
            userId: user.id
          }
        });

        // アクティビティログの記録
        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: 'translation',
            ipAddress: 'unknown',
            metadata: {
              translationId: translation.id,
              timestamp: new Date().toISOString()
            }
          }
        });

        return translation;
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