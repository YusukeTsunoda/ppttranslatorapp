import { NextRequest, NextResponse } from 'next/server';
import { comparePasswords } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { PrismaUser } from '@/types/prisma';

// Node.jsランタイムを明示的に指定
// bcryptjsを使用するため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // データベース接続確認
    try {
      await prisma.$connect();
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const isValid = await comparePasswords(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // ログイン成功時のアクティビティログを記録
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'sign_in',
        ipAddress: request.ip || 'unknown',
        metadata: {
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 