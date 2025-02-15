import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

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
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'ユーザー登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 