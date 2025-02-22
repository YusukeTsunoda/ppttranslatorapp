import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Prisma接続確認を追加
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({ error: 'データベース接続エラー' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    console.log('Session data:', session);

    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザー検索前にクエリをログ出力
    console.log('Searching for user with email:', session.user.email);
    
    // ユーザー検索のクエリを詳細に
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    console.log('User search result:', user);

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // ここでリクエストボディをパースしてbody変数を定義
    const body = await request.json();

    try {
      // 保存処理の前にデータ構造を確認
      const saveData = {
        slides: body.slides,
        translations: body.translations,
        currentSlide: body.currentSlide,
        userId: user.id
      };
      console.log('Attempting to save with data:', saveData);

      const savedTranslation = await prisma.translation.create({
        data: saveData
      });
      console.log('Save successful:', savedTranslation);

      return NextResponse.json({ success: true, data: savedTranslation });
    } catch (saveError) {
      console.error('Save operation failed:', saveError);
      throw saveError;
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
  }
} 