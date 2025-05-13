import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// リクエストボディのバリデーションスキーマ
const updateCreditsSchema = z.object({
  userId: z.string().uuid(),
  credits: z.number().int().min(0),
});

/**
 * ユーザーのクレジットを更新するAPI（管理者専用）
 */
export async function PUT(request: NextRequest) {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);

    // 未認証の場合はエラー
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();

    // バリデーション
    const validationResult = updateCreditsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, credits } = validationResult.data;

    // 対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: '指定されたユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // クレジットを更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits },
      select: { id: true, name: true, email: true, credits: true },
    });

    // アクティビティログを記録
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        type: 'ADMIN_ACTION',
        description: `ユーザー ${targetUser.email} のクレジットを ${targetUser.credits} から ${credits} に変更しました`,
        metadata: {
          targetUserId: userId,
          previousCredits: targetUser.credits,
          newCredits: credits,
        },
      },
    });

    return NextResponse.json({
      message: 'クレジットが更新されました',
      user: updatedUser,
    });
  } catch (error) {
    console.error('クレジット更新エラー:', error);
    return NextResponse.json(
      { error: 'クレジットの更新に失敗しました' },
      { status: 500 }
    );
  }
}
