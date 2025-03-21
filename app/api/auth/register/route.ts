import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';

// Node.jsランタイムを明示的に指定
// bcryptjsを使用するため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
    }

    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザーの作成
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        name,
        password: hashedPassword,
        credits: 15,
        updatedAt: new Date(),
      },
    });

    // アクティビティログの記録
    // ActivityLogモデルが存在しないためコメントアウト
    /*
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
    */

    // 代わりにコンソールにログを出力
    console.log('User registered:', {
      userId: user.id,
      action: 'sign_up',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      email: user.email,
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}
