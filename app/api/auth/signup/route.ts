import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'メールアドレスとパスワードと名前は必須です' }, { status: 400 });
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 });
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザーの作成
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: 'user',
      },
    });

    // アクティビティログの記録
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'sign_up',
        ipAddress: 'unknown',
        metadata: {
          email: user.email,
          timestamp: new Date().toISOString()
        }
      }
    }).catch((error) => {
      console.error('Error creating activity log:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'アカウントを作成しました'
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'アカウントの作成に失敗しました' },
      { status: 500 }
    );
  }
} 