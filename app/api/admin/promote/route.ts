import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // セッションチェック
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    const body = await req.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 });
    }
    
    // ユーザーを管理者に昇格
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN }
    });
    
    // アクティビティログを記録
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        type: 'admin',
        description: `ユーザー ${email} を管理者に昇格しました`,
        metadata: {
          targetUserId: updatedUser.id,
          action: 'promote_to_admin'
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `ユーザー ${email} を管理者に昇格しました`
    });
  } catch (error) {
    console.error('管理者昇格エラー:', error);
    return NextResponse.json({ error: '管理者昇格に失敗しました' }, { status: 500 });
  }
} 