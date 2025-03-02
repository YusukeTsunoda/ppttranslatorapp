import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Node.jsランタイムを明示的に指定
// bcryptjsを使用するため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // メールアドレスの重複チェック
    const existingUser = await prisma.users.findUnique({
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
    const user = await prisma.users.create({
      data: {
        id: uuidv4(),
        email,
        name,
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // アクティビティログの記録
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'sign_up',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        metadata: {
          email: user.email
        }
      }
    }).catch((error: Error) => {
      console.error('Error creating activity log:', error);
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